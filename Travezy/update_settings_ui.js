const fs = require('fs');

function updateSettingsUI() {
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/settings.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // Add editing state
  code = code.replace(
    /const \[showCurrencyPicker, setShowCurrencyPicker\] = useState\(false\);/,
    'const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);\n  const [editingCurrencyIndex, setEditingCurrencyIndex] = useState<number | null>(null);'
  );

  // Add swap function
  code = code.replace(
    /return \(/,
    `const moveCurrency = (index: number, direction: 'up' | 'down') => {
    const newCurrencies = [...state.settings.selectedCurrencies];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newCurrencies.length) {
      const temp = newCurrencies[index];
      newCurrencies[index] = newCurrencies[targetIndex];
      newCurrencies[targetIndex] = temp;
      updateSettings({ selectedCurrencies: newCurrencies });
    }
  };

  return (`
  );

  // Replace Currency section UI
  const newCurrencySection = `        {/* Currency Section */}
        <Text style={[Typography.label, styles.sectionLabel, { color: colors.textMuted }]}>
          Display Currencies
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {state.settings.selectedCurrencies.map((code, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              onPress={() => {
                setEditingCurrencyIndex(index);
                setShowCurrencyPicker(true);
              }}
              style={[
                styles.row,
                {
                  borderBottomColor: colors.borderLight,
                  borderBottomWidth: index < state.settings.selectedCurrencies.length - 1 ? 1 : 0,
                },
              ]}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.currencyBadge, { backgroundColor: colors.accent + '20' }]}>
                  <Text style={[Typography.bodySemibold, { color: colors.accent }]}>
                    {getCurrencySymbol(code)}
                  </Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={[Typography.bodyMedium, { color: colors.text }]}>{code}</Text>
                  <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                    {getCurrencyName(code)}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flexDirection: 'column', marginRight: 12 }}>
                  <TouchableOpacity 
                    onPress={() => moveCurrency(index, 'up')}
                    disabled={index === 0}
                    style={{ padding: 4, opacity: index === 0 ? 0.3 : 1 }}
                  >
                    <Ionicons name="chevron-up" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => moveCurrency(index, 'down')}
                    disabled={index === state.settings.selectedCurrencies.length - 1}
                    style={{ padding: 4, opacity: index === state.settings.selectedCurrencies.length - 1 ? 0.3 : 1 }}
                  >
                    <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.orderBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[Typography.captionMedium, { color: colors.primary }]}>#{index + 1}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>`;

  // Replace everything from {/* Currency Section */} to the end of the Change Currencies button
  code = code.replace(
    /\{\/\* Currency Section \*\/\}[\s\S]*?<\/TouchableOpacity>/,
    newCurrencySection
  );

  // Update CurrencyPicker props
  code = code.replace(
    /<CurrencyPicker[\s\S]*?\/>/,
    `<CurrencyPicker
        visible={showCurrencyPicker}
        selectedCurrencies={editingCurrencyIndex !== null ? [state.settings.selectedCurrencies[editingCurrencyIndex]] : []}
        maxSelections={1}
        onConfirm={(currencies) => {
          if (editingCurrencyIndex !== null && currencies.length === 1) {
            const newCurrencies = [...state.settings.selectedCurrencies];
            newCurrencies[editingCurrencyIndex] = currencies[0];
            updateSettings({ selectedCurrencies: newCurrencies });
          }
        }}
        onClose={() => {
          setShowCurrencyPicker(false);
          setEditingCurrencyIndex(null);
        }}
        theme={state.settings.theme}
      />`
  );

  fs.writeFileSync(file, code);
}

try {
  updateSettingsUI();
  console.log("Settings UI updated for individual currency selection and ordering");
} catch (e) {
  console.error(e);
  process.exit(1);
}
