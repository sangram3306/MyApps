const fs = require('fs');

function fixKeyboardIssue() {
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/settings.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // Add KeyboardAvoidingView and Platform imports
  code = code.replace(
    /TextInput,\n\} from 'react-native';/,
    "TextInput,\n  KeyboardAvoidingView,\n  Platform,\n} from 'react-native';"
  );

  // Wrap ScrollView with KeyboardAvoidingView
  code = code.replace(
    /<ScrollView showsVerticalScrollIndicator=\{false\} contentContainerStyle=\{\{ paddingBottom: 40 \}\}>/,
    `<KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>`
  );

  // Close KeyboardAvoidingView
  code = code.replace(
    /<\/ScrollView>\n\n\s*<CurrencyPicker/,
    `</ScrollView>\n      </KeyboardAvoidingView>\n\n      <CurrencyPicker`
  );

  fs.writeFileSync(file, code);
}

try {
  fixKeyboardIssue();
  console.log("Keyboard avoiding view added to settings");
} catch (e) {
  console.error(e);
  process.exit(1);
}
