const fs = require('fs');

function updateFinancials() {
  const file = '/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/financials.tsx';
  let code = fs.readFileSync(file, 'utf8');

  code = code.replace(
    /const baseCurrency = activeTrip\.baseCurrency;/,
    'const baseCurrency = state.settings.selectedCurrencies[0];'
  );

  fs.writeFileSync(file, code);
}

try {
  updateFinancials();
  console.log("Financials screen updated");
} catch (e) {
  console.error(e);
  process.exit(1);
}
