const fs = require('fs');

function updateTripsScreen() {
  const file = '/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/index.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // Change getTripTotalCost call in TripCard
  code = code.replace(
    /cost=\{getTripTotalCost\(item\.id, item\.baseCurrency\)\}/g,
    'cost={getTripTotalCost(item.id, state.settings.selectedCurrencies[0])}'
  );

  fs.writeFileSync(file, code);
}

try {
  updateTripsScreen();
  console.log("Trips screen updated");
} catch (e) {
  console.error(e);
  process.exit(1);
}
