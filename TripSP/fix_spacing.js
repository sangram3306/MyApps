const fs = require('fs');

function fixSpacing() {
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/financials.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // Change TOTAL SPEND marginBottom
  code = code.replace(
    /<Text style=\{\[Typography\.label, \{ color: colors\.textMuted, marginBottom: 16, textAlign: 'center' \}\]\}>/,
    `<Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, textAlign: 'center' }]}>`
  );

  // Change Primary Currency View marginBottom
  code = code.replace(
    /<View style=\{\{ alignItems: 'center', marginBottom: 24 \}\}>/,
    `<View style={{ alignItems: 'center', marginBottom: 16 }}>`
  );

  // Also reduce padding of styles.totalCard if necessary. Wait, totalCard is at the bottom of the file.
  // We can just rely on the marginBottom reduction for now, as that removes 8 + 8 = 16 pixels of vertical space.
  // Actually, let's also reduce the padding inside totalCard.
  code = code.replace(
    /padding: 20,\n\s*borderWidth: 1,\n\s*shadowOffset: \{ width: 0, height: 4 \},\n\s*shadowOpacity: 1,\n\s*shadowRadius: 12,\n\s*elevation: 4,\n\s*marginBottom: 16,\n\s*\},\n\s*currencyRow/g,
    `paddingVertical: 16,\n    paddingHorizontal: 20,\n    borderWidth: 1,\n    shadowOffset: { width: 0, height: 4 },\n    shadowOpacity: 1,\n    shadowRadius: 12,\n    elevation: 4,\n    marginBottom: 16,\n  },\n  currencyRow`
  );
  
  // Let's do it with regex to be safer for styles
  const stylesCardRegex = /totalCard:\s*\{[\s\S]*?padding:\s*20,/;
  if (code.match(stylesCardRegex)) {
    code = code.replace(stylesCardRegex, (match) => {
      return match.replace('padding: 20,', 'paddingVertical: 16,\n    paddingHorizontal: 20,');
    });
  }

  // Also reduce paddingVertical in the secondary currency boxes from 12 to 8
  code = code.replace(
    /backgroundColor: colors\.primary \+ '15',\n\s*borderRadius: 12,\n\s*paddingVertical: 12,/,
    `backgroundColor: colors.primary + '15',\n                      borderRadius: 12,\n                      paddingVertical: 8,`
  );

  fs.writeFileSync(file, code);
}

try {
  fixSpacing();
  console.log("Spacing fixed");
} catch (e) {
  console.error(e);
  process.exit(1);
}
