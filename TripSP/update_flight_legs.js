const fs = require('fs');

function updateAddEntry() {
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/app/add-entry.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // 1. Add top-level terminals
  code = code.replace(
    /const \[flightTo, setFlightTo\] = useState\(''\);/,
    `const [flightTo, setFlightTo] = useState('');\n  const [departureTerminal, setDepartureTerminal] = useState('');\n  const [arrivalTerminal, setArrivalTerminal] = useState('');`
  );

  // 2. Update connections initial state
  code = code.replace(
    /const \[connections, setConnections\] = useState<Array<\{[\s\S]*?\}>>\(\[[\s\S]*?\]\);/,
    `const [connections, setConnections] = useState<Array<{
    from: string;
    to: string;
    departureTime: Date;
    arrivalTime: Date;
    flightName: string;
    departureTerminal: string;
    arrivalTerminal: string;
  }>>([
    { from: '', to: '', departureTime: new Date(), arrivalTime: new Date(), flightName: '', departureTerminal: '', arrivalTerminal: '' },
    { from: '', to: '', departureTime: new Date(), arrivalTime: new Date(), flightName: '', departureTerminal: '', arrivalTerminal: '' },
  ]);`
  );

  // 3. Update addConnection
  code = code.replace(
    /setConnections\(\[\.\.\.connections, \{ from: '', to: '', departureTime: new Date\(\), arrivalTime: new Date\(\) \}\]\);/,
    `setConnections([...connections, { from: '', to: '', departureTime: new Date(), arrivalTime: new Date(), flightName: '', departureTerminal: '', arrivalTerminal: '' }]);`
  );

  // 4. Update Save payload
  code = code.replace(
    /flightType: flightCategory,\n\s*departureTime: departureDateTime\.toISOString\(\),\n\s*arrivalTime: arrivalDateTime\.toISOString\(\),\n\s*isConnecting: false,/,
    `flightType: flightCategory,\n          departureTerminal: departureTerminal.trim(),\n          arrivalTerminal: arrivalTerminal.trim(),\n          departureTime: departureDateTime.toISOString(),\n          arrivalTime: arrivalDateTime.toISOString(),\n          isConnecting: false,`
  );
  code = code.replace(
    /connections: connections\.map\(c => \(\{[\s\S]*?\}\)\)/,
    `connections: connections.map(c => ({
            from: c.from.trim(),
            to: c.to.trim(),
            departureTime: c.departureTime.toISOString(),
            arrivalTime: c.arrivalTime.toISOString(),
            flightName: c.flightName.trim(),
            departureTerminal: c.departureTerminal.trim(),
            arrivalTerminal: c.arrivalTerminal.trim(),
          }))`
  );

  // 5. Update UI for direct flight
  const directTerminalUI = `
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Dep. Terminal</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder }]}
                      placeholder="e.g. T1"
                      placeholderTextColor={colors.textMuted}
                      value={departureTerminal}
                      onChangeText={setDepartureTerminal}
                    />
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Arr. Terminal</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder }]}
                      placeholder="e.g. T2"
                      placeholderTextColor={colors.textMuted}
                      value={arrivalTerminal}
                      onChangeText={setArrivalTerminal}
                    />
                  </View>
                </View>`;
  code = code.replace(
    /(\{\/\* ARRIVAL \*\/\}[\s\S]*?<\/View>\s*<\/View>\s*<\/View>)/,
    `$1${directTerminalUI}`
  );

  // 6. Update UI for connecting flight
  const connectingExtraUI = `
                    <View style={styles.field}>
                      <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, fontSize: 10 }]}>FLIGHT NAME / AIRLINE</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.inputBorder }]}
                        placeholder="e.g. Indigo"
                        placeholderTextColor={colors.textMuted}
                        value={conn.flightName}
                        onChangeText={(t) => updateConnection(index, 'flightName', t)}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, fontSize: 10 }]}>DEP. TERMINAL</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.inputBorder }]}
                          placeholder="e.g. T1"
                          placeholderTextColor={colors.textMuted}
                          value={conn.departureTerminal}
                          onChangeText={(t) => updateConnection(index, 'departureTerminal', t)}
                        />
                      </View>
                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, fontSize: 10 }]}>ARR. TERMINAL</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.inputBorder }]}
                          placeholder="e.g. T2"
                          placeholderTextColor={colors.textMuted}
                          value={conn.arrivalTerminal}
                          onChangeText={(t) => updateConnection(index, 'arrivalTerminal', t)}
                        />
                      </View>
                    </View>`;

  // find the block where ARRIVAL (DATE & TIME) ends for connecting flight
  // It ends with:
  //                 </View>
  //               </View>
  //             </View>
  //           ))}
  code = code.replace(
    /(<Text style=\{\[Typography\.label, \{ color: colors\.textMuted, marginBottom: 8, fontSize: 10 \}\]\}>ARRIVAL \(DATE & TIME\)<\/Text>[\s\S]*?<\/View>\s*<\/View>)/,
    `$1${connectingExtraUI}`
  );

  fs.writeFileSync(file, code);
}

