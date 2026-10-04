const fs = require('fs');

function createEditTrip() {
  const addTripContent = fs.readFileSync('/Users/sangram/Workspaces/MyApps/Travezy/app/add-trip.tsx', 'utf8');

  let editTripContent = addTripContent
    .replace('export default function AddTripScreen() {', "import { useLocalSearchParams } from 'expo-router';\nimport { useEffect } from 'react';\n\nexport default function EditTripScreen() {")
    .replace('const { state, addTrip, setActiveTrip } = useApp();', 'const { state, updateTrip } = useApp();\n  const { id } = useLocalSearchParams();\n  const trip = state.trips.find(t => t.id === id);')
    .replace('const [name, setName] = useState(\'\');', 'const [name, setName] = useState(trip?.name || \'\');')
    .replace('const [startDate, setStartDate] = useState(new Date());', 'const [startDate, setStartDate] = useState(trip ? new Date(trip.startDate) : new Date());')
    .replace('const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));', 'const [endDate, setEndDate] = useState(trip ? new Date(trip.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));')
    .replace('const [baseCurrency, setBaseCurrency] = useState(\'USD\');', 'const [baseCurrency, setBaseCurrency] = useState(trip?.baseCurrency || \'USD\');')
    .replace(/<Text style=\{\[Typography\.h3, \{ color: colors\.text \}\]\}>New Trip<\/Text>/, '<Text style={[Typography.h3, { color: colors.text }]}>Edit Trip</Text>')
    .replace(/const handleSave = async \(\) => \{[\s\S]*?await setActiveTrip\(trip\.id\);\n\s*router\.back\(\);\n\s*\};/, `const handleSave = async () => {
    if (!name.trim() || !trip) return;

    const updatedTrip: Trip = {
      ...trip,
      name: name.trim(),
      startDate: toLocalDateString(startDate),
      endDate: toLocalDateString(endDate),
      baseCurrency,
    };

    await updateTrip(updatedTrip);
    router.back();
  };`)
    .replace(/autoFocus\n/, ''); // Remove autofocus from edit mode so it doesn't pop up keyboard immediately

  fs.writeFileSync('/Users/sangram/Workspaces/MyApps/Travezy/app/edit-trip.tsx', editTripContent);

  // Update trips screen (index.tsx) to add Edit Trip
  let indexContent = fs.readFileSync('/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/index.tsx', 'utf8');

  indexContent = indexContent.replace(
    /options: \['Cancel', 'Change Status', 'Delete'\],/,
    "options: ['Cancel', 'Change Status', 'Edit Trip', 'Delete'],"
  ).replace(
    /destructiveButtonIndex: 2,/,
    "destructiveButtonIndex: 3,"
  ).replace(
    /if \(idx === 1\) showStatusOptions\(\);\n\s*if \(idx === 2\) showDeleteConfirm\(\);/,
    "if (idx === 1) showStatusOptions();\n          if (idx === 2) router.push({ pathname: '/edit-trip', params: { id: trip.id } });\n          if (idx === 3) showDeleteConfirm();"
  ).replace(
    /\{ text: 'Change Status', onPress: showStatusOptions \},\n\s*\{ text: 'Delete', style: 'destructive', onPress: showDeleteConfirm \}/,
    "{ text: 'Change Status', onPress: showStatusOptions },\n          { text: 'Edit Trip', onPress: () => router.push({ pathname: '/edit-trip', params: { id: trip.id } }) },\n          { text: 'Delete', style: 'destructive', onPress: showDeleteConfirm }"
  );

  fs.writeFileSync('/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/index.tsx', indexContent);
}

try {
  createEditTrip();
  console.log("Edit trip screen created and linked in index.tsx");
} catch (e) {
  console.error(e);
  process.exit(1);
}
