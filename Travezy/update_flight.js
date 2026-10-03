const fs = require('fs');

function updateAddEntry() {
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/app/add-entry.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // 1. Add states
  code = code.replace(
    "const [flightFrom, setFlightFrom] = useState('');",
    "const [flightFrom, setFlightFrom] = useState('');\n  const [flightName, setFlightName] = useState('');\n  const [flightCategory, setFlightCategory] = useState<'domestic' | 'international'>('domestic');"
  );

  // 2. Add to flightDetails object
  code = code.replace(
    "          to: flightTo.trim(),",
    "          to: flightTo.trim(),\n          flightName: flightName.trim(),\n          flightType: flightCategory,"
  );

  code = code.replace(
    "          isConnecting: true,",
    "          isConnecting: true,\n          flightName: flightName.trim(),\n          flightType: flightCategory,"
  );

  // 3. Add to UI
  const uiInjection = `
              <View style={{ marginBottom: 16 }}>
                <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Flight Type</Text>
                <View style={{ flexDirection: 'row', backgroundColor: colors.inputBg, borderRadius: 8, padding: 4 }}>
                  <TouchableOpacity 
                    style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: flightCategory === 'domestic' ? colors.primary : 'transparent' }}
                    onPress={() => setFlightCategory('domestic')}
                  >
                    <Text style={[Typography.captionSemibold, { color: flightCategory === 'domestic' ? '#FFF' : colors.text }]}>Domestic</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: flightCategory === 'international' ? colors.primary : 'transparent' }}
                    onPress={() => setFlightCategory('international')}
                  >
                    <Text style={[Typography.captionSemibold, { color: flightCategory === 'international' ? '#FFF' : colors.text }]}>International</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
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
`;

  code = code.replace(
    "              {flightType === 'direct' ? (",
    uiInjection + "\n              {flightType === 'direct' ? ("
  );

  fs.writeFileSync(file, code);
}

function updateEditEntry() {
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/app/edit-entry.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // 1. Add states
  code = code.replace(
    "const [flightFrom, setFlightFrom] = useState(entry.flightDetails?.from || '');",
    "const [flightFrom, setFlightFrom] = useState(entry.flightDetails?.from || '');\n  const [flightName, setFlightName] = useState(entry.flightDetails?.flightName || '');\n  const [flightCategory, setFlightCategory] = useState<'domestic' | 'international'>(entry.flightDetails?.flightType || 'domestic');"
  );

  // 2. Add to flightDetails object
  code = code.replace(
    "          to: flightTo.trim(),",
    "          to: flightTo.trim(),\n          flightName: flightName.trim(),\n          flightType: flightCategory,"
  );

  code = code.replace(
    "          isConnecting: true,",
    "          isConnecting: true,\n          flightName: flightName.trim(),\n          flightType: flightCategory,"
  );

  // 3. Add to UI
  const uiInjection = `
              {isEditing ? (
                <>
                  <View style={{ marginBottom: 16 }}>
                    <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Flight Type</Text>
                    <View style={{ flexDirection: 'row', backgroundColor: colors.inputBg, borderRadius: 8, padding: 4 }}>
                      <TouchableOpacity 
                        style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: flightCategory === 'domestic' ? colors.primary : 'transparent' }}
                        onPress={() => setFlightCategory('domestic')}
                      >
                        <Text style={[Typography.captionSemibold, { color: flightCategory === 'domestic' ? '#FFF' : colors.text }]}>Domestic</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: flightCategory === 'international' ? colors.primary : 'transparent' }}
                        onPress={() => setFlightCategory('international')}
                      >
                        <Text style={[Typography.captionSemibold, { color: flightCategory === 'international' ? '#FFF' : colors.text }]}>International</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
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
                </>
              ) : (
                <>
                  <View style={{ marginBottom: 16 }}>
                    <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 4 }]}>Flight Type</Text>
                    <Text style={[Typography.body, { color: colors.text }]}>{flightCategory === 'international' ? 'International' : 'Domestic'}</Text>
                  </View>
                  {!!flightName && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 4 }]}>Flight Name / Airline</Text>
                      <Text style={[Typography.body, { color: colors.text }]}>{flightName}</Text>
                    </View>
                  )}
                </>
              )}
`;

  code = code.replace(
    "              {flightType === 'direct' ? (",
    uiInjection + "\n              {flightType === 'direct' ? ("
  );

  fs.writeFileSync(file, code);
}

function updateFlightCard() {
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/src/components/cards/FlightCard.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // Destructure the new fields
  code = code.replace(
    "const { from, to, departureTime, arrivalTime, isConnecting, connections } = entry.flightDetails;",
    "const { from, to, departureTime, arrivalTime, isConnecting, connections, flightName, flightType } = entry.flightDetails;"
  );

  // Update header text from "BOARDING PASS"
  const newHeaderText = `
          <Text style={[Typography.captionSemibold, { color: '#FFF', marginLeft: 6, letterSpacing: 1.5, fontSize: 10 }]} numberOfLines={1}>
            {flightType === 'international' ? 'INTERNATIONAL FLIGHT' : 'DOMESTIC FLIGHT'} {flightName ? \`(\${flightName})\` : ''}
          </Text>
`;
  code = code.replace(
    /<Text style=\{\[Typography\.captionSemibold, \{ color: '#FFF', marginLeft: 6, letterSpacing: 1\.5, fontSize: 10 \}\]\}>\s*BOARDING PASS\s*<\/Text>/g,
    newHeaderText
  );

  fs.writeFileSync(file, code);
}

try {
  updateAddEntry();
  updateEditEntry();
  updateFlightCard();
  console.log("Success");
} catch (e) {
  console.error(e);
  process.exit(1);
}
