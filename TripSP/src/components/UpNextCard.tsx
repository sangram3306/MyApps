import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Modal,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Trip, ItineraryEntry, ENTRY_TYPE_META } from '../types';
import { formatTime } from '../utils/date';
import TaxiDriverCardModal from './TaxiDriverCardModal';
import { useApp } from '../context/AppContext';

interface UpNextCardProps {
  trip?: Trip | null;
  entries: ItineraryEntry[];
  theme: 'light' | 'dark';
  timeFormat?: '12h' | '24h';
  onPressEntry?: (entryId: string) => void;
  compact?: boolean;
  sectionTitle?: string;
}

interface ProcessedEvent {
  id: string;
  entryId: string;
  entry: ItineraryEntry;
  type: 'flight' | 'hotel_checkin' | 'hotel_stay' | 'hotel_checkout' | 'attraction' | 'transport' | 'other';
  title: string;
  subtitle: string;
  location: string;
  startTime: number;
  endTime: number;
  metaColor: string;
  metaIcon: string;
  flightBadge?: { from: string; to: string; flightNo?: string };
  hotelDetails?: ItineraryEntry['hotelDetails'];
  targetHotelEntry?: ItineraryEntry;
  documents?: ItineraryEntry['documents'];
  addressOrGps?: string;
}

const { width } = Dimensions.get('window');

