import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItineraryEntry } from '../../types';
import { Typography } from '../../theme/typography';
import { formatCurrency, convertCurrency } from '../../data/exchangeRates';
import { useApp } from '../../context/AppContext';
import { OngoingHotelMeta } from '../../../app/(tabs)/itinerary';
import DocumentPills from '../DocumentPills';

interface HotelCardProps {
  entry: ItineraryEntry;
  meta: { label: string; icon: string; color: string };
  colors: any;
  theme: 'light' | 'dark';
  virtualType?: 'check-in' | 'check-out';
  ongoingHotel?: OngoingHotelMeta;
  isCollapsed?: boolean;
  collapsedSummary?: string;
  showPrice: boolean;
  onPress: () => void;
  onToggleCollapse?: () => void;
  entryImageUri?: string;
  onPickEntryImage?: () => void;
}

export default function HotelCard({
  entry,
  meta,
  colors,
  theme,
  virtualType,
  ongoingHotel,
  isCollapsed,
  collapsedSummary,
  showPrice,
  onPress,
  onToggleCollapse,
  entryImageUri,
  onPickEntryImage,
}: HotelCardProps) {
  const { state } = useApp();
  const primaryCurrency = state.settings.selectedCurrencies[0];
  const rates = state.exchangeRates.rates;
  const displayPrice = convertCurrency(entry.price, entry.currency, primaryCurrency, rates);

  if (!entry.hotelDetails && !ongoingHotel) return null;
  
  const details = entry.hotelDetails || ongoingHotel;
  const isSummary = virtualType === 'check-in' && isCollapsed;
  const isCheckOutNode = virtualType === 'check-out';
  
  const cardBg = meta.color + (theme === 'dark' ? '0A' : '05');
  const accentColor = meta.color;

  const content = (
    <View style={{ flex: 1 }}>
      {/* Header Row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.iconWrapper, { backgroundColor: entryImageUri ? 'rgba(255,255,255,0.2)' : accentColor + '20' }]}>
            <Ionicons name={isCheckOutNode ? 'log-out' : 'bed'} size={14} color={entryImageUri ? '#FFF' : accentColor} />
          </View>
          <Text style={[Typography.captionSemibold, { color: entryImageUri ? '#FFF' : accentColor, marginLeft: 8, letterSpacing: 1 }]}>
            {isCheckOutNode ? 'CHECK-OUT' : (isSummary ? 'HOTEL STAY' : 'CHECK-IN')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {onPickEntryImage && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onPickEntryImage(); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.cameraBtn, { backgroundColor: entryImageUri ? 'rgba(255,255,255,0.2)' : accentColor + '18', marginRight: virtualType === 'check-in' ? 8 : 0 }]}
            >
              <Ionicons name={entryImageUri ? "camera" : "camera-outline"} size={14} color={entryImageUri ? "#FFF" : accentColor} />
            </TouchableOpacity>
          )}
          {virtualType === 'check-in' && (
            <TouchableOpacity
              onPress={onToggleCollapse}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.collapseBtn, { backgroundColor: entryImageUri ? 'rgba(255,255,255,0.2)' : accentColor + '18' }]}
            >
              <Ionicons
                name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                size={14}
                color={entryImageUri ? '#FFF' : accentColor}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content */}
      <View>
        <Text style={[Typography.h2, { color: entryImageUri ? '#FFF' : colors.text, fontSize: 22, ...(entryImageUri ? { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 } : {}) }]} numberOfLines={1}>
          {details?.name || 'Hotel'}
        </Text>
        
        {!isCheckOutNode && (entry.hotelDetails?.address || entry.hotelDetails?.city || ongoingHotel?.city) ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Ionicons name="location-outline" size={12} color={entryImageUri ? 'rgba(255,255,255,0.8)' : colors.textSecondary} />
            <Text style={[Typography.caption, { color: entryImageUri ? 'rgba(255,255,255,0.8)' : colors.textSecondary, marginLeft: 4 }]} numberOfLines={1}>
              {[entry.hotelDetails?.address, entry.hotelDetails?.city || ongoingHotel?.city].filter(Boolean).join(', ')}
            </Text>
          </View>
        ) : null}

        {/* Structured Date Boxes */}
        <View style={{ flexDirection: 'row', marginTop: 16, gap: 8 }}>
          {!isCheckOutNode && (
            <View style={[styles.dateBox, { backgroundColor: entryImageUri ? 'rgba(0,0,0,0.4)' : (theme === 'dark' ? '#1c1c1e' : '#ffffff'), borderColor: entryImageUri ? 'rgba(255,255,255,0.3)' : colors.border }]}>
              <Text style={[Typography.caption, { color: entryImageUri ? 'rgba(255,255,255,0.7)' : colors.textMuted, fontSize: 10, textTransform: 'uppercase' }]}>Check-In</Text>
              <Text style={[Typography.bodySemibold, { color: entryImageUri ? '#FFF' : colors.text, marginTop: 4 }]}>
                {ongoingHotel ? ongoingHotel.checkInDateTime : new Date(entry.hotelDetails!.checkInTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
          
          <View style={[styles.dateBox, { backgroundColor: entryImageUri ? 'rgba(0,0,0,0.4)' : (theme === 'dark' ? '#1c1c1e' : '#ffffff'), borderColor: entryImageUri ? 'rgba(255,255,255,0.3)' : colors.border }]}>
              <Text style={[Typography.caption, { color: entryImageUri ? 'rgba(255,255,255,0.7)' : colors.textMuted, fontSize: 10, textTransform: 'uppercase' }]}>Check-Out</Text>
              <Text style={[Typography.bodySemibold, { color: entryImageUri ? '#FFF' : colors.text, marginTop: 4 }]}>
                {ongoingHotel ? ongoingHotel.checkOutDateTime : new Date(entry.hotelDetails!.checkOutTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
        </View>

        {!isCheckOutNode && !entryImageUri && <DocumentPills documents={entry.documents} theme={theme} />}

        {isSummary && collapsedSummary && (
          <View style={[styles.collapsedSummaryChip, { backgroundColor: entryImageUri ? 'rgba(0,0,0,0.4)' : accentColor + '15', borderColor: entryImageUri ? 'rgba(255,255,255,0.3)' : accentColor + '30' }]}>
            <Ionicons name="layers-outline" size={12} color={entryImageUri ? '#FFF' : accentColor} />
            <Text style={[Typography.captionSemibold, { color: entryImageUri ? '#FFF' : accentColor, marginLeft: 6 }]}>
              {collapsedSummary}
            </Text>
          </View>
        )}

        {showPrice !== false && entry.price > 0 && !isCheckOutNode && !isCollapsed && (
          <View style={{ marginTop: 12, alignItems: 'flex-end' }}>
            <Text style={[Typography.h2, { color: entryImageUri ? '#FFF' : accentColor, ...(entryImageUri ? { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 } : {}) }]}>
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
        { backgroundColor: entryImageUri ? 'transparent' : cardBg, borderColor: entryImageUri ? accentColor + '40' : accentColor + '30', shadowColor: colors.shadow, overflow: 'hidden', padding: 0 },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {entryImageUri ? (
        <ImageBackground 
          source={{ uri: entryImageUri }}
          style={{ width: '100%', minHeight: 160, justifyContent: 'flex-end' }}
          imageStyle={{ borderRadius: 20 }}
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
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBox: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  collapsedSummaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: 20,
  },
});
