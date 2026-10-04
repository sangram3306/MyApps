const fs = require('fs');

function boxCurrencies() {
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/financials.tsx';
  let code = fs.readFileSync(file, 'utf8');

  const oldCode = `{totalsInCurrencies.length > 1 && (
            <View style={styles.currencyRow}>
              {totalsInCurrencies.slice(1).map((item, index) => (
                <View
                  key={item.currency}
                  style={[
                    styles.currencyBlock,
                    index < totalsInCurrencies.length - 2 && {
                      borderRightWidth: 1,
                      borderRightColor: colors.borderLight,
                    },
                  ]}
                >
                  <Text style={[Typography.display, { color: colors.text, fontSize: 20 }]}>
                    {formatCurrency(item.amount, item.currency)}
                  </Text>
                  <Text style={[Typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                    {item.currency}
                  </Text>
                </View>
              ))}
            </View>
          )}`;

  const newCode = `{totalsInCurrencies.length > 1 && (
            <View style={[styles.currencyRow, { gap: 8 }]}>
              {totalsInCurrencies.slice(1).map((item) => (
                <View
                  key={item.currency}
                  style={[
                    styles.currencyBlock,
                    {
                      backgroundColor: colors.primary + '15',
                      borderRadius: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 4,
                      borderWidth: 1,
                      borderColor: colors.borderLight,
                    },
                  ]}
                >
                  <Text 
                    style={[Typography.display, { color: colors.text, fontSize: 16 }]} 
                    numberOfLines={1} 
                    adjustsFontSizeToFit
                  >
                    {formatCurrency(item.amount, item.currency)}
                  </Text>
                  <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                    {item.currency}
                  </Text>
                </View>
              ))}
            </View>
          )}`;

  if (code.includes('styles.currencyRow')) {
    code = code.replace(oldCode, newCode);
    fs.writeFileSync(file, code);
  }
}

try {
  boxCurrencies();
  console.log("Currency boxes applied");
} catch (e) {
  console.error(e);
  process.exit(1);
}
