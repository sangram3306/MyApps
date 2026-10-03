import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItineraryEntry, ENTRY_TYPE_META } from '../types';
import { formatCurrency } from '../data/exchangeRates';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { OngoingHotelMeta } from '../../app/(tabs)/itinerary';
import FlightCard from './cards/FlightCard';
import HotelCard from './cards/HotelCard';
import AttractionCard from './cards/AttractionCard';
import GenericCard from './cards/GenericCard';

interface TimelineItemProps {
  entry: ItineraryEntry;
  virtualType?: 'check-in' | 'check-out' | 'city-header';
  cityName?: string;
  blockType?: 'city' | 'travel';
  cityItemCount?: number;
  cityStartDateLabel?: string;
  cityEndDateLabel?: string;
  ongoingHotel?: OngoingHotelMeta;
  showDate: boolean;
  dateLabel: string;
  isFirst: boolean;
  isLast: boolean;
  gapText?: string;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  isNavigable?: boolean;
  collapsedSummary?: string;
  onToggleCollapse?: () => void;
  onPress: () => void;
  theme: 'light' | 'dark';
  showPrice?: boolean;
}

export default function TimelineItem({
  entry,
  virtualType,
  cityName,
  blockType,
  cityItemCount,
  cityStartDateLabel,
  cityEndDateLabel,
  ongoingHotel,
  showDate,
  dateLabel,
  isFirst,
  isLast,
  gapText,
  isCollapsible,
  isCollapsed,
  isNavigable,
  collapsedSummary,
  onToggleCollapse,
  onPress,
  theme,
  showPrice = true,
}: TimelineItemProps) {
  const colors = Colors[theme];
  const hotelAccentColor = colors.primary;
  
  const [isFlightExpanded, setIsFlightExpanded] = useState(false);

  // Determine metadata (icon, color, label)
  let meta = ENTRY_TYPE_META[entry.type] || ENTRY_TYPE_META.other;
  if (virtualType === 'check-out') {
    meta = { ...meta, icon: 'log-out', label: 'Check-out', color: colors.textSecondary };
  } else if (virtualType === 'check-in') {
    meta = { ...meta, label: 'Check-in' };
  } else if (virtualType === 'city-header') {
    if (blockType === 'travel') {
      meta = { label: 'Travel', icon: 'airplane', color: colors.primary };
    } else {
      meta = { label: 'City', icon: 'location', color: colors.primary };
    }
  }

  // Is this card inside a hotel stay (but not the check-in/out/city-header itself)?
  const isActivityInStay = !!ongoingHotel && !virtualType;

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const layovers: { place: string; duration: string }[] = [];
  if (entry.type === 'flight' && entry.flightDetails?.isConnecting && entry.flightDetails.connections) {
    const conns = entry.flightDetails.connections;
    for (let i = 0; i < conns.length - 1; i++) {
      const ms = new Date(conns[i+1].departureTime).getTime() - new Date(conns[i].arrivalTime).getTime();
      layovers.push({ place: conns[i].to, duration: formatDuration(ms) });
    }
  }

  // Render city header directly (skip normal card wrapper)
  if (virtualType === 'city-header') {
    let dateBadgeContent = null;
    if (isCollapsed && cityStartDateLabel && cityEndDateLabel) {
      if (cityStartDateLabel === cityEndDateLabel) {
        dateBadgeContent = cityStartDateLabel.replace(' ', '\n');
      } else {
        const parts1 = cityStartDateLabel.split(' ');
        const parts2 = cityEndDateLabel.split(' ');
        if (parts1.length === 2 && parts2.length === 2 && parts1[0] === parts2[0]) {
          dateBadgeContent = `${parts1[0]}\n${parts1[1]}-${parts2[1]}`;
        } else {
          dateBadgeContent = `${cityStartDateLabel}\n-\n${cityEndDateLabel}`;
        }
      }
    }

    return (
      <View style={[styles.container, { minHeight: 60 }]}>
        <View style={styles.dateColumn}>
          {dateBadgeContent && (
            <View style={[styles.dateBadge, { backgroundColor: colors.primary + '18' }]}>
              <Text style={[Typography.captionMedium, { color: colors.primary, textAlign: 'center' }]}>
                {dateBadgeContent}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.timelineColumn}>
          {!isFirst && <View style={[styles.lineTop, { backgroundColor: colors.timelineLine }]} />}
          <View style={[styles.dot, { backgroundColor: colors.background, borderWidth: 2, borderColor: colors.primary }]}>
            <Ionicons name={meta.icon as any} size={14} color={colors.primary} />
          </View>
          {!isLast && <View style={[styles.lineBottom, { backgroundColor: colors.timelineLine }]} />}
        </View>
        
        <View style={{ flex: 1, marginRight: 16 }}>
          {!!gapText && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'transparent', borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border, opacity: 0.3 }} />
              <Text style={[Typography.caption, { color: colors.textMuted, fontSize: 10, marginHorizontal: 8, fontStyle: 'italic' }]}>
                {gapText}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'transparent', borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border, opacity: 0.3 }} />
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.cityCard, 
              { backgroundColor: isCollapsed ? colors.primary + '10' : 'transparent', borderColor: isCollapsed ? colors.primary + '30' : 'transparent', marginRight: 0 }
            ]}
            onPress={onToggleCollapse}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[Typography.h1, { color: colors.text, fontSize: isCollapsed ? 28 : 20 }]} numberOfLines={1}>
                  {cityName}
                </Text>
                {!isCollapsed && (
                  <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                    {cityItemCount} entries planned
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={onToggleCollapse}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.collapseBtn, { backgroundColor: isCollapsed ? colors.primary + '20' : 'transparent' }]}
              >
                <Ionicons 
                  name={isNavigable ? 'chevron-forward' : (isCollapsed ? 'chevron-down' : 'chevron-up')} 
                  size={16} 
                  color={isCollapsed || isNavigable ? colors.primary : colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Date Column */}
      <View style={styles.dateColumn}>
        {showDate && (
          <View style={[styles.dateBadge, { backgroundColor: colors.primary + '18' }]}>
            <Text style={[Typography.captionMedium, { color: colors.primary, textAlign: 'center' }]}>
              {dateLabel}
            </Text>
          </View>
        )}
      </View>

      {/* Timeline Line + Dot */}
      <View style={styles.timelineColumn}>
        {/* Thin accent line for hotel stay (replaces bold red line) */}
        {!!ongoingHotel && (
          <View
            style={[
              styles.ongoingLineWrapper,
              { backgroundColor: hotelAccentColor },
              virtualType === 'check-in' ? { top: '50%' } : null,
              virtualType === 'check-out' ? { bottom: '50%' } : null,
            ]}
          />
        )}

        {!isFirst && (
          <View style={[styles.lineTop, { backgroundColor: colors.timelineLine }]} />
        )}
        <View style={[styles.dot, { backgroundColor: meta.color, shadowColor: meta.color }]}>
          <Ionicons name={meta.icon as any} size={12} color="#FFF" />
        </View>
        {!isLast && (
          <View style={[styles.lineBottom, { backgroundColor: colors.timelineLine }]} />
        )}
      </View>

      {/* Entry Card Routing */}
      <View style={{ flex: 1 }}>
        {!!gapText && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6, marginRight: 16 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'transparent', borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border, opacity: 0.3 }} />
            <Text style={[Typography.caption, { color: colors.textMuted, fontSize: 10, marginHorizontal: 8, fontStyle: 'italic' }]}>
              {gapText}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'transparent', borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border, opacity: 0.3 }} />
          </View>
        )}
        {(() => {
          if (entry.type === 'flight') {
            return (
              <FlightCard
                entry={entry}
                meta={meta}
                colors={colors}
                theme={theme}
                onPress={onPress}
                showPrice={showPrice}
              />
            );
          }
          if (entry.type === 'hotel' || virtualType === 'check-in' || virtualType === 'check-out') {
            return (
              <HotelCard
                entry={entry}
                meta={meta}
                colors={colors}
                theme={theme}
                virtualType={virtualType}
                ongoingHotel={ongoingHotel}
                isCollapsed={isCollapsed}
                collapsedSummary={collapsedSummary}
              onPress={onPress}
              onToggleCollapse={onToggleCollapse}
              showPrice={showPrice}
            />
          );
        }
        if (entry.type === 'attraction') {
          return (
            <AttractionCard
              entry={entry}
              meta={meta}
              colors={colors}
              theme={theme}
              ongoingHotel={isActivityInStay ? ongoingHotel : undefined}
              onPress={onPress}
              showPrice={showPrice}
            />
          );
        }
        return (
          <GenericCard
            entry={entry}
            meta={meta}
            colors={colors}
            theme={theme}
            ongoingHotel={isActivityInStay ? ongoingHotel : undefined}
            onPress={onPress}
            showPrice={showPrice}
          />
        );
      })()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    minHeight: 90,
  },
  dateColumn: {
    width: 65,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  dateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timelineColumn: {
    width: 46,
    alignItems: 'center',
  },
  ongoingLineWrapper: {
    position: 'absolute',
    width: 1,
    top: 0,
    bottom: 0,
    right: 8,
    opacity: 0.3,
    borderRadius: 1,
  },
  lineTop: {
    width: 2,
    minHeight: 24,
  },
  gapBadge: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    width: 62,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  lineBottom: {
    width: 2,
    flex: 1,
  },
  cityCard: {
    flex: 1,
    marginRight: 16,
    marginBottom: 8,
    marginTop: 4,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    justifyContent: 'center',
  },
  collapseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapsedSummaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
});
