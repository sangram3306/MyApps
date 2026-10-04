const fs = require('fs');

function fixSettingsTS() {
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/settings.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // Add TextInput import
  code = code.replace(
    /ScrollView,\n\s*Switch,\n\s*TouchableOpacity,\n\} from 'react-native';/,
    "ScrollView,\n  Switch,\n  TouchableOpacity,\n  TextInput,\n} from 'react-native';"
  );

  // Add types to OfflineRatesEditor
  code = code.replace(
    /function OfflineRatesEditor\(\{ colors, primaryCurrency, secondaryCurrencies, rates, updateRates \}\) \{/,
    `function OfflineRatesEditor({
  colors,
  primaryCurrency,
  secondaryCurrencies,
  rates,
  updateRates,
}: {
  colors: any;
  primaryCurrency: string;
  secondaryCurrencies: string[];
  rates: Record<string, number>;
  updateRates: (r: Record<string, number>) => void;
}) {`
  );

  // Add types to localRates
  code = code.replace(
    /const \[localRates, setLocalRates\] = React\.useState\(\{\}\);/,
    'const [localRates, setLocalRates] = React.useState<Record<string, string>>({});'
  );

  // Add type to initial
  code = code.replace(
    /const initial = \{\};/,
    'const initial: Record<string, string> = {};'
  );

  // Add type to map
  code = code.replace(
    /secondaryCurrencies\.map\(\(code, index\) => \(/,
    'secondaryCurrencies.map((code: string, index: number) => ('
  );

  // Add type to newRates
  code = code.replace(
    /const newRates = \{\};/,
    'const newRates: Record<string, number> = {};'
  );

  fs.writeFileSync(file, code);
}

try {
  fixSettingsTS();
  console.log("TypeScript fixed in settings.tsx");
} catch (e) {
  console.error(e);
  process.exit(1);
}
