import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '../types';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

interface TripCardProps {
  trip: Trip;
  stats: { intlFlights: number; domFlights: number; hotels: number; attractions: number; transports: number; total: number };
  totalCost: string;
  isActive: boolean;
  computedStartDate?: string;
  computedEndDate?: string;
  onPress: () => void;
  onLongPress: () => void;
  theme: 'light' | 'dark';
}

export default function TripCard({
  trip,
  stats,
  totalCost,
  isActive,
  computedStartDate,
  computedEndDate,
  onPress,
  onLongPress,
  theme,
}: TripCardProps) {
  const colors = Colors[theme];

  const formatDateRange = () => {
    const start = new Date(computedStartDate || trip.startDate);
    const end = new Date(computedEndDate || trip.endDate);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', opts);
    const endStr = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
    return `${startStr} — ${endStr}`;
  };

  const getBadgeColor = () => {
    switch (trip.status) {
      case 'COMPLETED': return '#4CAF50';
      case 'CANCELLED': return '#F44336';
      case 'POSTPONED': return '#FF9800';
      default: return colors.primary;
    }
  };

  const showBadge = isActive || (trip.status && trip.status !== 'ACTIVE');
  const badgeText = trip.status || (isActive ? 'ACTIVE' : '');

  const getDayCount = () => {
    const start = new Date(computedStartDate || trip.startDate);
    const end = new Date(computedEndDate || trip.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isActive ? colors.primary : colors.border,
          borderWidth: isActive ? 2 : 1,
          shadowColor: colors.shadow,
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
            {showBadge && (
        <View style={[styles.activeBadge, { backgroundColor: getBadgeColor() }]}>
          <Text style={[Typography.label, { color: '#FFF', fontSize: 10 }]}>{badgeText}</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconBg, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name="airplane" size={22} color={colors.primary} />
          </View>
        </View>
        <View style={styles.headerText}>
          <Text style={[Typography.h3, { color: colors.text }]} numberOfLines={1}>
            {trip.name}
          </Text>
          <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            {formatDateRange()}
          </Text>
        </View>
      </View>

            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

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
        {stats.transports > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="bus" size={12} color={colors.textSecondary} />
            <Text style={[Typography.caption, { color: colors.textSecondary, marginLeft: 4 }]}>{stats.transports} Transport{stats.transports > 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
          <Text style={[Typography.caption, { color: colors.textSecondary, marginLeft: 4 }]}>
            {getDayCount()} days
          </Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="list-outline" size={14} color={colors.textMuted} />
          <Text style={[Typography.caption, { color: colors.textSecondary, marginLeft: 4 }]}>
            {stats.total} {stats.total === 1 ? 'entry' : 'entries'}
          </Text>
        </View>
        <View style={styles.footerItem}>
          <Text style={[Typography.captionMedium, { color: colors.primary }]}>{totalCost}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  activeBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
