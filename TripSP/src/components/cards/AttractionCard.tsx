import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
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
  entryImageUri?: string;
  onPickEntryImage?: () => void;
}

export default function AttractionCard({
  entry,
  meta,
  colors,
  theme,
  showPrice,
  ongoingHotel,
  onPress,
  entryImageUri,
  onPickEntryImage,
}: AttractionCardProps) {
  const { state } = useApp();
  const primaryCurrency = state.settings.selectedCurrencies[0];
  const rates = state.exchangeRates.rates;
  const displayPrice = convertCurrency(entry.price, entry.currency, primaryCurrency, rates);

  const cardBg = meta.color + (theme === 'dark' ? '15' : '10');
  
  const content = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch' }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={[styles.badge, { backgroundColor: meta.color }]}>
            <Ionicons name={meta.icon as any} size={12} color="#FFF" />
            <Text style={[Typography.captionSemibold, { color: '#FFF', marginLeft: 4, textTransform: 'uppercase', fontSize: 10 }]}>
              {meta.label}
            </Text>
          </View>
          {onPickEntryImage && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onPickEntryImage(); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.cameraBtn, { backgroundColor: entryImageUri ? 'rgba(255,255,255,0.2)' : meta.color + '15' }]}
            >
              <Ionicons name={entryImageUri ? "camera" : "camera-outline"} size={14} color={entryImageUri ? "#FFF" : meta.color} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[Typography.h2, { color: entryImageUri ? '#FFF' : colors.text, marginTop: 12, fontSize: 20, ...(entryImageUri ? { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 } : {}) }]} numberOfLines={2}>
          {entry.title}
        </Text>

        {entry.attractionDetails && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Ionicons name="time" size={14} color={entryImageUri ? '#FFF' : meta.color} />
            <Text style={[Typography.bodySemibold, { color: entryImageUri ? '#FFF' : meta.color, marginLeft: 6 }]}>
              {new Date(entry.attractionDetails.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(entry.attractionDetails.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}

        {ongoingHotel && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, opacity: 0.8 }}>
            <Ionicons name="bed" size={12} color={entryImageUri ? 'rgba(255,255,255,0.8)' : colors.textSecondary} />
            <Text style={[Typography.caption, { color: entryImageUri ? 'rgba(255,255,255,0.8)' : colors.textSecondary, marginLeft: 4, flex: 1 }]} numberOfLines={1}>
              {ongoingHotel.name}
            </Text>
          </View>
        )}

        {entry.notes ? (
          <Text style={[Typography.caption, { color: entryImageUri ? 'rgba(255,255,255,0.8)' : colors.textSecondary, marginTop: 8, fontStyle: 'italic' }]} numberOfLines={2}>
            "{entry.notes}"
          </Text>
        ) : null}
        {!entryImageUri && <DocumentPills documents={entry.documents} theme={theme} />}
      </View>

      <View style={{ alignItems: 'flex-end', justifyContent: 'flex-end' }}>
        {showPrice !== false && entry.price > 0 && (
          <View style={[styles.priceTag, { backgroundColor: entryImageUri ? 'rgba(0,0,0,0.4)' : (theme === 'dark' ? '#1c1c1e' : '#ffffff'), borderColor: entryImageUri ? 'rgba(255,255,255,0.3)' : meta.color + '30' }]}>
            <Text style={[Typography.bodySemibold, { color: entryImageUri ? '#FFF' : meta.color }]}>
              {formatCurrency(displayPrice, primaryCurrency)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: entryImageUri ? 'transparent' : cardBg, borderColor: entryImageUri ? meta.color + '40' : meta.color + '50', shadowColor: colors.shadow, overflow: 'hidden', padding: 0 },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {entryImageUri ? (
        <ImageBackground 
          source={{ uri: entryImageUri }}
          style={{ width: '100%', minHeight: 160, justifyContent: 'flex-end' }}
          imageStyle={{ borderRadius: 16 }}
        >
          <View style={[styles.imageOverlay, { padding: 16 }]}>
            {content}
          </View>
        </ImageBackground>
      ) : (
        <View style={{ padding: 16 }}>
          {content}
        </View>
      )}
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
  cameraBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingTop: 20,
  },
});
