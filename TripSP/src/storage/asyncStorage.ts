import * as FileSystem from 'expo-file-system/legacy';
import { Trip, ItineraryEntry, AppSettings, PackingCategory, CustomCategory } from '../types';

// File-based storage using expo-file-system (works in Expo Go)
// Write directly to documentDirectory to avoid directory creation issues

function getFilePath(name: string): string {
  const base = FileSystem.documentDirectory;
  if (!base) {
    console.error("FileSystem.documentDirectory is null");
    return '';
  }
  return `${base}${name}`;
}

const FILE_NAMES = {
  TRIPS: 'trips.json',
  ENTRIES: 'entries.json',
  SETTINGS: 'settings.json',
  ACTIVE_TRIP: 'active_trip.json',
  PACKING: 'packing.json',
  CITY_IMAGES: 'city_images.json',
  ENTRY_IMAGES: 'entry_images.json',
  CUSTOM_CATEGORIES: 'custom_categories.json',
  CITY_DIY_NOTES: 'city_diy_notes.json',
};

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  offlineMode: false,
  selectedCurrencies: ['USD', 'EUR', 'GBP', 'VND'],
  theme: 'dark',
  multiScreenItinerary: false,
  showCardImages: { city: true, hotel: true, attraction: true },
  showDocumentBadge: true,
  showUpNextCard: true,
  realtimeTimeline: true,
  timeFormat: '12h',
  notificationSettings: {
    enabled: true,
    flightReminders: true,
    flightLeadMinutes: 180,
    hotelReminders: true,
    hotelLeadMinutes: 60,
    activityReminders: true,
    activityLeadMinutes: 30,
  },
};

// ─── File Helpers ───────────────────────────────────

async function readJSON<T>(fileName: string, fallback: T): Promise<T> {
  try {
    const filePath = getFilePath(fileName);
    if (!filePath) return fallback;
    const info = await FileSystem.getInfoAsync(filePath);
    if (!info.exists) return fallback;
    const content = await FileSystem.readAsStringAsync(filePath);
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`Error reading ${fileName}:`, error);
    return fallback;
  }
}

async function writeJSON<T>(fileName: string, data: T): Promise<void> {
  try {
    const filePath = getFilePath(fileName);
    if (!filePath) return;
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data));
  } catch (error) {
    console.error(`Error writing ${fileName}:`, error);
    throw error;
  }
}

// ─── Trips ──────────────────────────────────────────

export async function getTrips(): Promise<Trip[]> {
  return readJSON<Trip[]>(FILE_NAMES.TRIPS, []);
}

export async function saveTrips(trips: Trip[]): Promise<void> {
  await writeJSON(FILE_NAMES.TRIPS, trips);
}

export async function addTrip(trip: Trip): Promise<void> {
  const trips = await getTrips();
  trips.push(trip);
  await saveTrips(trips);
}

export async function updateTrip(updatedTrip: Trip): Promise<void> {
  const trips = await getTrips();
  const index = trips.findIndex((t) => t.id === updatedTrip.id);
  if (index >= 0) {
    trips[index] = updatedTrip;
    await saveTrips(trips);
  }
}

export async function deleteTrip(tripId: string): Promise<void> {
  const trips = await getTrips();
  await saveTrips(trips.filter((t) => t.id !== tripId));
  // Also delete entries for this trip
  const entries = await getAllEntries();
  await saveAllEntries(entries.filter((e) => e.tripId !== tripId));
  // Clean up activeTripId if it was the deleted trip
  const activeId = await getActiveTripId();
  if (activeId === tripId) {
    await setActiveTripId(null);
  }
  // Clean up packing categories for this trip
  const packing = await getPackingCategories();
  const filteredPacking = packing.filter((c) => c.tripId !== tripId);
  if (filteredPacking.length !== packing.length) {
    await savePackingCategories(filteredPacking);
  }
}

// ─── Active Trip ────────────────────────────────────

