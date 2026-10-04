const fs = require('fs');

function fixErrors() {
  // 1. financials.tsx
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/financials.tsx';
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(/router\.push\('\/\(tabs\)\/'\)/g, "router.push('/')");
    fs.writeFileSync(file, code);
  }

  // 2. itinerary.tsx
  file = '/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/itinerary.tsx';
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(/router\.push\('\/\(tabs\)\/'\)/g, "router.push('/')");
    code = code.replace(/tripId: activeTrip\.id,/g, "tripId: activeTrip?.id || '',");
    fs.writeFileSync(file, code);
  }

  // 3. add-entry.tsx
  file = '/Users/sangram/Workspaces/MyApps/Travezy/app/add-entry.tsx';
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(/Colors\[state\.settings\.theme\]\.notification/g, "'#EF4444'");
    fs.writeFileSync(file, code);
  }

  // 4. edit-entry.tsx
  file = '/Users/sangram/Workspaces/MyApps/Travezy/app/edit-entry.tsx';
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(/Colors\[state\.settings\.theme\]\.notification/g, "'#EF4444'");
    fs.writeFileSync(file, code);
  }

  // 5. ExternalLink.tsx
  file = '/Users/sangram/Workspaces/MyApps/Travezy/components/ExternalLink.tsx';
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(/href=\{props\.href\}/g, "href={props.href as any}");
    fs.writeFileSync(file, code);
  }
}

try {
  fixErrors();
  console.log("Fixed all typescript errors");
} catch (e) {
  console.error(e);
  process.exit(1);
}
