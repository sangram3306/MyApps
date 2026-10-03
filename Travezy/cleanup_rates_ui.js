const fs = require('fs');

function cleanupRatesUI() {
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/settings.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // Replace header
  code = code.replace(
    /<Text style=\{\[Typography\.bodySemibold, \{ color: colors\.primary \}\]\}>Manual Conversion Rates<\/Text>/,
    `<View>
          <Text style={[Typography.bodySemibold, { color: colors.primary }]}>Manual Conversion Rates</Text>
          <Text style={[Typography.caption, { color: colors.primary, opacity: 0.8, marginTop: 2 }]}>1 {primaryCurrency} equals:</Text>
        </View>`
  );

  // Replace row
  code = code.replace(
    /<Text style=\{\[Typography\.bodyMedium, \{ color: colors\.text \}\]\}>1 \{primaryCurrency\} =<\/Text>\n\s*<View style=\{\{ flexDirection: 'row', alignItems: 'center' \}\}>\n\s*<TextInput[\s\S]*?\/>\n\s*<Text style=\{\[Typography\.bodySemibold, \{ color: colors\.text, width: 40 \}\]\}>\{code\}<\/Text>\n\s*<\/View>/,
    `<Text style={[Typography.bodyMedium, { color: colors.text }]}>{code}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={{
                backgroundColor: colors.inputBg,
                color: colors.text,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                width: 120,
                textAlign: 'right',
              }}
              keyboardType="decimal-pad"
              value={localRates[code] || ''}
              onChangeText={(val) => setLocalRates(prev => ({ ...prev, [code]: val }))}
            />
          </View>`
  );

  fs.writeFileSync(file, code);
}

try {
  cleanupRatesUI();
  console.log("Cleanup done");
} catch (e) {
  console.error(e);
  process.exit(1);
}