export default function UpNextCard({
  trip,
  entries,
  theme,
  timeFormat = '12h',
  onPressEntry,
  compact = false,
  sectionTitle,
}: UpNextCardProps) {
  const colors = Colors[theme];
  const { updateEntry } = useApp();

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showTaxiModal, setShowTaxiModal] = useState(false);
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<{ id: string; name: string; uri: string; type: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'upcoming'>('ongoing');

  // Update ticker every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Process and sort all trip events
  const { ongoingEvents, upcomingEvents } = useMemo(() => {
    const list: ProcessedEvent[] = [];

    entries.forEach((entry) => {
      if (entry.type === 'flight' && entry.flightDetails) {
        const f = entry.flightDetails;
        const depTime = new Date(f.departureTime).getTime();
        const arrTime = new Date(f.arrivalTime).getTime();

        if (f.isConnecting && f.connections && f.connections.length > 0) {
          f.connections.forEach((conn, idx) => {
            const cDep = new Date(conn.departureTime).getTime();
            const cArr = new Date(conn.arrivalTime).getTime();
            list.push({
              id: `${entry.id}-conn-${idx}`,
              entryId: entry.id,
              entry,
              type: 'flight',
              title: conn.flightName ? `Flight ${conn.flightName}` : `Flight to ${conn.to}`,
              subtitle: conn.departureTerminal ? `Terminal ${conn.departureTerminal} (Leg ${idx + 1})` : `Leg ${idx + 1} of flight`,
              location: `${conn.from} ➔ ${conn.to}`,
              startTime: isNaN(cDep) ? depTime : cDep,
              endTime: isNaN(cArr) ? (isNaN(cDep) ? depTime + 7200000 : cDep + 7200000) : cArr,
              metaColor: ENTRY_TYPE_META.flight?.color || '#6C63FF',
              metaIcon: 'airplane',
              flightBadge: { from: conn.from, to: conn.to, flightNo: conn.flightName },
              documents: entry.documents,
            });
          });
        } else {
          list.push({
            id: `${entry.id}-flight`,
            entryId: entry.id,
            entry,
            type: 'flight',
            title: f.flightName ? `Flight ${f.flightName}` : `Flight to ${f.to}`,
            subtitle: f.departureTerminal ? `Departing Terminal ${f.departureTerminal}` : 'Flight Departure',
            location: `${f.from} ➔ ${f.to}`,
            startTime: isNaN(depTime) ? Date.now() : depTime,
            endTime: isNaN(arrTime) ? depTime + 7200000 : arrTime,
            metaColor: ENTRY_TYPE_META.flight?.color || '#6C63FF',
            metaIcon: 'airplane',
            flightBadge: { from: f.from, to: f.to, flightNo: f.flightName },
            documents: entry.documents,
          });
        }
      } else if (entry.type === 'hotel' && entry.hotelDetails) {
        const h = entry.hotelDetails;
        const checkIn = new Date(h.checkInTime).getTime();
        const checkOut = new Date(h.checkOutTime).getTime();

        // 1. Check-in event
        if (currentTime < checkIn) {
          list.push({
            id: `${entry.id}-checkin`,
            entryId: entry.id,
            entry,
            type: 'hotel_checkin',
            title: `Check-in: ${h.name}`,
            subtitle: `Check-in starts at ${formatTime(checkIn, timeFormat)}`,
            location: h.city ? `${h.city} • ${h.address}` : h.address,
            startTime: checkIn,
            endTime: checkIn + 3600000,
            metaColor: ENTRY_TYPE_META.hotel?.color || '#FF6B6B',
            metaIcon: 'bed',
            hotelDetails: h,
            documents: entry.documents,
            addressOrGps: h.customGpsUrl || h.address,
          });
        }

        // 2. Ongoing stay during the hotel duration
        if (currentTime >= checkIn && currentTime <= checkOut) {
          list.push({
            id: `${entry.id}-stay`,
            entryId: entry.id,
            entry,
            type: 'hotel_stay',
            title: `Staying at ${h.name}`,
            subtitle: `Check-out: ${new Date(checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${formatTime(checkOut, timeFormat)}`,
            location: h.city ? `${h.city} • ${h.address}` : h.address,
            startTime: checkIn,
            endTime: checkOut,
            metaColor: ENTRY_TYPE_META.hotel?.color || '#FF6B6B',
            metaIcon: 'bed',
            hotelDetails: h,
            documents: entry.documents,
            addressOrGps: h.customGpsUrl || h.address,
          });
        }

        // 3. Check-out event
        if (currentTime >= checkIn && currentTime < checkOut) {
          list.push({
            id: `${entry.id}-checkout`,
            entryId: entry.id,
            entry,
            type: 'hotel_checkout',
            title: `Check-out: ${h.name}`,
            subtitle: `Check-out by ${formatTime(checkOut, timeFormat)}`,
            location: h.city ? `${h.city}` : h.address,
            startTime: checkOut,
            endTime: checkOut + 3600000,
            metaColor: ENTRY_TYPE_META.hotel?.color || '#FF6B6B',
            metaIcon: 'exit-outline',
            hotelDetails: h,
            documents: entry.documents,
            addressOrGps: h.customGpsUrl || h.address,
          });
        }
      } else if (entry.type === 'attraction' && entry.attractionDetails) {
        const a = entry.attractionDetails;
        const start = new Date(a.startTime).getTime();
        const end = new Date(a.endTime).getTime();
        list.push({
          id: `${entry.id}-attr`,
          entryId: entry.id,
          entry,
          type: 'attraction',
          title: entry.title,
          subtitle: entry.notes ? entry.notes.slice(0, 40) : 'Attraction / Activity',
          location: entry.notes || 'Activity',
          startTime: isNaN(start) ? Date.now() : start,
          endTime: isNaN(end) ? start + 3600000 * 2 : end,
          metaColor: ENTRY_TYPE_META.attraction?.color || '#4ECDC4',
          metaIcon: 'ticket-outline',
          documents: entry.documents,
          addressOrGps: a.link,
        });
      } else if (entry.type === 'transport') {
        const t = entry.transportDetails;
        let startT = NaN;
        let endT = NaN;
        if (t?.startTime) startT = new Date(t.startTime).getTime();
        if (t?.endTime) endT = new Date(t.endTime).getTime();
        if (isNaN(startT) && entry.date) {
          const [year, month, day] = entry.date.split('-').map(Number);
          startT = new Date(year, month - 1, day, 9, 0).getTime();
        }
        if (isNaN(endT)) endT = isNaN(startT) ? Date.now() + 3600000 : startT + 3600000;

        // Check if custom drop-off location or address was provided in transportDetails
        const hasCustomDropOff = Boolean(t?.to || t?.dropOffAddress || t?.localName || t?.localAddress || t?.customGpsUrl);

        // Find trip destination hotel (fallback if no custom drop-off)
        const tripHotels = entries.filter((e) => e.type === 'hotel' && e.hotelDetails);
        const nextHotel =
          tripHotels.find((h) => new Date(h.hotelDetails!.checkInTime).getTime() >= (isNaN(startT) ? 0 : startT - 2 * 3600000)) ||
          tripHotels.find((h) => {
            const cin = new Date(h.hotelDetails!.checkInTime).getTime();
            const cout = new Date(h.hotelDetails!.checkOutTime).getTime();
            return !isNaN(startT) && startT >= cin && startT <= cout;
          }) ||
          tripHotels[0];

        const destinationName = t?.to || nextHotel?.hotelDetails?.name;
        const destinationAddress = t?.dropOffAddress || nextHotel?.hotelDetails?.address || '';
        const destinationCity = nextHotel?.hotelDetails?.city;

        const driverDetails = hasCustomDropOff
          ? {
              name: t?.to || entry.title,
              address: t?.dropOffAddress || '',
              city: destinationCity || '',
              checkInTime: new Date(startT).toISOString(),
              checkOutTime: new Date(endT).toISOString(),
              localName: t?.localName,
              localAddress: t?.localAddress,
              customGpsUrl: t?.customGpsUrl,
            }
          : nextHotel?.hotelDetails;

        const routeLabel = t?.from && t?.to ? `${t.from} ➔ ${t.to}` : (t?.to ? `To: ${t.to}` : (t?.from ? `From: ${t.from}` : (destinationName ? `To: ${destinationName}` : 'Transportation')));

        list.push({
          id: `${entry.id}-trans`,
          entryId: entry.id,
          entry,
          type: 'transport',
          title: entry.title,
          subtitle: entry.notes ? entry.notes.slice(0, 40) : routeLabel,
          location: destinationName ? (destinationCity ? `${destinationCity} • ${destinationName}` : destinationName) : (entry.notes || 'Transit'),
          startTime: isNaN(startT) ? Date.now() : startT,
          endTime: endT,
          metaColor: ENTRY_TYPE_META.transport?.color || '#45B7D1',
          metaIcon: 'car-outline',
          hotelDetails: driverDetails,
          targetHotelEntry: hasCustomDropOff ? undefined : nextHotel,
          documents: entry.documents,
        });
      } else {
        // Generic / other entry
        if (entry.date) {
          const [year, month, day] = entry.date.split('-').map(Number);
          const start = new Date(year, month - 1, day, 9, 0).getTime();
          list.push({
            id: `${entry.id}-other`,
            entryId: entry.id,
            entry,
            type: 'other',
            title: entry.title,
            subtitle: entry.notes ? entry.notes.slice(0, 40) : 'Scheduled item',
            location: entry.notes || '',
            startTime: start,
            endTime: start + 3600000 * 3,
            metaColor: ENTRY_TYPE_META[entry.type]?.color || colors.primary,
            metaIcon: ENTRY_TYPE_META[entry.type]?.icon || 'calendar-outline',
            documents: entry.documents,
          });
        }
      }
    });

    const ongoing: ProcessedEvent[] = [];
    const upcoming: ProcessedEvent[] = [];

    list.forEach((item) => {
      if (currentTime >= item.startTime && currentTime <= item.endTime) {
        ongoing.push(item);
      } else if (item.startTime > currentTime) {
        upcoming.push(item);
      }
    });

    // Sort ongoing: specific timed events (attraction, flight, transport) first, then stay
    ongoing.sort((a, b) => {
      const aIsStay = a.type === 'hotel_stay';
      const bIsStay = b.type === 'hotel_stay';
      if (aIsStay && !bIsStay) return 1;
      if (!aIsStay && bIsStay) return -1;
      return a.endTime - b.endTime;
    });

    // Sort upcoming: chronological by start time
    upcoming.sort((a, b) => a.startTime - b.startTime);

    return { ongoingEvents: ongoing, upcomingEvents: upcoming };
  }, [entries, currentTime, timeFormat, colors.primary]);

  // Determine what event to display
  const hasOngoing = ongoingEvents.length > 0;
  const hasUpcoming = upcomingEvents.length > 0;

  // Sync active tab if state changes
  useEffect(() => {
    if (!hasOngoing && hasUpcoming) {
      setActiveTab('upcoming');
    } else if (hasOngoing) {
      setActiveTab('ongoing');
    }
  }, [hasOngoing, hasUpcoming]);

  const activeEvent: ProcessedEvent | undefined =
    activeTab === 'ongoing' && hasOngoing
      ? ongoingEvents[0]
      : upcomingEvents[0];

  if (!activeEvent) {
    // If no events planned at all or trip completely ended
    return null;
  }

  const isOngoing = activeTab === 'ongoing' && hasOngoing;

  // Format countdown or remaining time string
  const getTimeBadgeInfo = () => {
    if (isOngoing) {
      const diff = activeEvent.endTime - currentTime;
      if (diff <= 0) return { label: 'Ending soon', isLive: true };
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days >= 1) {
        return { label: `${days}d ${hours % 24}h remaining`, isLive: true };
      }
      if (hours >= 1) {
        return { label: `${hours}h ${mins}m remaining`, isLive: true };
      }
      return { label: `${Math.max(1, mins)}m remaining`, isLive: true };
    } else {
      const diff = activeEvent.startTime - currentTime;
      if (diff <= 60000) return { label: 'Starts in < 1m', isLive: false };

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (diff < 1000 * 60 * 60) {
        return { label: `In ${mins}m`, isLive: false };
      }
      if (diff < 1000 * 60 * 60 * 24) {
        return { label: `In ${hours}h ${mins}m`, isLive: false };
      }
      if (days === 1) {
        return { label: `Tomorrow at ${formatTime(activeEvent.startTime, timeFormat)}`, isLive: false };
      }
      const dateLabel = new Date(activeEvent.startTime).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return { label: `${dateLabel} • ${formatTime(activeEvent.startTime, timeFormat)}`, isLive: false };
    }
  };

  const timeBadge = getTimeBadgeInfo();

  // Document action
  const handleOpenDoc = async (doc: { id: string; name: string; uri: string; type: string }) => {
    if (doc.type.toLowerCase().includes('image')) {
      setSelectedPreviewDoc(doc);
    } else {
      if (Platform.OS === 'android') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const FileSystem = require('expo-file-system/legacy');
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const IntentLauncher = require('expo-intent-launcher');
          const contentUri = await FileSystem.getContentUriAsync(doc.uri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1,
            type: doc.type,
          });
        } catch {
          Sharing.shareAsync(doc.uri);
        }
      } else {
        Sharing.shareAsync(doc.uri);
      }
    }
  };

  // Map Navigation
  const handleOpenMap = () => {
    if (!activeEvent.addressOrGps && !activeEvent.location) return;
    const target = activeEvent.addressOrGps || activeEvent.location;
    if (target.startsWith('http://') || target.startsWith('https://')) {
      Linking.openURL(target).catch(() => Alert.alert('Error', 'Could not open map link'));
    } else {
      const encoded = encodeURIComponent(target);
      const url = Platform.select({
        ios: `maps:0,0?q=${encoded}`,
        android: `geo:0,0?q=${encoded}`,
        default: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
      });
      Linking.openURL(url!).catch(() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
      });
    }
  };

  const hasDocuments = activeEvent.documents && activeEvent.documents.length > 0;
  const firstDoc = hasDocuments ? activeEvent.documents![0] : null;

  return (
    <View style={styles.outerContainer}>
      {sectionTitle ? (
        <Text
          style={[
            Typography.captionSemibold,
            {
              color: colors.textSecondary,
              marginHorizontal: 20,
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            },
          ]}
        >
          {sectionTitle}
        </Text>
      ) : null}
      <View style={[styles.wrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Top Bar: Selector Pill (if both ongoing and upcoming exist) + Live Status */}
      <View style={styles.topBar}>
        {hasOngoing && hasUpcoming ? (
          <View style={[styles.pillSwitcher, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[
                styles.switcherTab,
                activeTab === 'ongoing' && { backgroundColor: colors.primary + '25' },
              ]}
              onPress={() => setActiveTab('ongoing')}
            >
              <View style={[styles.liveDot, { backgroundColor: '#10B981' }]} />
              <Text
                style={[
                  Typography.captionSemibold,
                  { color: activeTab === 'ongoing' ? colors.primary : colors.textMuted },
                ]}
              >
                Happening Now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.switcherTab,
                activeTab === 'upcoming' && { backgroundColor: colors.primary + '25' },
              ]}
              onPress={() => setActiveTab('upcoming')}
            >
              <Ionicons
                name="time-outline"
                size={12}
                color={activeTab === 'upcoming' ? colors.primary : colors.textMuted}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  Typography.captionSemibold,
                  { color: activeTab === 'upcoming' ? colors.primary : colors.textMuted },
                ]}
              >
                Up Next
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.singleStatusRow}>
            {isOngoing ? (
              <View style={styles.badgeLiveContainer}>
                <View style={[styles.liveDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.badgeLiveText}>HAPPENING NOW</Text>
              </View>
            ) : (
              <View style={[styles.badgeUpcomingContainer, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="sparkles" size={11} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.badgeUpcomingText, { color: colors.primary }]}>UP NEXT</Text>
              </View>
            )}
          </View>
        )}

        {/* Time Badge (Remaining or Countdown) */}
        <View style={[styles.timeBadge, { backgroundColor: isOngoing ? '#10B98118' : colors.card }]}>
          <Text
            style={[
              Typography.captionSemibold,
              { color: isOngoing ? '#10B981' : colors.textSecondary },
            ]}
          >
            {timeBadge.label}
          </Text>
        </View>
      </View>

      {/* Main Content Area */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPressEntry?.(activeEvent.entryId)}
        style={styles.cardBody}
      >
        <View style={styles.contentRow}>
          {/* Leading Icon Avatar */}
          <View style={[styles.iconAvatar, { backgroundColor: activeEvent.metaColor + '20' }]}>
            <Ionicons name={activeEvent.metaIcon as any} size={24} color={activeEvent.metaColor} />
          </View>

          {/* Texts */}
          <View style={styles.textContainer}>
            {activeEvent.flightBadge ? (
              <View style={styles.flightBadgeRow}>
                <Text style={[Typography.h3, { color: colors.text, fontWeight: '700' }]}>
                  {activeEvent.flightBadge.from}
                </Text>
                <Ionicons
                  name="airplane"
                  size={15}
                  color={activeEvent.metaColor}
                  style={{ marginHorizontal: 8, transform: [{ rotate: '90deg' }] }}
                />
                <Text style={[Typography.h3, { color: colors.text, fontWeight: '700' }]}>
                  {activeEvent.flightBadge.to}
                </Text>
                {activeEvent.flightBadge.flightNo && (
                  <View style={[styles.flightNoPill, { backgroundColor: colors.inputBg }]}>
                    <Text style={[Typography.captionSemibold, { color: colors.textSecondary }]}>
                      {activeEvent.flightBadge.flightNo}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={[Typography.h3, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                {activeEvent.title}
              </Text>
            )}

            <Text style={[Typography.caption, { color: colors.textMuted, marginTop: 3 }]} numberOfLines={1}>
              {activeEvent.subtitle}
            </Text>

            {activeEvent.location ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={12} color={colors.textSecondary} style={{ marginRight: 3 }} />
                <Text style={[Typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                  {activeEvent.location}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Chevron */}
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.chevron} />
        </View>
      </TouchableOpacity>

      {/* Offline Quick Action Buttons */}
      <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
        {/* User Attached Documents by Name */}
        {activeEvent.documents && activeEvent.documents.length > 0 &&
          activeEvent.documents.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={[styles.actionBtn, { backgroundColor: colors.primary + '15', maxWidth: 180 }]}
              onPress={() => handleOpenDoc(doc)}
            >
              <Ionicons
                name={doc.type.toLowerCase().includes('image') ? 'image-outline' : 'document-text-outline'}
                size={14}
                color={colors.primary}
              />
              <Text
                style={[styles.actionBtnText, { color: colors.primary, flexShrink: 1 }]}
                numberOfLines={1}
              >
                {doc.name || 'Document'}
              </Text>
            </TouchableOpacity>
          ))}

        {/* Show Taxi Driver Button (for Hotels & Transport) */}
        {(activeEvent.hotelDetails || activeEvent.type === 'transport') && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#FF6B6B18' }]}
            onPress={() => setShowTaxiModal(true)}
          >
            <Ionicons name="car-outline" size={14} color="#FF6B6B" />
            <Text style={[styles.actionBtnText, { color: '#FF6B6B' }]}>Driver Card</Text>
          </TouchableOpacity>
        )}

        {/* View Details */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.card, marginLeft: 'auto' }]}
          onPress={() => onPressEntry?.(activeEvent.entryId)}
        >
          <Ionicons name="eye-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Details</Text>
        </TouchableOpacity>
      </View>

      {/* Taxi Driver Modal */}
      {(activeEvent.hotelDetails || activeEvent.type === 'transport') && (
        <TaxiDriverCardModal
          visible={showTaxiModal}
          onClose={() => setShowTaxiModal(false)}
          hotelName={activeEvent.hotelDetails?.name || activeEvent.entry.title || 'Taxi Destination'}
          hotelAddress={activeEvent.hotelDetails?.address || activeEvent.entry.notes || ''}
          hotelCity={activeEvent.hotelDetails?.city}
          localName={activeEvent.hotelDetails?.localName}
          localAddress={activeEvent.hotelDetails?.localAddress}
          customGpsUrl={activeEvent.hotelDetails?.customGpsUrl}
          countryOrCityHint={trip?.name}
          onSaveLocalDetails={async (localName, localAddress, customGpsUrl) => {
            if (activeEvent.entry.type === 'transport' && (activeEvent.entry.transportDetails?.to || activeEvent.entry.transportDetails?.dropOffAddress || activeEvent.entry.transportDetails?.localName || activeEvent.entry.transportDetails?.localAddress || activeEvent.entry.transportDetails?.customGpsUrl || !activeEvent.targetHotelEntry)) {
              const updated = {
                ...activeEvent.entry,
                transportDetails: {
                  startTime: activeEvent.entry.transportDetails?.startTime || new Date().toISOString(),
                  endTime: activeEvent.entry.transportDetails?.endTime || new Date().toISOString(),
                  ...activeEvent.entry.transportDetails,
                  localName,
                  localAddress,
                  customGpsUrl,
                },
              };
              await updateEntry(updated);
            } else {
              const entryToUpdate = activeEvent.targetHotelEntry || activeEvent.entry;
              if (entryToUpdate.hotelDetails) {
                const updated = {
                  ...entryToUpdate,
                  hotelDetails: {
                    ...entryToUpdate.hotelDetails,
                    localName,
                    localAddress,
                    customGpsUrl,
                  },
                };
                await updateEntry(updated);
              }
            }
          }}
          theme={theme}
        />
      )}

      {/* Image Preview Modal */}
      {selectedPreviewDoc && (
        <Modal
          visible={!!selectedPreviewDoc}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedPreviewDoc(null)}
        >
          <SafeAreaView style={styles.imageModalContainer}>
            <View style={styles.imageModalHeader}>
              <TouchableOpacity
                onPress={() => setSelectedPreviewDoc(null)}
                style={styles.imageModalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.imageModalTitle} numberOfLines={1}>
                {selectedPreviewDoc.name}
              </Text>
              <TouchableOpacity
                onPress={() => Sharing.shareAsync(selectedPreviewDoc.uri)}
                style={styles.imageModalShareBtn}
              >
                <Ionicons name="share-outline" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.imageModalBody}>
              <Image
                source={{ uri: selectedPreviewDoc.uri }}
                style={styles.fullPreviewImage}
                resizeMode="contain"
              />
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    marginBottom: 4,
  },
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  pillSwitcher: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 3,
  },
  switcherTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  singleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeLiveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98118',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeLiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.6,
  },
  badgeUpcomingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeUpcomingText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  timeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  flightBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flightNoPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  chevron: {
    marginLeft: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  imageModalCloseBtn: {
    padding: 6,
  },
  imageModalShareBtn: {
    padding: 6,
  },
  imageModalTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  imageModalBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPreviewImage: {
    width: width,
    height: '100%',
  },
});