export async function getActiveTripId(): Promise<string | null> {
  return readJSON<string | null>(FILE_NAMES.ACTIVE_TRIP, null);
}

export async function setActiveTripId(tripId: string | null): Promise<void> {
  await writeJSON(FILE_NAMES.ACTIVE_TRIP, tripId);
}

// ─── Entries ────────────────────────────────────────

export async function getAllEntries(): Promise<ItineraryEntry[]> {
  return readJSON<ItineraryEntry[]>(FILE_NAMES.ENTRIES, []);
}

async function saveAllEntries(entries: ItineraryEntry[]): Promise<void> {
  await writeJSON(FILE_NAMES.ENTRIES, entries);
}

export async function getEntriesForTrip(tripId: string): Promise<ItineraryEntry[]> {
  const entries = await getAllEntries();
  return entries
    .filter((e) => e.tripId === tripId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

export async function addEntry(entry: ItineraryEntry): Promise<void> {
  const entries = await getAllEntries();
  entries.push(entry);
  await saveAllEntries(entries);
}

export async function addEntries(newEntries: ItineraryEntry[]): Promise<void> {
  if (!newEntries || newEntries.length === 0) return;
  const entries = await getAllEntries();
  entries.push(...newEntries);
  await saveAllEntries(entries);
}

export async function updateEntry(updatedEntry: ItineraryEntry): Promise<void> {
  const entries = await getAllEntries();
  const index = entries.findIndex((e) => e.id === updatedEntry.id);
  if (index >= 0) {
    entries[index] = updatedEntry;
    await saveAllEntries(entries);
  }
}

export async function deleteEntry(entryId: string): Promise<void> {
  const entries = await getAllEntries();
  await saveAllEntries(entries.filter((e) => e.id !== entryId));
}

// ─── Settings ───────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const stored = await readJSON<AppSettings | null>(FILE_NAMES.SETTINGS, null);
  const settings = stored ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS;
  if (Array.isArray(settings.selectedCurrencies) && settings.selectedCurrencies.length < 4) {
    const candidates = ['USD', 'EUR', 'GBP', 'VND', 'AED', 'SGD', 'THB', 'JPY'];
    const updated = [...settings.selectedCurrencies];
    for (const c of candidates) {
      if (updated.length >= 4) break;
      if (!updated.includes(c)) {
        updated.push(c);
      }
    }
    settings.selectedCurrencies = updated;
    await writeJSON(FILE_NAMES.SETTINGS, settings);
  }
  return settings;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await writeJSON(FILE_NAMES.SETTINGS, settings);
}

// ─── Packing List ───────────────────────────────────

export async function getPackingCategories(): Promise<PackingCategory[]> {
  return readJSON<PackingCategory[]>(FILE_NAMES.PACKING, []);
}

export async function savePackingCategories(categories: PackingCategory[]): Promise<void> {
  await writeJSON(FILE_NAMES.PACKING, categories);
}

// ─── City Images ────────────────────────────────────
// Key format: "tripId::cityName" => uri string

export async function getCityImages(): Promise<Record<string, string>> {
  return readJSON<Record<string, string>>(FILE_NAMES.CITY_IMAGES, {});
}

export async function saveCityImages(images: Record<string, string>): Promise<void> {
  await writeJSON(FILE_NAMES.CITY_IMAGES, images);
}

// ─── Entry Images ───────────────────────────────────
// Key format: "entryId" => uri string

export async function getEntryImages(): Promise<Record<string, string>> {
  return readJSON<Record<string, string>>(FILE_NAMES.ENTRY_IMAGES, {});
}

export async function saveEntryImages(images: Record<string, string>): Promise<void> {
  await writeJSON(FILE_NAMES.ENTRY_IMAGES, images);
}

// ─── Custom Categories ──────────────────────────────

export async function getCustomCategories(): Promise<CustomCategory[]> {
  return readJSON<CustomCategory[]>(FILE_NAMES.CUSTOM_CATEGORIES, []);
}

export async function saveCustomCategories(categories: CustomCategory[]): Promise<void> {
  await writeJSON(FILE_NAMES.CUSTOM_CATEGORIES, categories);
}

// ─── Export & Import ────────────────────────────────

export async function exportAllData(): Promise<string> {
  const trips = await getTrips();
  const entries = await getAllEntries();
  const settings = await getSettings();
  const activeTripId = await getActiveTripId();
  const packing = await getPackingCategories();

  // Read all documents attached to entries and trips, and encode to base64
  const documentFiles: Record<string, string> = {};

  // Trip documents (Vault)
  for (const trip of trips) {
    if (trip.documents) {
      for (const doc of trip.documents) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(doc.uri);
          if (fileInfo.exists) {
            const base64 = await FileSystem.readAsStringAsync(doc.uri, { encoding: FileSystem.EncodingType.Base64 });
            const fileKey = doc.uri.split('/').pop() || doc.name;
            documentFiles[fileKey] = base64;
          }
        } catch (error) {
          console.warn(`Failed to export trip document ${doc.name}`, error);
        }
      }
    }
  }

  // Entry documents
  for (const entry of entries) {
    if (entry.documents) {
      for (const doc of entry.documents) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(doc.uri);
          if (fileInfo.exists) {
            const base64 = await FileSystem.readAsStringAsync(doc.uri, { encoding: FileSystem.EncodingType.Base64 });
            const fileKey = doc.uri.split('/').pop() || doc.name;
            documentFiles[fileKey] = base64;
          }
        } catch (error) {
          console.warn(`Failed to export entry document ${doc.name}`, error);
        }
      }
    }
  }

  // Read city images and encode to base64
  const cityImages = await getCityImages();
  const cityImageFiles: Record<string, string> = {};
  for (const [key, uri] of Object.entries(cityImages)) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        cityImageFiles[key] = base64;
      }
    } catch (error) {
      console.warn(`Failed to export city image ${key}`, error);
    }
  }

  // Read entry images and encode to base64
  const entryImages = await getEntryImages();
  const entryImageFiles: Record<string, string> = {};
  for (const [key, uri] of Object.entries(entryImages)) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        entryImageFiles[key] = base64;
      }
    } catch (error) {
      console.warn(`Failed to export entry image ${key}`, error);
    }
  }

  const customCategories = await getCustomCategories();
  const cityDiyNotes = await readJSON<Record<string, CityDiyData>>(FILE_NAMES.CITY_DIY_NOTES, {});

  const exportObject = {
    trips,
    entries,
    settings,
    activeTripId,
    packing,
    customCategories,
    cityDiyNotes,
    documentFiles,
    cityImageFiles,
    entryImageFiles,
  };

  return JSON.stringify(exportObject);
}

