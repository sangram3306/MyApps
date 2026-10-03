const fs = require('fs');

function updateExchangeRatesLogic() {
  // 1. data/exchangeRates.ts
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/src/data/exchangeRates.ts';
  let code = fs.readFileSync(file, 'utf8');

  // Check if saveExchangeRates already exists
  if (!code.includes('export async function saveExchangeRates')) {
    code = code.replace(
      /export async function fetchAndCacheRates\(\)/,
      `export async function saveExchangeRates(rates: ExchangeRates): Promise<void> {
  try {
    const file = getRatesFile();
    if (file) {
      await FileSystem.writeAsStringAsync(file, JSON.stringify(rates));
    }
  } catch (e) {
    console.error('Failed to save exchange rates:', e);
  }
}

export async function fetchAndCacheRates()`
    );
    fs.writeFileSync(file, code);
  }

  // 2. context/AppContext.tsx
  file = '/Users/sangram/Workspaces/MyApps/Travezy/src/context/AppContext.tsx';
  code = fs.readFileSync(file, 'utf8');

  if (!code.includes('saveExchangeRates')) {
    code = code.replace(
      "import { getExchangeRates, fetchAndCacheRates } from '../data/exchangeRates';",
      "import { getExchangeRates, fetchAndCacheRates, saveExchangeRates } from '../data/exchangeRates';"
    );
    
    code = code.replace(
      /updateSettings: \(settings: Partial<AppSettings>\) => Promise<void>;/,
      'updateSettings: (settings: Partial<AppSettings>) => Promise<void>;\n  updateExchangeRates: (rates: Record<string, number>) => Promise<void>;'
    );
    
    code = code.replace(
      /const updateSettings = async[\s\S]*?};/,
      `const updateSettings = async (settings: Partial<AppSettings>) => {
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
  };`
    );

    code = code.replace(
      /updateSettings,\n\s*getActiveTrip,/,
      'updateSettings,\n        updateExchangeRates,\n        getActiveTrip,'
    );
    
    fs.writeFileSync(file, code);
  }
}

try {
  updateExchangeRatesLogic();
  console.log("AppContext and exchangeRates updated");
} catch (e) {
  console.error(e);
  process.exit(1);
}
