const fs = require('fs');

function updateTripCard() {
  let file = '/Users/sangram/Workspaces/MyApps/Travezy/src/components/TripCard.tsx';
  let code = fs.readFileSync(file, 'utf8');

  // Add Transports to Stats Type
  code = code.replace(
    /stats: \{ intlFlights: number; domFlights: number; hotels: number; attractions: number; total: number \};/,
    'stats: { intlFlights: number; domFlights: number; hotels: number; attractions: number; transports: number; total: number };'
  );

  // Add Transports UI
  const transportsUI = `        {stats.attractions > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="ticket" size={12} color={colors.textSecondary} />
            <Text style={[Typography.caption, { color: colors.textSecondary, marginLeft: 4 }]}>{stats.attractions} Attraction{stats.attractions > 1 ? 's' : ''}</Text>
          </View>
        )}
        {stats.transports > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="bus" size={12} color={colors.textSecondary} />
            <Text style={[Typography.caption, { color: colors.textSecondary, marginLeft: 4 }]}>{stats.transports} Transport{stats.transports > 1 ? 's' : ''}</Text>
          </View>
        )}`;

  code = code.replace(
    /\{\s*stats\.attractions > 0 && \([\s\S]*?<\/View>\s*\)\s*\}/,
    transportsUI
  );

  // Update Badge
  const getBadgeColor = `  const getBadgeColor = () => {
    switch (trip.status) {
      case 'COMPLETED': return '#4CAF50';
      case 'CANCELLED': return '#F44336';
      case 'POSTPONED': return '#FF9800';
      default: return colors.primary;
    }
  };

  const showBadge = isActive || (trip.status && trip.status !== 'ACTIVE');
  const badgeText = trip.status || (isActive ? 'ACTIVE' : '');
`;

  code = code.replace(
    '  const getDayCount = () => {',
    getBadgeColor + '\n  const getDayCount = () => {'
  );

  const badgeUI = `      {showBadge && (
        <View style={[styles.activeBadge, { backgroundColor: getBadgeColor() }]}>
          <Text style={[Typography.label, { color: '#FFF', fontSize: 10 }]}>{badgeText}</Text>
        </View>
      )}`;

  code = code.replace(
    /\{\s*isActive && \([\s\S]*?<\/View>\s*\)\s*\}/,
    badgeUI
  );

  fs.writeFileSync(file, code);
}

try {
  updateTripCard();
  console.log("updated TripCard.tsx");
} catch (e) {
  console.error(e);
  process.exit(1);
}