function updateEditEntry() {
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/app/edit-entry.tsx';
  let code = fs.readFileSync(file, 'utf8');

  code = code.replace(
    /const \[flightTo, setFlightTo\] = useState\(''\);/,
    `const [flightTo, setFlightTo] = useState('');\n  const [departureTerminal, setDepartureTerminal] = useState('');\n  const [arrivalTerminal, setArrivalTerminal] = useState('');`
  );

  code = code.replace(
    /const \[connections, setConnections\] = useState<Array<\{[\s\S]*?\}>>\(\[\]\);/,
    `const [connections, setConnections] = useState<Array<{
    from: string;
    to: string;
    departureTime: Date;
    arrivalTime: Date;
    flightName: string;
    departureTerminal: string;
    arrivalTerminal: string;
  }>>([]);`
  );

  code = code.replace(
    /setConnections\(\[\.\.\.connections, \{ from: '', to: '', departureTime: new Date\(\), arrivalTime: new Date\(\) \}\]\);/,
    `setConnections([...connections, { from: '', to: '', departureTime: new Date(), arrivalTime: new Date(), flightName: '', departureTerminal: '', arrivalTerminal: '' }]);`
  );

  // Load existing data
  code = code.replace(
    /setFlightName\(f\.flightName \|\| ''\);/,
    `setFlightName(f.flightName || '');
        setDepartureTerminal(f.departureTerminal || '');
        setArrivalTerminal(f.arrivalTerminal || '');`
  );

  code = code.replace(
    /setConnections\(f\.connections\.map\(\(c: any\) => \(\{[\s\S]*?\}\)\)\);/,
    `setConnections(f.connections.map((c: any) => ({
            from: c.from,
            to: c.to,
            departureTime: new Date(c.departureTime),
            arrivalTime: new Date(c.arrivalTime),
            flightName: c.flightName || '',
            departureTerminal: c.departureTerminal || '',
            arrivalTerminal: c.arrivalTerminal || ''
          })));`
  );

  // Update save
  code = code.replace(
    /flightType: flightCategory,\n\s*departureTime: departureDateTime\.toISOString\(\),\n\s*arrivalTime: arrivalDateTime\.toISOString\(\),\n\s*isConnecting: false,/,
    `flightType: flightCategory,\n          departureTerminal: departureTerminal.trim(),\n          arrivalTerminal: arrivalTerminal.trim(),\n          departureTime: departureDateTime.toISOString(),\n          arrivalTime: arrivalDateTime.toISOString(),\n          isConnecting: false,`
  );
  code = code.replace(
    /connections: connections\.map\(\(c\) => \(\{[\s\S]*?\}\)\)/,
    `connections: connections.map((c) => ({
            from: c.from.trim(),
            to: c.to.trim(),
            departureTime: c.departureTime.toISOString(),
            arrivalTime: c.arrivalTime.toISOString(),
            flightName: c.flightName.trim(),
            departureTerminal: c.departureTerminal.trim(),
            arrivalTerminal: c.arrivalTerminal.trim(),
          }))`
  );

  const directTerminalUI = `
                {isEditing ? (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Dep. Terminal</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder }]}
                        placeholder="e.g. T1"
                        placeholderTextColor={colors.textMuted}
                        value={departureTerminal}
                        onChangeText={setDepartureTerminal}
                      />
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Arr. Terminal</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder }]}
                        placeholder="e.g. T2"
                        placeholderTextColor={colors.textMuted}
                        value={arrivalTerminal}
                        onChangeText={setArrivalTerminal}
                      />
                    </View>
                  </View>
                ) : (
                  (departureTerminal || arrivalTerminal) && (
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, paddingHorizontal: 20 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 4 }]}>Dep. Terminal</Text>
                        <Text style={[Typography.body, { color: colors.text }]}>{departureTerminal || '-'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 4 }]}>Arr. Terminal</Text>
                        <Text style={[Typography.body, { color: colors.text }]}>{arrivalTerminal || '-'}</Text>
                      </View>
                    </View>
                  )
                )}`;
  code = code.replace(
    /(\{\/\* ARRIVAL \*\/\}[\s\S]*?<\/View>\s*<\/View>\s*<\/View>\s*\)\s*:\s*\([\s\S]*?<\/View>\s*<\/View>\s*\)\s*\})/,
    `$1\n${directTerminalUI}`
  );

  const connectingExtraUI = `
                    {isEditing ? (
                      <>
                        <View style={styles.field}>
                          <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, fontSize: 10 }]}>FLIGHT NAME / AIRLINE</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.inputBorder }]}
                            placeholder="e.g. Indigo"
                            placeholderTextColor={colors.textMuted}
                            value={conn.flightName}
                            onChangeText={(t) => updateConnection(index, 'flightName', t)}
                          />
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <View style={[styles.field, { flex: 1 }]}>
                            <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, fontSize: 10 }]}>DEP. TERMINAL</Text>
                            <TextInput
                              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.inputBorder }]}
                              placeholder="e.g. T1"
                              placeholderTextColor={colors.textMuted}
                              value={conn.departureTerminal}
                              onChangeText={(t) => updateConnection(index, 'departureTerminal', t)}
                            />
                          </View>
                          <View style={[styles.field, { flex: 1 }]}>
                            <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, fontSize: 10 }]}>ARR. TERMINAL</Text>
                            <TextInput
                              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.inputBorder }]}
                              placeholder="e.g. T2"
                              placeholderTextColor={colors.textMuted}
                              value={conn.arrivalTerminal}
                              onChangeText={(t) => updateConnection(index, 'arrivalTerminal', t)}
                            />
                          </View>
                        </View>
                      </>
                    ) : (
                      <>
                        {conn.flightName ? (
                          <View style={{ marginBottom: 16 }}>
                            <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 4, fontSize: 10 }]}>FLIGHT NAME / AIRLINE</Text>
                            <Text style={[Typography.body, { color: colors.text }]}>{conn.flightName}</Text>
                          </View>
                        ) : null}
                        {(conn.departureTerminal || conn.arrivalTerminal) ? (
                          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 4, fontSize: 10 }]}>DEP. TERMINAL</Text>
                              <Text style={[Typography.body, { color: colors.text }]}>{conn.departureTerminal || '-'}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 4, fontSize: 10 }]}>ARR. TERMINAL</Text>
                              <Text style={[Typography.body, { color: colors.text }]}>{conn.arrivalTerminal || '-'}</Text>
                            </View>
                          </View>
                        ) : null}
                      </>
                    )}`;

  // Here we inject `connectingExtraUI` right after the Arrival block ends inside `connections.map`
  code = code.replace(
    /(<Text style=\{\[Typography\.label, \{ color: colors\.textMuted, marginBottom: (?:4|8), fontSize: 10 \}\]\}>ARRIVAL \(DATE & TIME\)<\/Text>[\s\S]*?<\/View>\s*<\/View>\s*\)\s*\})/,
    `$1\n${connectingExtraUI}`
  );

  fs.writeFileSync(file, code);
}

try {
  updateAddEntry();
  console.log("updated add-entry");
  updateEditEntry();
  console.log("updated edit-entry");
} catch (e) {
  console.error(e);
  process.exit(1);
}
