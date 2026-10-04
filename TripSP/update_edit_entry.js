const fs = require('fs');
let code = fs.readFileSync('/Users/sangram/Workspaces/MyApps/Travezy/app/edit-entry.tsx', 'utf8');

// 1. Add isEditing state
code = code.replace(
  "const [type, setType] = useState<EntryType>((params.type as EntryType) || 'flight');",
  "const [isEditing, setIsEditing] = useState(false);\n  const [type, setType] = useState<EntryType>((params.type as EntryType) || 'flight');"
);

// 2. Change Header
code = code.replace(
  /<Text style={\[Typography.h3, { color: colors.text }\]}>Edit Entry<\/Text>[\s\S]*?<\/View>/,
  `<Text style={[Typography.h3, { color: colors.text }]}>{isEditing ? 'Edit Entry' : 'View Entry'}</Text>
          {isEditing ? (
            <TouchableOpacity onPress={handleSave}>
              <Text style={[Typography.button, { color: colors.primary }]}>Save</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={[Typography.button, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>`
);

// 3. Hide Entry Type Selector
code = code.replace(
  /{\/\* Entry Type Selector \*\/}\s*<View style={styles\.field}>[\s\S]*?<\/View>\s*<\/ScrollView>\s*<\/View>/,
  `{/* Entry Type Selector */}
          {isEditing && (
            <View style={styles.field}>
              <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 10 }]}>
                Type
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.typeRow}>
                  {ENTRY_TYPES.map((t) => {
                    const meta = ENTRY_TYPE_META[t];
                    const isSelected = type === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.typeChip,
                          { backgroundColor: isSelected ? meta.color : colors.primary + '10' },
                        ]}
                        onPress={() => setType(t)}
                      >
                        <Ionicons
                          name={meta.icon as any}
                          size={16}
                          color={isSelected ? '#fff' : colors.primary}
                        />
                        <Text
                          style={[
                            Typography.bodySemibold,
                            { color: isSelected ? '#fff' : colors.primary, marginLeft: 6 },
                          ]}
                        >
                          {meta.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}`
);

// 4. Disable TextInputs
code = code.replace(/<TextInput/g, "<TextInput editable={isEditing}");
code = code.replace(/\{ color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder \}/g, 
  "{ color: colors.text, backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', paddingHorizontal: isEditing ? 16 : 0, paddingVertical: isEditing ? 16 : 0 }"
);

// 5. Disable Date Buttons
code = code.replace(/<TouchableOpacity style={\[styles.dateButton, \{ backgroundColor: colors.inputBg, borderColor: colors.inputBorder \}\]}/g, 
  "<TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', paddingHorizontal: isEditing ? 16 : 0 }]}"
);
code = code.replace(/<TouchableOpacity style={\[styles.dateButton, \{ backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, marginRight: 8 \}\]}/g, 
  "<TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', flex: 1, marginRight: 8, paddingHorizontal: isEditing ? 12 : 0 }]}"
);
code = code.replace(/<TouchableOpacity style={\[styles.dateButton, \{ backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1 \}\]}/g, 
  "<TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', flex: 1, paddingHorizontal: isEditing ? 12 : 0 }]}"
);

// 6. Flight Direct/Connecting toggle
code = code.replace(
  /{\/\* Flight Type Toggle \*\/}\s*<View style={styles\.row}>/,
  `{/* Flight Type Toggle */}
          {isEditing && <View style={styles.row}>`
);
code = code.replace(
  /<\/TouchableOpacity>\s*<\/View>\s*<\/View>\s*<View style={styles\.row}>/,
  `</TouchableOpacity>
              </View>
            </View>}</View>
            <View style={styles.row}>`
);

// 7. Hide "Delete Entry" section if not editing
code = code.replace(
  /{\/\* Danger Zone \*\/}\s*<View style={styles\.dangerZone}>/,
  `{/* Danger Zone */}
          {isEditing && <View style={styles.dangerZone}>`
);
code = code.replace(
  /<Text style={\[Typography\.bodySemibold, \{ color: colors\.error, marginLeft: 8 \}\]}>\s*Delete Entry\s*<\/Text>\s*<\/TouchableOpacity>\s*<\/View>/,
  `<Text style={[Typography.bodySemibold, { color: colors.error, marginLeft: 8 }]}>
                Delete Entry
              </Text>
            </TouchableOpacity>
          </View>}`
);

fs.writeFileSync('/Users/sangram/Workspaces/MyApps/Travezy/app/edit-entry.tsx', code);
console.log('Success');
