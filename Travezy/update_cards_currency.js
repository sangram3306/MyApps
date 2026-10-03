const fs = require('fs');
const path = require('path');

const cardsDir = '/Users/sangram/Workspaces/MyApps/Travezy/src/components/cards';
const cards = ['AttractionCard.tsx', 'FlightCard.tsx', 'GenericCard.tsx', 'HotelCard.tsx'];

for (const card of cards) {
  const filePath = path.join(cardsDir, card);
  let code = fs.readFileSync(filePath, 'utf8');

  // Add import for useApp and convertCurrency if not present
  if (!code.includes('useApp')) {
    code = code.replace(
      "import { formatCurrency } from '../../data/exchangeRates';",
      "import { formatCurrency, convertCurrency } from '../../data/exchangeRates';\nimport { useApp } from '../../context/AppContext';"
    );
  }

  // Inject useApp inside the component
  const exportMatch = code.match(/export default function \w+\(\{[\s\S]*?\}\s*:\s*\w+\)\s*\{/);
  if (exportMatch) {
    const startIdx = exportMatch.index + exportMatch[0].length;
    
    // Check if we already injected
    if (!code.substring(startIdx, startIdx + 150).includes('useApp')) {
      const injection = `
  const { state } = useApp();
  const primaryCurrency = state.settings.selectedCurrencies[0];
  const rates = state.exchangeRates.rates;
  const displayPrice = convertCurrency(entry.price, entry.currency, primaryCurrency, rates);
`;
      code = code.substring(0, startIdx) + injection + code.substring(startIdx);
    }
  }

  // Replace {formatCurrency(entry.price, entry.currency)} with {formatCurrency(displayPrice, primaryCurrency)}
  code = code.replace(
    /\{formatCurrency\(entry\.price,\s*entry\.currency\)\}/g,
    '{formatCurrency(displayPrice, primaryCurrency)}'
  );

  fs.writeFileSync(filePath, code);
}
