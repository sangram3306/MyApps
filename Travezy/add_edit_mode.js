const fs = require('fs');

function addEditModeToOfflineRatesEditor() {
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/settings.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // Add isEditing state to OfflineRatesEditor
  if (!code.includes('const [isEditing, setIsEditing] = React.useState(false);')) {
    code = code.replace(
      /const \[localRates, setLocalRates\] = React\.useState<Record<string, string>>\(\{\}\);/,
      `const [localRates, setLocalRates] = React.useState<Record<string, string>>({});\n  const [isEditing, setIsEditing] = React.useState(false);`
    );
  }

  // Update handleSave to just save rates (we'll call setIsEditing in onPress)
  
  // Replace the header row
  code = code.replace(
    /<View style=\{\[styles\.row, \{ borderBottomColor: colors\.borderLight, backgroundColor: colors\.primary \+ '10' \}\]\}>\n\s*<View>\n\s*<Text style=\{\[Typography\.bodySemibold, \{ color: colors\.primary \}\]\}>Manual Conversion Rates<\/Text>\n\s*<Text style=\{\[Typography\.caption, \{ color: colors\.primary, opacity: 0\.8, marginTop: 2 \}\]\}>1 \{primaryCurrency\} equals:<\/Text>\n\s*<\/View>\n\s*<TouchableOpacity onPress=\{handleSave\}>\n\s*<Text style=\{\[Typography\.button, \{ color: colors\.primary \}\]\}>Save<\/Text>\n\s*<\/TouchableOpacity>\n\s*<\/View>/,
    `<View style={[styles.row, { borderBottomColor: colors.borderLight, backgroundColor: colors.primary + '10' }]}>
        <View>
          <Text style={[Typography.bodySemibold, { color: colors.primary }]}>Manual Conversion Rates</Text>
          <Text style={[Typography.caption, { color: colors.primary, opacity: 0.8, marginTop: 2 }]}>1 {primaryCurrency} equals:</Text>
        </View>
        {isEditing ? (
          <TouchableOpacity onPress={() => { handleSave(); setIsEditing(false); }}>
            <Text style={[Typography.button, { color: colors.primary }]}>Save</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Ionicons name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>`
  );

  // Replace the row content
  code = code.replace(
    /<View style=\{\{ flexDirection: 'row', alignItems: 'center' \}\}>\n\s*<TextInput[\s\S]*?\/>\n\s*<\/View>/,
    `<View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isEditing ? (
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
            ) : (
              <Text style={[Typography.bodySemibold, { color: colors.text }]}>
                {localRates[code] || ''}
              </Text>
            )}
          </View>`
  );

  fs.writeFileSync(file, code);
}

try {
  addEditModeToOfflineRatesEditor();
  console.log("Edit mode added");
} catch (e) {
  console.error(e);
  process.exit(1);
}
