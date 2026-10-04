import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Trip, ItineraryEntry, AppSettings, ExchangeRates, PackingCategory } from '../types';
import * as Storage from '../storage/asyncStorage';
import { getExchangeRates, fetchAndCacheRates, saveExchangeRates } from '../data/exchangeRates';
import * as Crypto from 'expo-crypto';

// ─── State ──────────────────────────────────────────

interface AppState {
  trips: Trip[];
  activeTripId: string | null;
  entries: ItineraryEntry[];
  packingCategories: PackingCategory[];
  settings: AppSettings;
  exchangeRates: ExchangeRates;
  isLoading: boolean;
}

const initialState: AppState = {
  trips: [],
  activeTripId: null,
  entries: [],
  packingCategories: [],
  settings: {
    offlineMode: false,
    selectedCurrencies: ['USD', 'EUR', 'GBP'],
    theme: 'dark',
    multiScreenItinerary: false,
    showCardImages: { city: true, hotel: true, attraction: true },
    realtimeTimeline: true,
  },
  exchangeRates: {
    base: 'USD',
    date: '2024-09-01',
    rates: {},
  },
  isLoading: true,
};

// ─── Actions ────────────────────────────────────────

type Action =
  | { type: 'LOAD_DATA'; payload: { trips: Trip[]; entries: ItineraryEntry[]; settings: AppSettings; activeTripId: string | null; exchangeRates: ExchangeRates; packingCategories: PackingCategory[] } }
  | { type: 'ADD_TRIP'; payload: Trip }
  | { type: 'UPDATE_TRIP'; payload: Trip }
  | { type: 'DELETE_TRIP'; payload: string }
  | { type: 'SET_ACTIVE_TRIP'; payload: string | null }
  | { type: 'ADD_ENTRY'; payload: ItineraryEntry }
  | { type: 'UPDATE_ENTRY'; payload: ItineraryEntry }
  | { type: 'DELETE_ENTRY'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_EXCHANGE_RATES'; payload: ExchangeRates }
  | { type: 'SET_PACKING_CATEGORIES'; payload: PackingCategory[] };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_DATA':
      return {
        ...state,
        ...action.payload,
        isLoading: false,
      };
    case 'ADD_TRIP':
      return { ...state, trips: [...state.trips, action.payload] };
    case 'UPDATE_TRIP':
      return {
        ...state,
        trips: state.trips.map((t) => (t.id === action.payload.id ? action.payload : t)),
      };
    case 'DELETE_TRIP': {
      const newTrips = state.trips.filter((t) => t.id !== action.payload);
      const newEntries = state.entries.filter((e) => e.tripId !== action.payload);
      const newActiveTripId = state.activeTripId === action.payload ? null : state.activeTripId;
      return { ...state, trips: newTrips, entries: newEntries, activeTripId: newActiveTripId };
    }
    case 'SET_ACTIVE_TRIP':
      return { ...state, activeTripId: action.payload };
    case 'ADD_ENTRY':
      return { ...state, entries: [...state.entries, action.payload] };
    case 'UPDATE_ENTRY':
      return {
        ...state,
        entries: state.entries.map((e) => (e.id === action.payload.id ? action.payload : e)),
      };
    case 'DELETE_ENTRY':
      return {
        ...state,
        entries: state.entries.filter((e) => e.id !== action.payload),
      };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    case 'SET_EXCHANGE_RATES':
      return { ...state, exchangeRates: action.payload };
    case 'SET_PACKING_CATEGORIES':
      return { ...state, packingCategories: action.payload };
    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────

interface AppContextType {
  state: AppState;
  addTrip: (trip: Trip) => Promise<void>;
  updateTrip: (trip: Trip) => Promise<void>;
  duplicateTrip: (tripId: string) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  setActiveTrip: (tripId: string | null) => Promise<void>;
  addEntry: (entry: ItineraryEntry) => Promise<void>;
  updateEntry: (entry: ItineraryEntry) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  updateExchangeRates: (rates: Record<string, number>) => Promise<void>;
  getActiveTrip: () => Trip | undefined;
  getEntriesForActiveTrip: () => ItineraryEntry[];
  savePackingCategories: (categories: PackingCategory[]) => Promise<void>;
  getPackingCategoriesForTrip: (tripId: string) => PackingCategory[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load all data on mount
  useEffect(() => {
    (async () => {
      const [trips, entries, settings, activeTripId, exchangeRates, packingCategories] = await Promise.all([
        Storage.getTrips(),
        Storage.getAllEntries(),
        Storage.getSettings(),
        Storage.getActiveTripId(),
        getExchangeRates(),
        Storage.getPackingCategories(),
      ]);

      dispatch({
        type: 'LOAD_DATA',
        payload: { trips, entries, settings, activeTripId, exchangeRates, packingCategories },
      });

      // Try to fetch latest rates if not in offline mode
      if (!settings.offlineMode) {
        try {
          const latestRates = await fetchAndCacheRates();
          dispatch({ type: 'SET_EXCHANGE_RATES', payload: latestRates });
        } catch {
          // Silently fail — use cached rates
        }
      }
    })();
  }, []);

  const addTrip = async (trip: Trip) => {
    await Storage.addTrip(trip);
    dispatch({ type: 'ADD_TRIP', payload: trip });
  };

  const updateTrip = async (trip: Trip) => {
    await Storage.updateTrip(trip);
    dispatch({ type: 'UPDATE_TRIP', payload: trip });
  };

  const duplicateTrip = async (tripId: string) => {
    const tripToDuplicate = state.trips.find(t => t.id === tripId);
    if (!tripToDuplicate) return;

    const newTripId = Crypto.randomUUID();
    const newTrip: Trip = {
      ...tripToDuplicate,
      id: newTripId,
      name: `Copy of ${tripToDuplicate.name}`,
      createdAt: new Date().toISOString(),
      status: undefined, // Reset status
    };

    const entriesToDuplicate = state.entries.filter(e => e.tripId === tripId);
    
    // Create new entries sequentially (or all together)
    await Storage.addTrip(newTrip);
    dispatch({ type: 'ADD_TRIP', payload: newTrip });

    for (const entry of entriesToDuplicate) {
      const newEntry: ItineraryEntry = {
        ...entry,
        id: Crypto.randomUUID(),
        tripId: newTripId,
        createdAt: new Date().toISOString(),
      };
      await Storage.addEntry(newEntry);
      dispatch({ type: 'ADD_ENTRY', payload: newEntry });
    }
  };

  const deleteTrip = async (tripId: string) => {
    await Storage.deleteTrip(tripId);
    dispatch({ type: 'DELETE_TRIP', payload: tripId });
  };

  const setActiveTrip = async (tripId: string | null) => {
    await Storage.setActiveTripId(tripId);
    dispatch({ type: 'SET_ACTIVE_TRIP', payload: tripId });
  };

  const addEntry = async (entry: ItineraryEntry) => {
    await Storage.addEntry(entry);
    dispatch({ type: 'ADD_ENTRY', payload: entry });
  };

  const updateEntry = async (entry: ItineraryEntry) => {
    await Storage.updateEntry(entry);
    dispatch({ type: 'UPDATE_ENTRY', payload: entry });
  };

  const deleteEntry = async (entryId: string) => {
    await Storage.deleteEntry(entryId);
    dispatch({ type: 'DELETE_ENTRY', payload: entryId });
  };

  const updateSettings = async (settings: Partial<AppSettings>) => {
    const newSettings = { ...state.settings, ...settings };
    await Storage.saveSettings(newSettings);
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  };

  const updateExchangeRates = async (rates: Record<string, number>) => {
    const newExchangeRates = {
      ...state.exchangeRates,
      rates: { ...state.exchangeRates.rates, ...rates },
      date: new Date().toISOString().split('T')[0]
    };
    await saveExchangeRates(newExchangeRates);
    dispatch({ type: 'SET_EXCHANGE_RATES', payload: newExchangeRates });
  };


  const getActiveTrip = () => {
    return state.trips.find((t) => t.id === state.activeTripId);
  };

  const getEntriesForActiveTrip = () => {
    if (!state.activeTripId) return [];
    
    const getEntryStartTime = (entry: ItineraryEntry) => {
      if (entry.type === 'flight' && entry.flightDetails) return new Date(entry.flightDetails.departureTime).getTime();
      if (entry.type === 'hotel' && entry.hotelDetails) return new Date(entry.hotelDetails.checkInTime).getTime();
      const [year, month, day] = entry.date.split('-').map(Number);
      return new Date(year, month - 1, day).getTime();
    };

    return state.entries
      .filter((e) => e.tripId === state.activeTripId)
      .sort((a, b) => getEntryStartTime(a) - getEntryStartTime(b) || a.createdAt.localeCompare(b.createdAt));
  };

  const savePackingCategoriesFn = async (categories: PackingCategory[]) => {
    await Storage.savePackingCategories(categories);
    dispatch({ type: 'SET_PACKING_CATEGORIES', payload: categories });
  };

  const getPackingCategoriesForTrip = (tripId: string) => {
    return state.packingCategories.filter((c) => c.tripId === tripId);
  };

  return (
    <AppContext.Provider
      value={{
        state,
        addTrip,
        updateTrip,
        duplicateTrip,
        deleteTrip,
        setActiveTrip,
        addEntry,
        updateEntry,
        deleteEntry,
        updateSettings,
        updateExchangeRates,
        getActiveTrip,
        getEntriesForActiveTrip,
        savePackingCategories: savePackingCategoriesFn,
        getPackingCategoriesForTrip,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
