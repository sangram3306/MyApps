const fs = require('fs');

function updateIndex() {
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/index.tsx';
  let code = fs.readFileSync(file, 'utf8');

  const getTripStats = `  const getTripStats = (tripId: string) => {
    const entries = state.entries.filter((e) => e.tripId === tripId);
    let intlFlights = 0;
    let domFlights = 0;
    let hotels = 0;
    let attractions = 0;
    
    entries.forEach(e => {
      if (e.type === 'flight') {
        if (e.flightDetails?.flightType === 'international') intlFlights++;
        else domFlights++;
      } else if (e.type === 'hotel') {
        hotels++;
      } else if (e.type === 'attraction') {
        attractions++;
      }
    });
    
    return { intlFlights, domFlights, hotels, attractions, total: entries.length };
  };`;

  code = code.replace(
    "const getTripDates =",
    getTripStats + "\n\n  const getTripDates ="
  );

  code = code.replace(
    "entryCount={getTripEntryCount(item.id)}",
    "stats={getTripStats(item.id)}"
  );

  fs.writeFileSync(file, code);
}

function updateTripCard() {
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/src/components/TripCard.tsx';
  let code = fs.readFileSync(file, 'utf8');

  code = code.replace(
    "entryCount: number;",
    "stats: { intlFlights: number; domFlights: number; hotels: number; attractions: number; total: number };"
  );

  code = code.replace(
    "  entryCount,",
    "  stats,"
  );

  const statsUI = `      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12, marginTop: -4 }}>
        {stats.intlFlights > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="airplane" size={12} color={colors.textSecondary} />
            <Text style={[Typography.caption, { color: colors.textSecondary, marginLeft: 4 }]}>{stats.intlFlights} Intl Flight{stats.intlFlights > 1 ? 's' : ''}</Text>
          </View>
        )}
        {stats.domFlights > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="airplane-outline" size={12} color={colors.textSecondary} />
            <Text style={[Typography.caption, { color: colors.textSecondary, marginLeft: 4 }]}>{stats.domFlights} Dom Flight{stats.domFlights > 1 ? 's' : ''}</Text>
          </View>
        )}
        {stats.hotels > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="bed" size={12} color={colors.textSecondary} />
            <Text style={[Typography.caption, { color: colors.textSecondary, marginLeft: 4 }]}>{stats.hotels} Hotel{stats.hotels > 1 ? 's' : ''}</Text>
          </View>
        )}
        {stats.attractions > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="ticket" size={12} color={colors.textSecondary} />
            <Text style={[Typography.caption, { color: colors.textSecondary, marginLeft: 4 }]}>{stats.attractions} Attraction{stats.attractions > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>`;

  code = code.replace(
    /<View style=\{\[styles.divider, \{ backgroundColor: colors.borderLight \}\]\} \/>/g,
    statsUI
  );

  code = code.replace(
    "{entryCount} {entryCount === 1 ? 'entry' : 'entries'}",
    "{stats.total} {stats.total === 1 ? 'entry' : 'entries'}"
  );

  fs.writeFileSync(file, code);
}

try {
  updateIndex();
  updateTripCard();
} catch (e) {
  console.error(e);
  process.exit(1);
}
