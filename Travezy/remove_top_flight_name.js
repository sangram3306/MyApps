const fs = require('fs');

function removeTopFlightName() {
  // add-entry.tsx
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/app/add-entry.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // Remove from top level
  code = code.replace(
    /              <View style={{ marginBottom: 16, paddingHorizontal: 20 }}>\n\s*<Text style=\{\[Typography\.label, \{ color: colors\.textMuted, marginBottom: 8 \}\]\}>Flight Name \/ Airline<\/Text>\n\s*<TextInput\n\s*style=\{\[styles\.input, \{ backgroundColor: colors\.inputBg, borderColor: colors\.inputBorder, color: colors\.text \}\]\}\n\s*placeholder="e\.g\. Indigo 6E 123"\n\s*placeholderTextColor=\{colors\.textMuted\}\n\s*value=\{flightName\}\n\s*onChangeText=\{setFlightName\}\n\s*\/>\n\s*<\/View>/,
    ''
  );

  // Insert into direct flight
  code = code.replace(
    /\{flightType === 'direct' \? \(\n\s*<View style=\{\{ paddingHorizontal: 20 \}\}>/,
    `{flightType === 'direct' ? (
                <View style={{ paddingHorizontal: 20 }}>
                  <View style={{ marginBottom: 16 }}>
                    <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Flight Name / Airline</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                      placeholder="e.g. Indigo 6E 123"
                      placeholderTextColor={colors.textMuted}
                      value={flightName}
                      onChangeText={setFlightName}
                    />
                  </View>`
  );

  fs.writeFileSync(file, code);

  // edit-entry.tsx
  file = '/Users/sangram/Workspaces/MyApps/Travezy/app/edit-entry.tsx';
  code = fs.readFileSync(file, 'utf8');

  // Remove from top level isEditing true
  code = code.replace(
    /                  <View style=\{\{ marginBottom: 16, paddingHorizontal: 20 \}\}>\n\s*<Text style=\{\[Typography\.label, \{ color: colors\.textMuted, marginBottom: 8 \}\]\}>Flight Name \/ Airline<\/Text>\n\s*<TextInput\n\s*style=\{\[styles\.input, \{ backgroundColor: colors\.inputBg, borderColor: colors\.inputBorder, color: colors\.text \}\]\}\n\s*placeholder="e\.g\. Indigo 6E 123"\n\s*placeholderTextColor=\{colors\.textMuted\}\n\s*value=\{flightName\}\n\s*onChangeText=\{setFlightName\}\n\s*\/>\n\s*<\/View>/,
    ''
  );

  // Remove from top level isEditing false
  code = code.replace(
    /                  \{!!flightName && \(\n\s*<View style=\{\{ marginBottom: 16, paddingHorizontal: 20 \}\}>\n\s*<Text style=\{\[Typography\.label, \{ color: colors\.textMuted, marginBottom: 4 \}\]\}>Flight Name \/ Airline<\/Text>\n\s*<Text style=\{\[Typography\.body, \{ color: colors\.text \}\]\}>\{flightName\}<\/Text>\n\s*<\/View>\n\s*\)\}/,
    ''
  );

  // Insert into direct flight
  code = code.replace(
    /\{flightType === 'direct' \? \(\n\s*<View style=\{\{ paddingHorizontal: 20 \}\}>/,
    `{flightType === 'direct' ? (
                <View style={{ paddingHorizontal: 20 }}>
                  {isEditing ? (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Flight Name / Airline</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                        placeholder="e.g. Indigo 6E 123"
                        placeholderTextColor={colors.textMuted}
                        value={flightName}
                        onChangeText={setFlightName}
                      />
                    </View>
                  ) : (
                    !!flightName && (
                      <View style={{ marginBottom: 16 }}>
                        <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 4 }]}>Flight Name / Airline</Text>
                        <Text style={[Typography.body, { color: colors.text }]}>{flightName}</Text>
                      </View>
                    )
                  )}`
  );

  fs.writeFileSync(file, code);
}

try {
  removeTopFlightName();
  console.log("Updated add-entry and edit-entry to remove top level flightName");
} catch (e) {
  console.error(e);
  process.exit(1);
}