export async function importAllData(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.trips || !data.entries) throw new Error("Invalid backup file");

    if (data.customCategories) await saveCustomCategories(data.customCategories);
    if (data.cityDiyNotes) await writeJSON(FILE_NAMES.CITY_DIY_NOTES, data.cityDiyNotes);
    if (data.settings) {
      if (Array.isArray(data.settings.selectedCurrencies) && data.settings.selectedCurrencies.length < 4) {
        const candidates = ['USD', 'EUR', 'GBP', 'VND', 'AED', 'SGD', 'THB', 'JPY'];
        const updated = [...data.settings.selectedCurrencies];
        for (const c of candidates) {
          if (updated.length >= 4) break;
          if (!updated.includes(c)) {
            updated.push(c);
          }
        }
        data.settings.selectedCurrencies = updated;
      }
      await saveSettings(data.settings);
    }
    if (data.activeTripId !== undefined) await setActiveTripId(data.activeTripId);
    if (data.packing) await savePackingCategories(data.packing);

    // Ensure trip_docs directory exists for trip documents
    const docsDir = `${FileSystem.documentDirectory}trip_docs/`;
    try {
      const dirInfo = await FileSystem.getInfoAsync(docsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(docsDir, { intermediates: true });
      }
    } catch {
      // Ignore directory creation error
    }

    // Write back documents and track restored URIs
    const restoredDocUris: Record<string, string> = {};
    if (data.documentFiles) {
      for (const [fileKey, base64] of Object.entries(data.documentFiles)) {
        try {
          const isTripDoc = fileKey.startsWith('trip_');
          const targetDir = isTripDoc ? docsDir : FileSystem.documentDirectory;
          const targetUri = targetDir + encodeURIComponent(fileKey);
          await FileSystem.writeAsStringAsync(targetUri, base64 as string, { encoding: FileSystem.EncodingType.Base64 });
          restoredDocUris[fileKey] = targetUri;
        } catch (err) {
          console.warn(`Failed to import document ${fileKey}`, err);
        }
      }
    }

    // Map trips documents to restored local URIs
    const restoredTrips = (data.trips as Trip[]).map((t) => ({
      ...t,
      documents: t.documents?.map((d) => {
        const fileKey = d.uri.split('/').pop() || d.name;
        return {
          ...d,
          uri: restoredDocUris[fileKey] || d.uri,
        };
      }),
    }));

    // Map entries documents to restored local URIs
    const restoredEntries = (data.entries as ItineraryEntry[]).map((e) => ({
      ...e,
      documents: e.documents?.map((d) => {
        const fileKey = d.uri.split('/').pop() || d.name;
        return {
          ...d,
          uri: restoredDocUris[fileKey] || d.uri,
        };
      }),
    }));

    await saveTrips(restoredTrips);
    await saveAllEntries(restoredEntries);

    // Write back city images
    if (data.cityImageFiles) {
      const restoredCityImages: Record<string, string> = {};
      for (const [key, base64] of Object.entries(data.cityImageFiles)) {
        try {
          const uri = FileSystem.documentDirectory + `city_img_${encodeURIComponent(key)}.jpg`;
          await FileSystem.writeAsStringAsync(uri, base64 as string, { encoding: FileSystem.EncodingType.Base64 });
          restoredCityImages[key] = uri;
        } catch (err) {
          console.warn(`Failed to import city image ${key}`, err);
        }
      }
      await saveCityImages(restoredCityImages);
    }

    // Write back entry images
    if (data.entryImageFiles) {
      const restoredEntryImages: Record<string, string> = {};
      for (const [key, base64] of Object.entries(data.entryImageFiles)) {
        try {
          const uri = FileSystem.documentDirectory + `entry_img_${encodeURIComponent(key)}.jpg`;
          await FileSystem.writeAsStringAsync(uri, base64 as string, { encoding: FileSystem.EncodingType.Base64 });
          restoredEntryImages[key] = uri;
        } catch (err) {
          console.warn(`Failed to import entry image ${key}`, err);
        }
      }
      await saveEntryImages(restoredEntryImages);
    }

    return true;
  } catch (error) {
    console.error("Error importing data", error);
    return false;
  }
}

export interface CityDiyItem {
  id: string;
  text: string;
  done: boolean;
}

export interface CityDiyData {
  notes: string;
  checklist: CityDiyItem[];
}

export async function getCityDiyData(key: string): Promise<CityDiyData> {
  const map = await readJSON<Record<string, CityDiyData>>(FILE_NAMES.CITY_DIY_NOTES, {});
  return map[key] || { notes: '', checklist: [] };
}

export async function saveCityDiyData(key: string, data: CityDiyData): Promise<void> {
  const map = await readJSON<Record<string, CityDiyData>>(FILE_NAMES.CITY_DIY_NOTES, {});
  map[key] = data;
  await writeJSON(FILE_NAMES.CITY_DIY_NOTES, map);
}
