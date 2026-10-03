// Entry types for itinerary items
export type EntryType = 'flight' | 'hotel' | 'attraction' | 'food' | 'transport' | 'other';

export type TripStatus = 'ACTIVE' | 'CANCELLED' | 'COMPLETED' | 'POSTPONED';

// Trip model
export interface Trip {
  id: string;
  name: string;
  startDate: string;   // ISO date string YYYY-MM-DD
  endDate: string;     // ISO date string YYYY-MM-DD
  baseCurrency: string; // e.g. "USD"
  createdAt: string;   // ISO datetime
  status?: TripStatus; // default is assumed 'ACTIVE'
}

// Itinerary entry model
export interface ItineraryEntry {
  id: string;
  tripId: string;
  type: EntryType;
  title: string;
  date: string;        // ISO date YYYY-MM-DD — used for timeline ordering
  price: number;
  currency: string;    // currency code of price entered
  notes: string;
  createdAt: string;   // ISO datetime
  flightDetails?: {
    from: string;
    to: string;
    departureTime: string; // ISO datetime
    arrivalTime: string;   // ISO datetime
    flightName?: string;
    flightType?: 'domestic' | 'international';
    departureTerminal?: string;
    arrivalTerminal?: string;
    isConnecting?: boolean;
    connections?: Array<{
      from: string;
      to: string;
      departureTime: string; // ISO datetime
      arrivalTime: string;   // ISO datetime
      flightName?: string;
      departureTerminal?: string;
      arrivalTerminal?: string;
    }>;
  };
  hotelDetails?: {
    name: string;
    address: string;
    city: string;
    checkInTime: string;  // ISO datetime
    checkOutTime: string; // ISO datetime
  };
  attractionDetails?: {
    startTime: string; // ISO datetime
    endTime: string;   // ISO datetime
  };
  transportDetails?: {
    startTime: string; // ISO datetime
    endTime: string;   // ISO datetime
  };
}

// App settings
export interface AppSettings {
  offlineMode: boolean;
  selectedCurrencies: string[]; // up to 4 currencies
  theme: 'light' | 'dark';
  multiScreenItinerary?: boolean;
}

// Currency info for display
export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

// Exchange rates map
export interface ExchangeRates {
  base: string;       // base currency (USD)
  date: string;       // when rates were fetched
  rates: Record<string, number>;
}

// Entry type metadata for UI
export const ENTRY_TYPE_META: Record<EntryType, { label: string; icon: string; color: string }> = {
  flight: { label: 'Flight', icon: 'airplane', color: '#6C63FF' },
  hotel: { label: 'Hotel', icon: 'bed', color: '#FF6B6B' },
  attraction: { label: 'Attraction', icon: 'ticket', color: '#4ECDC4' },
  food: { label: 'Food', icon: 'restaurant', color: '#FFB347' },
  transport: { label: 'Transport', icon: 'car', color: '#45B7D1' },
  other: { label: 'Other', icon: 'ellipsis-horizontal', color: '#95A5A6' },
};

// Packing list item
export interface PackingItem {
  id: string;
  name: string;
  checked: boolean;
}

// Packing list category
export interface PackingCategory {
  id: string;
  tripId: string;
  name: string;
  icon: string;       // Ionicons name
  items: PackingItem[];
}

// Default packing template categories
export const DEFAULT_PACKING_TEMPLATE: Array<{ name: string; icon: string; items: string[] }> = [
  {
    name: 'Travel Documents',
    icon: 'briefcase',
    items: ['Passport & Visa', 'Flight Ticket/Itinerary', 'Hotel Booking Confirmation', 'Insurance Certificate'],
  },
  {
    name: 'Money',
    icon: 'cash',
    items: ['Cash', 'Credit Card', 'Debit Card'],
  },
  {
    name: 'Electronics',
    icon: 'phone-portrait',
    items: ['Phone', 'Laptop', 'Charger', 'Power Bank', 'Travel Adapter', 'Earbuds'],
  },
  {
    name: 'Health & Wellness',
    icon: 'medkit',
    items: ['Band Aids', 'Stomach/Cold Medicine', 'Insect Repellent', 'Face Masks', 'Sunscreen'],
  },
  {
    name: 'Toiletries',
    icon: 'water',
    items: ['Shampoo', 'Conditioner', 'Toothbrush & Toothpaste', 'Towel', 'Shower Gel'],
  },
  {
    name: 'Clothing',
    icon: 'shirt',
    items: ['Changes of Clothing', 'Sleepwear', 'Sun Protective Clothing', 'Hat', 'Slippers', 'Sneakers'],
  },
];

