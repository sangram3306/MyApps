import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItineraryEntry } from '../../types';
import { Typography } from '../../theme/typography';
import { formatCurrency, convertCurrency } from '../../data/exchangeRates';
import { useApp } from '../../context/AppContext';
import { OngoingHotelMeta } from '../../../app/(tabs)/itinerary';
import DocumentPills from '../DocumentPills';

interface AttractionCardProps {
  entry: ItineraryEntry;
  meta: { label: string; icon: string; color: string };
  colors: any;
  theme: 'light' | 'dark';
  showPrice: boolean;
  ongoingHotel?: OngoingHotelMeta;
  onPress: () => void;
}

export default function AttractionCard({
  entry,
  meta,
  colors,
  theme,
  showPrice,
  ongoingHotel,
  onPress,
}: AttractionCardProps) {
  const { state } = useApp();
  const primaryCurrency = state.settings.selectedCurrencies[0];
  const rates = state.exchangeRates.rates;
  const displayPrice = convertCurrency(entry.price, entry.currency, primaryCurrency, rates);

  const cardBg = meta.color + (theme === 'dark' ? '15' : '10');
  
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: cardBg, borderColor: meta.color + '50', shadowColor: colors.shadow },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <View style={[styles.badge, { backgroundColor: meta.color }]}>
            <Ionicons name={meta.icon as any} size={12} color="#FFF" />
            <Text style={[Typography.captionSemibold, { color: '#FFF', marginLeft: 4, textTransform: 'uppercase', fontSize: 10 }]}>
              {meta.label}
            </Text>
          </View>

          <Text style={[Typography.h2, { color: colors.text, marginTop: 12, fontSize: 20 }]} numberOfLines={2}>
            {entry.title}
          </Text>

          {entry.attractionDetails && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <Ionicons name="time" size={14} color={meta.color} />
              <Text style={[Typography.bodySemibold, { color: meta.color, marginLeft: 6 }]}>
                {new Date(entry.attractionDetails.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(entry.attractionDetails.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}

          {ongoingHotel && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, opacity: 0.8 }}>
              <Ionicons name="bed" size={12} color={colors.textSecondary} />
              <Text style={[Typography.caption, { color: colors.textSecondary, marginLeft: 4, flex: 1 }]} numberOfLines={1}>
                {ongoingHotel.name}
              </Text>
            </View>
          )}

          {entry.notes ? (
            <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 8, fontStyle: 'italic' }]} numberOfLines={2}>
              "{entry.notes}"
            </Text>
          ) : null}
          <DocumentPills documents={entry.documents} theme={theme} />
        </View>

        <View style={{ alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          {showPrice !== false && entry.price > 0 && (
            <View style={[styles.priceTag, { backgroundColor: theme === 'dark' ? '#1c1c1e' : '#ffffff', borderColor: meta.color + '30' }]}>
              <Text style={[Typography.bodySemibold, { color: meta.color }]}>
                {formatCurrency(displayPrice, primaryCurrency)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginRight: 16,
    marginBottom: 12,
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed', // Ticket style
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deleteBtn: {
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  priceTag: {
    marginTop: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
});
