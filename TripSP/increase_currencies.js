const fs = require('fs');

function increaseCurrencies() {
  // 1. types/index.ts
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/src/types/index.ts';
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(
    /selectedCurrencies: \[string, string, string\];.*?\n/,
    'selectedCurrencies: string[]; // up to 4 currencies\n'
  );
  fs.writeFileSync(file, code);

  // 2. settings.tsx
  file = '/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/settings.tsx';
  code = fs.readFileSync(file, 'utf8');
  code = code.replace(
    /borderBottomWidth: index < 2 \? 1 : 0,/,
    'borderBottomWidth: index < state.settings.selectedCurrencies.length - 1 ? 1 : 0,'
  );
  code = code.replace(
    /maxSelections=\{3\}/,
    'maxSelections={4}'
  );
  code = code.replace(
    /if \(currencies\.length === 3\) \{/,
    'if (currencies.length === 4) {'
  );
  code = code.replace(
    /updateSettings\(\{ selectedCurrencies: currencies as \[string, string, string\] \}\);/,
    'updateSettings({ selectedCurrencies: currencies });'
  );
  fs.writeFileSync(file, code);

  // 3. financials.tsx
  file = '/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/financials.tsx';
  code = fs.readFileSync(file, 'utf8');
  code = code.replace(
    /index === 0 && totalsInCurrencies\.length > 2/,
    'index < totalsInCurrencies.length - 2'
  );
  fs.writeFileSync(file, code);
}

try {
  increaseCurrencies();
  console.log("Updated to support 4 currencies");
} catch (e) {
  console.error(e);
  process.exit(1);
}
