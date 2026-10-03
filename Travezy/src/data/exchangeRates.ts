import * as FileSystem from 'expo-file-system/legacy';
import { CurrencyInfo, ExchangeRates } from '../types';

// Bundled static exchange rates (relative to USD)
// Last updated: Sep 2024 — used as fallback in offline mode
const BUNDLED_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  AUD: 1.53,
  CAD: 1.36,
  CHF: 0.88,
  CNY: 7.24,
  INR: 83.5,
  MXN: 17.15,
  BRL: 4.97,
  KRW: 1330.0,
  SGD: 1.35,
  HKD: 7.82,
  NOK: 10.65,
  SEK: 10.85,
  DKK: 6.88,
  NZD: 1.66,
  ZAR: 18.75,
  RUB: 96.5,
  TRY: 27.2,
  THB: 35.5,
  AED: 3.67,
  SAR: 3.75,
  PLN: 4.15,
  TWD: 32.1,
  MYR: 4.68,
  PHP: 56.3,
  IDR: 15450.0,
  EGP: 30.9,
  CZK: 22.8,
  HUF: 358.0,
  CLP: 895.0,
  COP: 4050.0,
  ARS: 350.0,
  PKR: 285.0,
  VND: 24350.0,
  QAR: 3.64,
  KWD: 0.31,
  BHD: 0.376,
  OMR: 0.385,
};

// All supported currencies with metadata
export const CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'CLP', name: 'Chilean Peso', symbol: 'CL$' },
  { code: 'COP', name: 'Colombian Peso', symbol: 'CO$' },
  { code: 'ARS', name: 'Argentine Peso', symbol: 'AR$' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR' },
];

const getRatesFile = () => {
  const base = FileSystem.documentDirectory || '';
  return `${base}exchange_rates.json`;
};

/**
 * Get cached or bundled exchange rates
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  try {
    const file = getRatesFile();
    if (!file) return { base: 'USD', date: '2024-09-01', rates: BUNDLED_RATES };
    const info = await FileSystem.getInfoAsync(file);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(file);
      return JSON.parse(content);
    }
  } catch (e) {
    // Fall through to bundled rates
  }
  return {
    base: 'USD',
    date: '2024-09-01',
    rates: BUNDLED_RATES,
  };
}

/**
 * Fetch latest rates from API and cache them.
 * Only called when offline mode is disabled.
 */
export async function saveExchangeRates(rates: ExchangeRates): Promise<void> {
  try {
    const file = getRatesFile();
    if (file) {
      await FileSystem.writeAsStringAsync(file, JSON.stringify(rates));
    }
  } catch (e) {
    console.error('Failed to save exchange rates:', e);
  }
}

export async function fetchAndCacheRates(): Promise<ExchangeRates> {
  try {
    const response = await fetch('https://api.exchangerate.host/latest?base=USD');
    const data = await response.json();
    if (data && data.rates) {
      const rates: ExchangeRates = {
        base: 'USD',
        date: new Date().toISOString().split('T')[0],
        rates: data.rates,
      };
      const file = getRatesFile();
      if (file) {
        await FileSystem.writeAsStringAsync(file, JSON.stringify(rates));
      }
      return rates;
    }
  } catch (e) {
    // Network error — use cached/bundled
  }
  return getExchangeRates();
}

/**
 * Convert amount from one currency to another using provided rates.
 * All rates are relative to USD.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  // Convert to USD first, then to target
  const usdAmount = amount / fromRate;
  return usdAmount * toRate;
}

/**
 * Format a currency amount with symbol
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = CURRENCIES.find((c) => c.code === currencyCode);
  const symbol = currency?.symbol || currencyCode;

  // For currencies with large values, use no decimals
  const noDecimalCurrencies = ['JPY', 'KRW', 'VND', 'IDR', 'CLP', 'COP', 'HUF', 'PKR'];
  const decimals = noDecimalCurrencies.includes(currencyCode) ? 0 : 2;

  const formatted = Math.abs(amount)
    .toFixed(decimals)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `${symbol}${formatted}`;
}
