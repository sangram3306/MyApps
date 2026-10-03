import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItineraryEntry } from '../../types';
import { Typography } from '../../theme/typography';
import { formatCurrency, convertCurrency } from '../../data/exchangeRates';
import { useApp } from '../../context/AppContext';
import { OngoingHotelMeta } from '../../../app/(tabs)/itinerary';
import DocumentPills from '../DocumentPills';

interface GenericCardProps {
  entry: ItineraryEntry;
  meta: { label: string; icon: string; color: string };
  colors: any;
  theme: 'light' | 'dark';
  showPrice: boolean;
  ongoingHotel?: OngoingHotelMeta;
  onPress: () => void;
}

export default function GenericCard({
  entry,
  meta,
  colors,
  theme,
  showPrice,
  ongoingHotel,
  onPress,
}: GenericCardProps) {
  const { state } = useApp();
  const primaryCurrency = state.settings.selectedCurrencies[0];
  const rates = state.exchangeRates.rates;
  const displayPrice = convertCurrency(entry.price, entry.currency, primaryCurrency, rates);

  const cardBg = meta.color + (theme === 'dark' ? '10' : '08');
  
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: cardBg, borderColor: meta.color + '20', shadowColor: colors.shadow },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.iconBox, { backgroundColor: meta.color }]}>
          <Ionicons name={meta.icon as any} size={20} color="#FFF" />
        </View>
        
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[Typography.bodySemibold, { color: colors.text, fontSize: 16 }]} numberOfLines={1}>
            {entry.title}
          </Text>
          <Text style={[Typography.caption, { color: meta.color, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }]}>
            {meta.label}
          </Text>
        </View>

      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12, paddingLeft: 48 }}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          {ongoingHotel && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, opacity: 0.8 }}>
              <Ionicons name="bed" size={12} color={colors.textSecondary} />
              <Text style={[Typography.caption, { color: colors.textSecondary, marginLeft: 4, flex: 1 }]} numberOfLines={1}>
                {ongoingHotel.name}
              </Text>
            </View>
          )}
          {entry.transportDetails && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons name="time-outline" size={12} color={meta.color} />
              <Text style={[Typography.captionSemibold, { color: meta.color, marginLeft: 4 }]}>
                {new Date(entry.transportDetails.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(entry.transportDetails.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
          {entry.notes ? (
            <Text style={[Typography.caption, { color: colors.textSecondary }]} numberOfLines={2}>
              {entry.notes}
            </Text>
          ) : <View />}
          <DocumentPills documents={entry.documents} theme={theme} />
        </View>

        {showPrice !== false && entry.price > 0 && (
          <Text style={[Typography.bodySemibold, { color: colors.text }]}>
            {formatCurrency(displayPrice, primaryCurrency)}
          </Text>
        )}
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
    borderRadius: 24, // Pill-like rounding
    borderWidth: 1,
    padding: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});
