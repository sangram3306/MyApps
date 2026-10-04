const fs = require('fs');

function updateIndex() {
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/index.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // Import ActionSheetIOS and Platform
  code = code.replace(
    /import \{\s*View,\s*Text,\s*StyleSheet,\s*FlatList,\s*Alert,\s*TouchableOpacity,\s*\}\s*from\s*'react-native';/,
    `import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  ActionSheetIOS,
  Platform,
} from 'react-native';`
  );

  // Pull updateTrip
  code = code.replace(
    'const { state, setActiveTrip, deleteTrip } = useApp();',
    'const { state, setActiveTrip, deleteTrip, updateTrip } = useApp();'
  );

  // Update handleTripLongPress
  const newLongPress = `  const handleTripLongPress = (trip: any) => {
    const showDeleteConfirm = () => {
      Alert.alert('Delete Trip', 'This will delete the trip and all its entries. Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTrip(trip.id) },
      ]);
    };

    const showStatusOptions = () => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancel', 'ACTIVE', 'COMPLETED', 'POSTPONED', 'CANCELLED'],
            cancelButtonIndex: 0,
            destructiveButtonIndex: 4,
            title: 'Change Trip Status'
          },
          (idx) => {
            if (idx === 1) updateTrip({ ...trip, status: 'ACTIVE' });
            if (idx === 2) updateTrip({ ...trip, status: 'COMPLETED' });
            if (idx === 3) updateTrip({ ...trip, status: 'POSTPONED' });
            if (idx === 4) updateTrip({ ...trip, status: 'CANCELLED' });
          }
        );
      } else {
        Alert.alert('Change Status', 'Select a new status:', [
          { text: 'ACTIVE / COMPLETED', onPress: () => {
            Alert.alert('Status', 'Select status:', [
              { text: 'ACTIVE', onPress: () => updateTrip({ ...trip, status: 'ACTIVE' }) },
              { text: 'COMPLETED', onPress: () => updateTrip({ ...trip, status: 'COMPLETED' }) },
              { text: 'Cancel', style: 'cancel' }
            ])
          }},
          { text: 'POSTPONED / CANCELLED', onPress: () => {
            Alert.alert('Status', 'Select status:', [
              { text: 'POSTPONED', onPress: () => updateTrip({ ...trip, status: 'POSTPONED' }) },
              { text: 'CANCELLED', onPress: () => updateTrip({ ...trip, status: 'CANCELLED' }) },
              { text: 'Cancel', style: 'cancel' }
            ])
          }},
          { text: 'Cancel', style: 'cancel' }
        ]);
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Change Status', 'Delete'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
          title: trip.name,
          message: 'What would you like to do?'
        },
        (idx) => {
          if (idx === 1) showStatusOptions();
          if (idx === 2) showDeleteConfirm();
        }
      );
    } else {
      Alert.alert(
        trip.name,
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Change Status', onPress: showStatusOptions },
          { text: 'Delete', style: 'destructive', onPress: showDeleteConfirm },
        ]
      );
    }
  };`;

  code = code.replace(
    /const handleTripLongPress = [\s\S]*?const getTripEntryCount =/,
    newLongPress + "\n\n  const getTripEntryCount ="
  );

  // Update caller
  code = code.replace(
    'onLongPress={() => handleTripLongPress(item.id, item.name)}',
    'onLongPress={() => handleTripLongPress(item)}'
  );

  fs.writeFileSync(file, code);
}

try {
  updateIndex();
  console.log("updated index.tsx");
} catch (e) {
  console.error(e);
  process.exit(1);
}
