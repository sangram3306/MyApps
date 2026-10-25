import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
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

interface UpNextTickerProps {
  trip?: Trip | null;
  entries: ItineraryEntry[];
  theme: 'light' | 'dark';
  timeFormat?: '12h' | '24h';
  onPressEntry?: (entryId: string) => void;
  maxWidth?: number;
  style?: any;
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
  marqueeText: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function UpNextTicker({
  trip,
  entries,
  theme,
  timeFormat = '12h',
  onPressEntry,
  maxWidth,
  style,
}: UpNextTickerProps) {
  const colors = Colors[theme];
  const { updateEntry } = useApp();

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showQuickSheet, setShowQuickSheet] = useState(false);
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);
  const [showTaxiModal, setShowTaxiModal] = useState(false);
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<{ id: string; name: string; uri: string; type: string } | null>(null);

  // ScrollView & marquee tracking
  const scrollViewRef = useRef<any>(null);
  const scrollXPos = useRef(0);
  const isInteracting = useRef(false);
  const resumeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialDelayTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const singleTextWidthRef = useRef(0);

  const [singleTextWidth, setSingleTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Update ticker time every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Process all trip events
  const { activeEvent, isOngoing, allEvents, upcomingEvents } = useMemo(() => {
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
            const startT = isNaN(cDep) ? depTime : cDep;
            const endT = isNaN(cArr) ? startT + 7200000 : cArr;
            const flightTitle = conn.flightName ? `${conn.flightName} (${conn.from}➔${conn.to})` : `${conn.from}➔${conn.to}`;
            list.push({
              id: `${entry.id}-conn-${idx}`,
              entryId: entry.id,
              entry,
              type: 'flight',
              title: flightTitle,
              subtitle: conn.departureTerminal ? `Term ${conn.departureTerminal}` : `Leg ${idx + 1}`,
              location: `${conn.from} ➔ ${conn.to}`,
              startTime: startT,
              endTime: endT,
              metaColor: ENTRY_TYPE_META.flight?.color || '#6C63FF',
              metaIcon: 'airplane',
              flightBadge: { from: conn.from, to: conn.to, flightNo: conn.flightName },
              documents: entry.documents,
              marqueeText: `✈️ ${flightTitle} • Dep: ${formatTime(startT, timeFormat)} • Term: ${conn.departureTerminal || 'TBD'}`,
            });
          });
        } else {
          const startT = isNaN(depTime) ? Date.now() : depTime;
          const endT = isNaN(arrTime) ? startT + 7200000 : arrTime;
          const flightTitle = f.flightName ? `${f.from} ➔ ${f.to} (${f.flightName})` : `${f.from} ➔ ${f.to}`;
          list.push({
            id: `${entry.id}-flight`,
            entryId: entry.id,
            entry,
            type: 'flight',
            title: flightTitle,
            subtitle: f.departureTerminal ? `Departing Terminal ${f.departureTerminal}` : 'Flight Departure',
            location: `${f.from} ➔ ${f.to}`,
            startTime: startT,
            endTime: endT,
            metaColor: ENTRY_TYPE_META.flight?.color || '#6C63FF',
            metaIcon: 'airplane',
            flightBadge: { from: f.from, to: f.to, flightNo: f.flightName },
            documents: entry.documents,
            marqueeText: `✈️ ${flightTitle} • Dep: ${formatTime(startT, timeFormat)} • Term: ${f.departureTerminal || 'TBD'}`,
          });
        }
      } else if (entry.type === 'hotel' && entry.hotelDetails) {
        const h = entry.hotelDetails;
        const checkIn = new Date(h.checkInTime).getTime();
        const checkOut = new Date(h.checkOutTime).getTime();

        // 1. Check-in event (only relevant when check-in has not passed yet)
        if (currentTime < checkIn) {
          list.push({
            id: `${entry.id}-checkin`,
            entryId: entry.id,
            entry,
            type: 'hotel_checkin',
            title: `Check-in: ${h.name}`,
            subtitle: `Starts at ${formatTime(checkIn, timeFormat)}`,
            location: h.city ? `${h.city} • ${h.address}` : h.address,
            startTime: checkIn,
            endTime: checkIn + 3600000,
            metaColor: ENTRY_TYPE_META.hotel?.color || '#FF6B6B',
            metaIcon: 'bed',
            hotelDetails: h,
            documents: entry.documents,
            addressOrGps: h.customGpsUrl || h.address,
            marqueeText: `🏨 Check-in: ${h.name} • ${formatTime(checkIn, timeFormat)} • ${h.city || ''}`,
          });
        }

        // 2. Ongoing stay (when currently between check-in and check-out)
        if (currentTime >= checkIn && currentTime <= checkOut) {
          list.push({
            id: `${entry.id}-stay`,
            entryId: entry.id,
            entry,
            type: 'hotel_stay',
            title: `Stay: ${h.name}`,
            subtitle: `Check-out: ${formatTime(checkOut, timeFormat)}`,
            location: h.city ? `${h.city} • ${h.address}` : h.address,
            startTime: checkIn,
            endTime: checkOut,
            metaColor: ENTRY_TYPE_META.hotel?.color || '#FF6B6B',
            metaIcon: 'bed',
            hotelDetails: h,
            documents: entry.documents,
            addressOrGps: h.customGpsUrl || h.address,
            marqueeText: `🏨 Staying at ${h.name} • Out: ${new Date(checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${formatTime(checkOut, timeFormat)}`,
          });
        }

        // 3. Check-out event (only when check-in has passed and check-out is upcoming)
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
            marqueeText: `🏨 Check-out: ${h.name} • ${formatTime(checkOut, timeFormat)}`,
          });
        }
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

        const routeLabel = t?.from && t?.to ? `${t.from} ➔ ${t.to}` : (t?.to ? `To: ${t.to}` : (t?.from ? `From: ${t.from}` : (destinationName ? `To: ${destinationName}` : 'Transport')));

        list.push({
          id: `${entry.id}-trans`,
          entryId: entry.id,
          entry,
          type: 'transport',
          title: entry.title,
          subtitle: entry.notes ? entry.notes.slice(0, 30) : routeLabel,
          location: destinationName ? (destinationCity ? `${destinationCity} • ${destinationName}` : destinationName) : (entry.notes || 'Transit'),
          startTime: isNaN(startT) ? Date.now() : startT,
          endTime: endT,
          metaColor: ENTRY_TYPE_META.transport?.color || '#45B7D1',
          metaIcon: 'car-outline',
          hotelDetails: driverDetails,
          targetHotelEntry: hasCustomDropOff ? undefined : nextHotel,
          documents: entry.documents,
          marqueeText: `🚗 ${entry.title}${t?.from && t?.to ? ` (${t.from} ➔ ${t.to})` : ''} • ${formatTime(startT, timeFormat)}${destinationName && !(t?.from && t?.to) ? ` ➔ ${destinationName}` : ''}`,
        });
      } else if (entry.type === 'attraction') {
        const a = entry.attractionDetails;
        let startT = NaN;
        let endT = NaN;
        if (a?.startTime) startT = new Date(a.startTime).getTime();
        if (a?.endTime) endT = new Date(a.endTime).getTime();
        if (isNaN(startT) && entry.date) {
          const [year, month, day] = entry.date.split('-').map(Number);
          startT = new Date(year, month - 1, day, 10, 0).getTime();
        }
        if (isNaN(endT)) endT = isNaN(startT) ? Date.now() + 7200000 : startT + 7200000;
        list.push({
          id: `${entry.id}-attr`,
          entryId: entry.id,
          entry,
          type: 'attraction',
          title: entry.title,
          subtitle: entry.notes ? entry.notes.slice(0, 30) : 'Attraction',
          location: entry.notes || 'Activity',
          startTime: isNaN(startT) ? Date.now() : startT,
          endTime: endT,
          metaColor: ENTRY_TYPE_META.attraction?.color || '#4ECDC4',
          metaIcon: 'ticket-outline',
          documents: entry.documents,
          addressOrGps: a?.link,
          marqueeText: `🎟️ ${entry.title} • ${formatTime(startT, timeFormat)}`,
        });
      } else {
        if (entry.date) {
          const [year, month, day] = entry.date.split('-').map(Number);
          const startT = new Date(year, month - 1, day, 9, 0).getTime();
          list.push({
            id: `${entry.id}-other`,
            entryId: entry.id,
            entry,
            type: 'other',
            title: entry.title,
            subtitle: entry.notes ? entry.notes.slice(0, 30) : 'Scheduled item',
            location: entry.notes || '',
            startTime: startT,
            endTime: startT + 3600000 * 2,
            metaColor: ENTRY_TYPE_META[entry.type]?.color || colors.primary,
            metaIcon: ENTRY_TYPE_META[entry.type]?.icon || 'calendar-outline',
            documents: entry.documents,
            marqueeText: `📅 ${entry.title} • ${formatTime(startT, timeFormat)}`,
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

    ongoing.sort((a, b) => {
      const aIsStay = a.type === 'hotel_stay';
      const bIsStay = b.type === 'hotel_stay';
      if (aIsStay && !bIsStay) return 1;
      if (!aIsStay && bIsStay) return -1;
      return a.endTime - b.endTime;
    });

    upcoming.sort((a, b) => a.startTime - b.startTime);

    const allEventsList = [...ongoing, ...upcoming.slice(0, 6)];

    return {
      activeEvent: allEventsList[0],
      isOngoing: ongoing.length > 0,
      allEvents: allEventsList,
      upcomingEvents: upcoming,
    };
  }, [entries, currentTime, timeFormat, colors.primary]);


  // Reset selected index when opening modal
  useEffect(() => {
    if (showQuickSheet) {
      setSelectedEventIndex(0);
    }
  }, [showQuickSheet]);

  if (!activeEvent) {
    return null;
  }

  // Format countdown or remaining time for any event
  const getTimeBadgeForEvent = (evt: ProcessedEvent) => {
    const isEventOngoing = currentTime >= evt.startTime && currentTime <= evt.endTime;
    if (isEventOngoing) {
      const diff = evt.endTime - currentTime;
      if (diff <= 0) return 'Ending soon';
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days >= 1) return `${days}d ${hours % 24}h left`;
      if (hours >= 1) return `${hours}h ${mins}m left`;
      return `${Math.max(1, mins)}m left`;
    } else {
      const diff = evt.startTime - currentTime;
      if (diff <= 60000) return '< 1m';
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (diff < 1000 * 60 * 60) return `In ${mins}m`;
      if (diff < 1000 * 60 * 60 * 24) return `In ${hours}h ${mins}m`;
      if (days === 1) return 'Tomorrow';
      return `In ${days}d`;
    }
  };

  const activeTimeBadge = getTimeBadgeForEvent(activeEvent);

  // Full composite ticker text: mentions immediate event + previews next upcoming leg/transport
  const displayText = useMemo(() => {
    if (!activeEvent) return '';
    let text = `${activeEvent.marqueeText}  •  ${activeTimeBadge}`;
    if (upcomingEvents.length > 1) {
      const nextOne = isOngoing ? upcomingEvents[0] : upcomingEvents[1];
      if (nextOne) {
        text += `   ➔   Then: ${nextOne.title} (${formatTime(nextOne.startTime, timeFormat)})`;
      }
    }
    return text;
  }, [activeEvent, activeTimeBadge, upcomingEvents, isOngoing, timeFormat]);

  // Reset marquee position when event or displayText changes
  useEffect(() => {
    scrollXPos.current = 0;
    isInteracting.current = true; // Hold at 0 during initial delay
    scrollViewRef.current?.scrollTo({ x: 0, animated: false });

    if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
    if (initialDelayTimeout.current) clearTimeout(initialDelayTimeout.current);

    // Initial pause of 1.8 seconds so user reads the start of the event
    initialDelayTimeout.current = setTimeout(() => {
      isInteracting.current = false;
    }, 1800);

    return () => {
      if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
      if (initialDelayTimeout.current) clearTimeout(initialDelayTimeout.current);
    };
  }, [displayText]);

  // Smooth continuous auto-scroll ticker with seamless loop
  useEffect(() => {
    const SEPARATOR_WIDTH = 44;
    let animId: number;
    let lastTime = Date.now();

    const step = () => {
      const now = Date.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const singleW = singleTextWidthRef.current;
      if (
        !isInteracting.current &&
        singleW > 0 &&
        containerWidth > 0 &&
        singleW > containerWidth
      ) {
        const loopWidth = singleW + SEPARATOR_WIDTH;
        const speed = 32; // 32 pixels/second is clear and readable
        scrollXPos.current += speed * dt;

        if (scrollXPos.current >= loopWidth) {
          scrollXPos.current -= loopWidth;
        }

        scrollViewRef.current?.scrollTo({
          x: scrollXPos.current,
          animated: false,
        });
      }

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [containerWidth, singleTextWidth]);

  // Touch gesture & manual scroll handlers
  const scheduleResume = () => {
    if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
    resumeTimeout.current = setTimeout(() => {
      isInteracting.current = false;
    }, 2500); // 2.5s pause after manual user drag before auto-scroll resumes
  };

  const handleScroll = (e: any) => {
    const x = e.nativeEvent?.contentOffset?.x ?? 0;
    if (isInteracting.current) {
      scrollXPos.current = x;
    }
  };

  const handleScrollBeginDrag = () => {
    isInteracting.current = true;
    if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
  };

  const handleScrollEndDrag = (e: any) => {
    const x = e.nativeEvent?.contentOffset?.x ?? 0;
    scrollXPos.current = x;
    scheduleResume();
  };

  const handleMomentumScrollBegin = () => {
    isInteracting.current = true;
    if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
  };

  const handleMomentumScrollEnd = (e: any) => {
    const x = e.nativeEvent?.contentOffset?.x ?? 0;
    scrollXPos.current = x;
    scheduleResume();
  };


  // The event currently displayed in the bottom sheet modal
  const currentSheetEvent = allEvents[selectedEventIndex] || activeEvent;
  const isSheetEventOngoing = currentTime >= currentSheetEvent.startTime && currentTime <= currentSheetEvent.endTime;
  const sheetTimeBadge = getTimeBadgeForEvent(currentSheetEvent);

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
    if (!currentSheetEvent.addressOrGps && !currentSheetEvent.location) return;
    const target = currentSheetEvent.addressOrGps || currentSheetEvent.location;
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

  return (
    <>
      {/* Sleek One-Liner Pill Ticker */}
      <View
        style={[
          styles.tickerContainer,
          maxWidth ? { maxWidth } : { width: '100%' },
          {
            backgroundColor: isOngoing ? '#10B98116' : colors.primary + (theme === 'dark' ? '20' : '12'),
            borderColor: isOngoing ? '#10B98140' : colors.primary + '35',
          },
          style,
        ]}
      >
        {/* Leading Static "UP NEXT" Badge with Dot */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowQuickSheet(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
          style={styles.staticBadge}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOngoing ? '#10B981' : colors.primary },
            ]}
          />
          <Text
            style={[
              styles.staticBadgeText,
              { color: isOngoing ? '#10B981' : colors.primary },
            ]}
          >
            UP NEXT
          </Text>
        </TouchableOpacity>

        <View
          style={[
            styles.staticBadgeDivider,
            { backgroundColor: isOngoing ? '#10B98140' : colors.primary + '35' },
          ]}
        />

        {/* Scrollable Marquee Area (Supports both auto-scroll and manual swipe) */}
        <View
          style={styles.marqueeWindow}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0 && Math.abs(w - containerWidth) > 1) {
              setContainerWidth(w);
            }
          }}
        >
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={singleTextWidth > containerWidth}
            contentContainerStyle={styles.scrollContent}
            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
            onMomentumScrollBegin={handleMomentumScrollBegin}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={16}
            nestedScrollEnabled={true}
          >
            <Pressable
              onPress={() => setShowQuickSheet(true)}
              style={styles.pressableRow}
            >
              {/* Primary Item */}
              <View
                style={styles.singleItem}
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  if (w > 0 && Math.abs(w - singleTextWidth) > 1) {
                    singleTextWidthRef.current = w;
                    setSingleTextWidth(w);
                  }
                }}
              >
                <Text style={[styles.tickerText, { color: colors.text }]}>
                  {displayText}
                </Text>
              </View>

              {/* Duplicate Copies for Infinite Marquee if overflowing */}
              {singleTextWidth > containerWidth && (
                <>
                  <View style={styles.separatorContainer}>
                    <Text style={[styles.tickerText, { color: colors.textSecondary }]}>
                      •
                    </Text>
                  </View>
                  <View style={styles.singleItem}>
                    <Text style={[styles.tickerText, { color: colors.text }]}>
                      {displayText}
                    </Text>
                  </View>
                  <View style={styles.separatorContainer}>
                    <Text style={[styles.tickerText, { color: colors.textSecondary }]}>
                      •
                    </Text>
                  </View>
                  <View style={styles.singleItem}>
                    <Text style={[styles.tickerText, { color: colors.text }]}>
                      {displayText}
                    </Text>
                  </View>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>

        {/* Trailing tiny chevron */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowQuickSheet(true)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          style={styles.chevronButton}
        >
          <Ionicons name="chevron-forward" size={12} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Quick Action Bottom Sheet */}
      <Modal
        visible={showQuickSheet}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQuickSheet(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowQuickSheet(false)}
        >
          <Pressable
            style={[
              styles.quickSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <View style={[styles.handleBar, { backgroundColor: colors.border }]} />

            {/* Upcoming Queue Chips (e.g. Flight ➔ Airport Taxi ➔ Hotel) */}
            {allEvents.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.eventChipScroll}
                contentContainerStyle={{ gap: 8 }}
              >
                {allEvents.map((evt, idx) => {
                  const isSelected = idx === selectedEventIndex;
                  return (
                    <TouchableOpacity
                      key={evt.id}
                      activeOpacity={0.75}
                      style={[
                        styles.eventChip,
                        isSelected
                          ? { backgroundColor: evt.metaColor + '22', borderColor: evt.metaColor }
                          : { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                      onPress={() => setSelectedEventIndex(idx)}
                    >
                      <Ionicons
                        name={evt.metaIcon as any}
                        size={12}
                        color={isSelected ? evt.metaColor : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.eventChipText,
                          {
                            color: isSelected ? colors.text : colors.textSecondary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {evt.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Header Status & Countdown */}
            <View style={styles.sheetTopRow}>
              <View
                style={[
                  styles.badgeContainer,
                  { backgroundColor: isSheetEventOngoing ? '#10B98118' : colors.primary + '18' },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isSheetEventOngoing ? '#10B981' : colors.primary, marginRight: 5 },
                  ]}
                />
                <Text
                  style={[
                    styles.badgeText,
                    { color: isSheetEventOngoing ? '#10B981' : colors.primary },
                  ]}
                >
                  {isSheetEventOngoing ? 'HAPPENING NOW' : 'UP NEXT'}
                </Text>
              </View>

              <View style={[styles.sheetTimeBadge, { backgroundColor: colors.card }]}>
                <Ionicons name="time-outline" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[Typography.captionSemibold, { color: colors.textSecondary }]}>
                  {sheetTimeBadge}
                </Text>
              </View>
            </View>

            {/* Event Title & Subtitle */}
            <View style={styles.sheetContent}>
              <Text style={[Typography.h3, { color: colors.text, fontWeight: '700' }]} numberOfLines={2}>
                {currentSheetEvent.title}
              </Text>
              <Text style={[Typography.caption, { color: colors.textMuted, marginTop: 4 }]} numberOfLines={2}>
                {currentSheetEvent.subtitle}
              </Text>
              {currentSheetEvent.location ? (
                <View style={styles.sheetLocationRow}>
                  <Ionicons name="location-sharp" size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text style={[Typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                    {currentSheetEvent.location}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* 1-Tap Offline Quick Actions */}
            <View style={[styles.sheetActionRow, { borderTopColor: colors.border }]}>
              {/* User Attached Documents by Name */}
              {currentSheetEvent.documents && currentSheetEvent.documents.length > 0 &&
                currentSheetEvent.documents.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={[styles.sheetBtn, { backgroundColor: colors.primary + '15', maxWidth: 180 }]}
                    onPress={() => {
                      setShowQuickSheet(false);
                      handleOpenDoc(doc);
                    }}
                  >
                    <Ionicons
                      name={doc.type.toLowerCase().includes('image') ? 'image-outline' : 'document-text-outline'}
                      size={15}
                      color={colors.primary}
                    />
                    <Text
                      style={[styles.sheetBtnText, { color: colors.primary, flexShrink: 1 }]}
                      numberOfLines={1}
                    >
                      {doc.name || 'Document'}
                    </Text>
                  </TouchableOpacity>
                ))}

              {/* Show Taxi Driver for Hotels & Transport */}
              {(currentSheetEvent.hotelDetails || currentSheetEvent.type === 'transport') && (
                <TouchableOpacity
                  style={[styles.sheetBtn, { backgroundColor: '#FF6B6B18' }]}
                  onPress={() => {
                    setShowQuickSheet(false);
                    setShowTaxiModal(true);
                  }}
                >
                  <Ionicons name="car-outline" size={15} color="#FF6B6B" />
                  <Text style={[styles.sheetBtnText, { color: '#FF6B6B' }]}>Driver Card</Text>
                </TouchableOpacity>
              )}

              {/* View / Edit Details */}
              <TouchableOpacity
                style={[styles.sheetBtn, { backgroundColor: colors.card, marginLeft: 'auto' }]}
                onPress={() => {
                  setShowQuickSheet(false);
                  onPressEntry?.(currentSheetEvent.entryId);
                }}
              >
                <Ionicons name="eye-outline" size={15} color={colors.textSecondary} />
                <Text style={[styles.sheetBtnText, { color: colors.textSecondary }]}>Details</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Taxi Driver Card Modal */}
      {(currentSheetEvent.hotelDetails || currentSheetEvent.type === 'transport') && (
        <TaxiDriverCardModal
          visible={showTaxiModal}
          onClose={() => setShowTaxiModal(false)}
          hotelName={currentSheetEvent.hotelDetails?.name || currentSheetEvent.entry.title || 'Taxi Destination'}
          hotelAddress={currentSheetEvent.hotelDetails?.address || currentSheetEvent.entry.notes || ''}
          hotelCity={currentSheetEvent.hotelDetails?.city}
          localName={currentSheetEvent.hotelDetails?.localName}
          localAddress={currentSheetEvent.hotelDetails?.localAddress}
          customGpsUrl={currentSheetEvent.hotelDetails?.customGpsUrl}
          countryOrCityHint={trip?.name}
          onSaveLocalDetails={async (localName, localAddress, customGpsUrl) => {
            if (currentSheetEvent.entry.type === 'transport' && (currentSheetEvent.entry.transportDetails?.to || currentSheetEvent.entry.transportDetails?.dropOffAddress || currentSheetEvent.entry.transportDetails?.localName || currentSheetEvent.entry.transportDetails?.localAddress || currentSheetEvent.entry.transportDetails?.customGpsUrl || !currentSheetEvent.targetHotelEntry)) {
              const updated = {
                ...currentSheetEvent.entry,
                transportDetails: {
                  startTime: currentSheetEvent.entry.transportDetails?.startTime || new Date().toISOString(),
                  endTime: currentSheetEvent.entry.transportDetails?.endTime || new Date().toISOString(),
                  ...currentSheetEvent.entry.transportDetails,
                  localName,
                  localAddress,
                  customGpsUrl,
                },
              };
              await updateEntry(updated);
            } else {
              const entryToUpdate = currentSheetEvent.targetHotelEntry || currentSheetEvent.entry;
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
    </>
  );
}

const styles = StyleSheet.create({
  tickerContainer: {
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  staticBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 6,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  staticBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  staticBadgeDivider: {
    width: 1,
    height: 12,
    marginRight: 7,
  },
  marqueeWindow: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scrollContent: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  pressableRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  singleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  separatorContainer: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chevronButton: {
    marginLeft: 4,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  tickerText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  quickSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  eventChipScroll: {
    marginBottom: 12,
  },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  eventChipText: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
  sheetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  sheetTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sheetContent: {
    marginBottom: 18,
  },
  sheetLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  sheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  sheetBtnText: {
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
    width: SCREEN_WIDTH,
    height: '100%',
  },
});
