const fs = require('fs');

function fixCurrencyPicker() {
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/src/components/CurrencyPicker.tsx';
  let code = fs.readFileSync(file, 'utf8');
  
  code = code.replace(
    /const toggleCurrency = \(code: string\) => \{[\s\S]*?\n  \};/,
    `const toggleCurrency = (code: string) => {
    if (selected.includes(code)) {
      // Don't allow unselecting if maxSelections is 1 and it's the only one
      if (maxSelections === 1 && selected.length === 1) return;
      setSelected(selected.filter((c) => c !== code));
    } else {
      if (maxSelections === 1) {
        setSelected([code]);
      } else if (selected.length < maxSelections) {
        setSelected([...selected, code]);
      }
    }
  };`
  );
  fs.writeFileSync(file, code);
}

try {
  fixCurrencyPicker();
  console.log("CurrencyPicker updated");
} catch (e) {
  console.error(e);
  process.exit(1);
}
