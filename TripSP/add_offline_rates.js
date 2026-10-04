const fs = require('fs');

function addOfflineRatesEditor() {
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/settings.tsx';
  let code = fs.readFileSync(file, 'utf8');

  if (code.includes('OfflineRatesEditor')) return;

  // Add TextInput import if not there
  if (!code.includes('TextInput')) {
    code = code.replace(
      /import \{ View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView \} from 'react-native';/,
      "import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, TextInput } from 'react-native';"
    );
  }

  // Inject OfflineRatesEditor component
  const offlineRatesComponent = `
function OfflineRatesEditor({ colors, primaryCurrency, secondaryCurrencies, rates, updateRates }) {
  const [localRates, setLocalRates] = React.useState({});

  React.useEffect(() => {
    const primaryRate = rates[primaryCurrency] || 1;
    const initial = {};
    secondaryCurrencies.forEach(c => {
      const cRate = rates[c] || 1;
      initial[c] = (cRate / primaryRate).toFixed(4);
    });
    setLocalRates(initial);
  }, [primaryCurrency, secondaryCurrencies, rates]);

  const handleSave = () => {
    const primaryRate = rates[primaryCurrency] || 1;
    const newRates = {};
    Object.keys(localRates).forEach(c => {
      const val = parseFloat(localRates[c]);
      if (!isNaN(val)) {
        newRates[c] = primaryRate * val;
      }
    });
    updateRates(newRates);
  };

  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
      <View style={[styles.row, { borderBottomColor: colors.borderLight, backgroundColor: colors.primary + '10' }]}>
        <Text style={[Typography.bodySemibold, { color: colors.primary }]}>Manual Conversion Rates</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={[Typography.button, { color: colors.primary }]}>Save</Text>
        </TouchableOpacity>
      </View>
      {secondaryCurrencies.map((code, index) => (
        <View key={code} style={[styles.row, { borderBottomWidth: index < secondaryCurrencies.length - 1 ? 1 : 0, borderBottomColor: colors.borderLight }]}>
          <Text style={[Typography.bodyMedium, { color: colors.text }]}>1 {primaryCurrency} =</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={{
                backgroundColor: colors.inputBg,
                color: colors.text,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                width: 100,
                textAlign: 'right',
                marginRight: 8
              }}
              keyboardType="decimal-pad"
              value={localRates[code] || ''}
              onChangeText={(val) => setLocalRates(prev => ({ ...prev, [code]: val }))}
            />
            <Text style={[Typography.bodySemibold, { color: colors.text, width: 40 }]}>{code}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
`;

  // Insert before export default function SettingsScreen
  code = code.replace(
    /export default function SettingsScreen\(\) \{/,
    offlineRatesComponent + '\nexport default function SettingsScreen() {'
  );

  // Use it inside SettingsScreen
  const ratesEditorUsage = `
        {/* Manual Rates Editor (Offline Mode) */}
        {state.settings.offlineMode && state.settings.selectedCurrencies.length > 1 && (
          <OfflineRatesEditor
            colors={colors}
            primaryCurrency={state.settings.selectedCurrencies[0]}
            secondaryCurrencies={state.settings.selectedCurrencies.slice(1)}
            rates={state.exchangeRates.rates}
            updateRates={updateExchangeRates}
          />
        )}
  `;

  // Insert below rateInfoCard
  code = code.replace(
    /<\/View>\n\s*<\/View>\n\s*<\/ScrollView>/,
    `</View>\n        </View>\n${ratesEditorUsage}\n      </ScrollView>`
  );

  // Need updateExchangeRates from useApp
  code = code.replace(
    /const \{ state, updateSettings \} = useApp\(\);/,
    'const { state, updateSettings, updateExchangeRates } = useApp();'
  );

  fs.writeFileSync(file, code);
}

try {
  addOfflineRatesEditor();
  console.log("OfflineRatesEditor added to settings");
} catch (e) {
  console.error(e);
  process.exit(1);
}
