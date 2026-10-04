import * as FileSystem from 'expo-file-system/legacy';
import { Trip, ItineraryEntry, AppSettings, PackingCategory } from '../types';

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
};

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  offlineMode: false,
  selectedCurrencies: ['USD', 'EUR', 'GBP'],
  theme: 'dark',
  multiScreenItinerary: false,
  showCardImages: { city: true, hotel: true, attraction: true },
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
  return stored ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS;
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

// ─── Export & Import ────────────────────────────────

export async function exportAllData(): Promise<string> {
  const trips = await getTrips();
  const entries = await getAllEntries();
  const settings = await getSettings();
  const activeTripId = await getActiveTripId();
  const packing = await getPackingCategories();

  // Read all documents attached to entries and encode to base64
  const documentFiles: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.documents) {
      for (const doc of entry.documents) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(doc.uri);
          if (fileInfo.exists) {
            const base64 = await FileSystem.readAsStringAsync(doc.uri, { encoding: FileSystem.EncodingType.Base64 });
            documentFiles[doc.name] = base64;
          }
        } catch (error) {
          console.warn(`Failed to export document ${doc.name}`, error);
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

  const exportObject = {
    trips,
    entries,
    settings,
    activeTripId,
    packing,
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

    await saveTrips(data.trips);
    await saveAllEntries(data.entries);
    if (data.settings) await saveSettings(data.settings);
    if (data.activeTripId !== undefined) await setActiveTripId(data.activeTripId);
    if (data.packing) await savePackingCategories(data.packing);

    // Write back documents
    if (data.documentFiles) {
      for (const [name, base64] of Object.entries(data.documentFiles)) {
        try {
          const uri = FileSystem.documentDirectory + encodeURIComponent(name);
          await FileSystem.writeAsStringAsync(uri, base64 as string, { encoding: FileSystem.EncodingType.Base64 });
        } catch (err) {
          console.warn(`Failed to import document ${name}`, err);
        }
      }
    }

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
