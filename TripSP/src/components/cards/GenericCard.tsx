import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItineraryEntry } from '../../types';
import { Typography } from '../../theme/typography';
import { formatCurrency, convertCurrency } from '../../data/exchangeRates';
import { useApp } from '../../context/AppContext';
import { OngoingHotelMeta } from '../../../app/(tabs)/itinerary';
import DocumentPills from '../DocumentPills';
import { formatTime } from '../../utils/date';
import TaxiDriverCardModal from '../TaxiDriverCardModal';

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
  const { state, updateEntry } = useApp();
  const [showTaxiModal, setShowTaxiModal] = useState(false);
  const primaryCurrency = state.settings.selectedCurrencies[0];
  const rates = state.exchangeRates.rates;
  const displayPrice = convertCurrency(entry.price, entry.currency, primaryCurrency, rates);

  const isTransport = entry.type === 'transport';
  const t = entry.transportDetails;
  const hasCustomDropOff = Boolean(t?.to || t?.dropOffAddress || t?.localName || t?.localAddress || t?.customGpsUrl);

  // Find trip destination hotel (fallback if no custom dropoff specified)
  const tripHotels = state.entries.filter(
    (e) => e.tripId === entry.tripId && e.type === 'hotel' && e.hotelDetails
  );
  const transTime = t?.startTime
    ? new Date(t.startTime).getTime()
    : (entry.date ? new Date(entry.date).getTime() : Date.now());

  const destinationHotel =
    tripHotels.find((h) => new Date(h.hotelDetails!.checkInTime).getTime() >= transTime - 2 * 3600000) ||
    tripHotels.find((h) => {
      const cin = new Date(h.hotelDetails!.checkInTime).getTime();
      const cout = new Date(h.hotelDetails!.checkOutTime).getTime();
      return transTime >= cin && transTime <= cout;
    }) ||
    tripHotels[0];

  const driverDestName = t?.to || destinationHotel?.hotelDetails?.name || entry.title || 'Taxi Destination';
  const driverDestAddress = t?.dropOffAddress || destinationHotel?.hotelDetails?.address || entry.notes || '';
  const driverLocalName = t?.localName || (hasCustomDropOff ? undefined : destinationHotel?.hotelDetails?.localName);
  const driverLocalAddress = t?.localAddress || (hasCustomDropOff ? undefined : destinationHotel?.hotelDetails?.localAddress);
  const driverCustomGps = t?.customGpsUrl || (hasCustomDropOff ? undefined : destinationHotel?.hotelDetails?.customGpsUrl);

  const cardBg = meta.color + (theme === 'dark' ? '10' : '08');
  const hasDetails = Boolean(ongoingHotel && !isTransport) || Boolean(entry.transportDetails) || isTransport;
  
  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor: meta.color + '20', shadowColor: colors.shadow },
        ]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={[styles.iconBox, { backgroundColor: meta.color }]}>
            <Ionicons name={meta.icon as any} size={20} color="#FFF" />
          </View>
          
          <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
            <Text style={[Typography.bodySemibold, { color: colors.text, fontSize: 16 }]}>
              {entry.title}
            </Text>
            <Text style={[Typography.caption, { color: meta.color, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }]}>
              {meta.label}
            </Text>
          </View>

          {showPrice !== false && entry.price > 0 && (
            <Text
              style={[
                Typography.bodySemibold,
                {
                  color: colors.text,
                  marginRight: (entry.documents && entry.documents.length > 0 && (state.settings.showDocumentBadge ?? true)) ? 18 : 0,
                },
              ]}
            >
              {formatCurrency(displayPrice, primaryCurrency)}
            </Text>
          )}
        </View>

        {hasDetails && (
          <View style={{ marginTop: 6, paddingLeft: 52 }}>
            {ongoingHotel && !isTransport && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, opacity: 0.8 }}>
                <Ionicons name="bed" size={12} color={colors.textSecondary} />
                <Text style={[Typography.caption, { color: colors.textSecondary, marginLeft: 4, flex: 1 }]} numberOfLines={1}>
                  {ongoingHotel.name}
                </Text>
              </View>
            )}
            {entry.transportDetails && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="time-outline" size={12} color={meta.color} />
                  <Text style={[Typography.captionSemibold, { color: meta.color, marginLeft: 4 }]}>
                    {formatTime(entry.transportDetails.startTime, state.settings.timeFormat)} - {formatTime(entry.transportDetails.endTime, state.settings.timeFormat)}
                  </Text>
                </View>
                {isTransport && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setShowTaxiModal(true);
                    }}
                    style={styles.taxiCardBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="car" size={14} color="#FFD166" />
                  </TouchableOpacity>
                )}
              </View>
            )}
            {!entry.transportDetails && isTransport && (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setShowTaxiModal(true);
                  }}
                  style={styles.taxiCardBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="car" size={14} color="#FFD166" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Floating notification badge on top-right corner */}
      {entry.documents && entry.documents.length > 0 && (
        <DocumentPills documents={entry.documents} theme={theme} style={styles.cornerBadge} />
      )}

      {/* Taxi Driver Card Modal */}
      {isTransport && (
        <TaxiDriverCardModal
          visible={showTaxiModal}
          onClose={() => setShowTaxiModal(false)}
          hotelName={driverDestName}
          hotelAddress={driverDestAddress}
          hotelCity={destinationHotel?.hotelDetails?.city || ongoingHotel?.city}
          localName={driverLocalName}
          localAddress={driverLocalAddress}
          customGpsUrl={driverCustomGps}
          countryOrCityHint={`${destinationHotel?.hotelDetails?.city || ''} ${ongoingHotel?.city || ''} ${state.trips.find((t) => t.id === entry.tripId)?.name || ''}`}
          onSaveLocalDetails={async (locName, locAddr, customGps) => {
            if (hasCustomDropOff || !destinationHotel) {
              await updateEntry({
                ...entry,
                transportDetails: {
                  startTime: entry.transportDetails?.startTime || new Date().toISOString(),
                  endTime: entry.transportDetails?.endTime || new Date().toISOString(),
                  ...entry.transportDetails,
                  localName: locName,
                  localAddress: locAddr,
                  customGpsUrl: customGps,
                },
              });
            } else if (destinationHotel?.hotelDetails) {
              await updateEntry({
                ...destinationHotel,
                hotelDetails: {
                  ...destinationHotel.hotelDetails,
                  localName: locName,
                  localAddress: locAddr,
                  customGpsUrl: customGps,
                },
              });
            }
          }}
          theme={theme}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    marginRight: 16,
    marginBottom: 12,
    marginTop: 4,
    position: 'relative',
  },
  card: {
    flex: 1,
    borderRadius: 24, // Pill-like rounding
    borderWidth: 1,
    padding: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  taxiCardBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD166',
    backgroundColor: '#FFD16622',
  },
  cornerBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 10,
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
