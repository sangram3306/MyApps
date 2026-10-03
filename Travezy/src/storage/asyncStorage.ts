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
};

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  offlineMode: false,
  selectedCurrencies: ['USD', 'EUR', 'GBP'],
  theme: 'dark',
  multiScreenItinerary: false,
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
