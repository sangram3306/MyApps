import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';
import { Colors } from '../../src/theme/colors';
import { Typography } from '../../src/theme/typography';
import { ItineraryEntry } from '../../src/types';
import TimelineItem from '../../src/components/TimelineItem';
import FAB from '../../src/components/FAB';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { getCityImages, saveCityImages, getEntryImages, saveEntryImages } from '../../src/storage/asyncStorage';

export interface VirtualItineraryEntry {
  entry: ItineraryEntry;
  virtualType?: 'check-in' | 'check-out' | 'city-header';
  startTime: number;
  cityName?: string;
  blockType?: 'city' | 'travel';
  cityItemCount?: number;
  cityStartDateLabel?: string;
  cityEndDateLabel?: string;
  isOngoingNow?: boolean;
}

export interface OngoingHotelMeta {
  id: string;
  name: string;
  city: string;
  checkInLabel: string;
  checkOutLabel: string;
  checkInDateTime: string;   // e.g. "Nov 15, 14:00"
  checkOutDateTime: string;  // e.g. "Nov 19, 11:00"
}

export default function ItineraryScreen() {
  const { state, getActiveTrip, getEntriesForActiveTrip, deleteEntry } = useApp();
  const router = useRouter();
  const colors = Colors[state.settings.theme];

  const activeTrip = getActiveTrip();
  const entries = getEntriesForActiveTrip();

  const [collapsedHotels, setCollapsedHotels] = useState<Set<string>>(new Set());
  const [collapsedCities, setCollapsedCities] = useState<Set<string>>(new Set());
  const [showPrices, setShowPrices] = useState(true);
  const [cityImageMap, setCityImageMap] = useState<Record<string, string>>({});
  const [entryImageMap, setEntryImageMap] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      getCityImages().then(setCityImageMap);
      getEntryImages().then(setEntryImageMap);
    }, [])
  );

  const launchCityPicker = async (tripId: string, cityName: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const key = `${tripId}::${cityName}`;
      const fileName = `city_img_${encodeURIComponent(key)}.jpg`;
      const newUri = FileSystem.documentDirectory + fileName;

      try {
        await FileSystem.copyAsync({ from: asset.uri, to: newUri });
        const updated = { ...cityImageMap, [key]: newUri };
        setCityImageMap(updated);
        await saveCityImages(updated);
      } catch (err) {
        console.error('Failed to save city image', err);
      }
    }
  };

  const handlePickCityImage = useCallback(async (cityName: string) => {
    const tripId = activeTrip?.id;
    if (!tripId) return;

    const key = `${tripId}::${cityName}`;
    if (cityImageMap[key]) {
      Alert.alert(
        'Cover Photo',
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Remove Photo', 
            style: 'destructive', 
            onPress: async () => {
              const updated = { ...cityImageMap };
              delete updated[key];
              setCityImageMap(updated);
              await saveCityImages(updated);
            }
          },
          { text: 'Change Photo', onPress: () => launchCityPicker(tripId, cityName) }
        ]
      );
    } else {
      launchCityPicker(tripId, cityName);
    }
  }, [activeTrip, cityImageMap]);

  const toggleCollapseHotel = (hotelId: string) => {
    setCollapsedHotels(prev => {
      const next = new Set(prev);
      if (next.has(hotelId)) next.delete(hotelId);
      else next.add(hotelId);
      return next;
    });
  };

  const toggleCollapseCity = (cityName: string) => {
    setCollapsedCities(prev => {
      const next = new Set(prev);
      if (next.has(cityName)) next.delete(cityName);
      else next.add(cityName);
      return next;
    });
  };

  const getDateLabel = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const monthStr = date.toLocaleDateString('en-US', { month: 'short' });
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    return `${weekday}\n${monthStr}\n${date.getDate()}`;
  };

  const getShortDateLabel = (isoTime: string) => {
    const d = new Date(isoTime);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getShortDateTime = (isoTime: string) => {
    const d = new Date(isoTime);
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${date}, ${time}`;
  };

  const getEntryStartTime = (entry: ItineraryEntry) => {
    if (entry.type === 'flight' && entry.flightDetails) return new Date(entry.flightDetails.departureTime).getTime();
    if (entry.type === 'hotel' && entry.hotelDetails) return new Date(entry.hotelDetails.checkInTime).getTime();
    if (entry.type === 'attraction' && entry.attractionDetails) return new Date(entry.attractionDetails.startTime).getTime();
    if (entry.type === 'transport' && entry.transportDetails) return new Date(entry.transportDetails.startTime).getTime();
    const [year, month, day] = entry.date.split('-').map(Number);
    return new Date(year, month - 1, day).getTime();
  };

  const getEntryEndTime = (vEntry: VirtualItineraryEntry) => {
    if (vEntry.entry.type === 'flight' && vEntry.entry.flightDetails) return new Date(vEntry.entry.flightDetails.arrivalTime).getTime();
    if (vEntry.entry.type === 'attraction' && vEntry.entry.attractionDetails) return new Date(vEntry.entry.attractionDetails.endTime).getTime();
    if (vEntry.entry.type === 'transport' && vEntry.entry.transportDetails) return new Date(vEntry.entry.transportDetails.endTime).getTime();
    return vEntry.startTime;
  };

  // --- Flatten entries into virtual entries ---
  let rawVirtualEntries: VirtualItineraryEntry[] = [];
  entries.forEach(entry => {
    if (entry.type === 'hotel' && entry.hotelDetails) {
      rawVirtualEntries.push({ entry, virtualType: 'check-in', startTime: new Date(entry.hotelDetails.checkInTime).getTime() });
      rawVirtualEntries.push({ entry, virtualType: 'check-out', startTime: new Date(entry.hotelDetails.checkOutTime).getTime() });
    } else {
      rawVirtualEntries.push({ entry, startTime: getEntryStartTime(entry) });
    }
  });
  // --- Smart Sorting for Check-ins ---
  // If a hotel check-in happens on the same day as a flight arrival or transport dropoff,
  // but the official check-in time is earlier, push the check-in time to be right after
  // the last travel arrangement on that day so it sorts chronologically.
  rawVirtualEntries.forEach(vEntry => {
    if (vEntry.virtualType === 'check-in') {
      const checkInDateStr = new Date(vEntry.startTime).toDateString();
      let latestTravelTimeOnSameDay = 0;

      rawVirtualEntries.forEach(other => {
        if (other.entry.id === vEntry.entry.id) return; // skip self
        let travelEndTime = 0;
        if (other.entry.type === 'flight' && other.entry.flightDetails) {
          travelEndTime = new Date(other.entry.flightDetails.arrivalTime).getTime();
        } else if (other.entry.type === 'transport' && other.entry.transportDetails) {
          travelEndTime = new Date(other.entry.transportDetails.endTime).getTime();
        }
        
        if (travelEndTime > 0) {
          const travelDateStr = new Date(travelEndTime).toDateString();
          if (travelDateStr === checkInDateStr && travelEndTime > latestTravelTimeOnSameDay) {
            latestTravelTimeOnSameDay = travelEndTime;
          }
        }
      });
      
      if (latestTravelTimeOnSameDay > vEntry.startTime) {
        // Push check-in to 1 minute after the last travel event
        vEntry.startTime = latestTravelTimeOnSameDay + 60000;
      }
    }
  });

  rawVirtualEntries.sort((a, b) => a.startTime - b.startTime);

  // --- Infer Cities and Inject City Headers ---
  let currentCity = 'Unknown City';
  const virtualEntries: VirtualItineraryEntry[] = [];
  
  // Track continuous city blocks
  let currentCityBlock: { blockName: string; cityName: string; startTime: number; endTime: number; itemCount: number } | null = null;
  const cityBlocks: Array<{ blockName: string; cityName: string; startTime: number; endTime: number; itemCount: number }> = [];

  rawVirtualEntries.forEach(vEntry => {
    if (vEntry.entry.type === 'flight' && vEntry.entry.flightDetails) {
      // Flight breaks the current city block, but we don't create a header for flights
      if (currentCityBlock) {
        cityBlocks.push(currentCityBlock);
        currentCityBlock = null;
      }
      // Update current city for subsequent city blocks
      currentCity = vEntry.entry.flightDetails.to;
      
      // We don't set vEntry.cityName so it won't be hidden when a city is collapsed
      return; 
    }

    if (vEntry.entry.type === 'hotel' && vEntry.entry.hotelDetails && vEntry.entry.hotelDetails.city) {
      currentCity = vEntry.entry.hotelDetails.city;
    }
    const blockName = currentCity;

    if (!currentCityBlock || currentCityBlock.blockName !== blockName) {
      if (currentCityBlock) {
        cityBlocks.push(currentCityBlock);
      }
      currentCityBlock = {
        blockName,
        cityName: currentCity,
        startTime: vEntry.startTime,
        endTime: vEntry.startTime,
        itemCount: 0
      };
    }
    
    currentCityBlock.endTime = Math.max(currentCityBlock.endTime, getEntryEndTime(vEntry));
    // Don't count check-outs as a separate activity item
    if (vEntry.virtualType !== 'check-out') {
      currentCityBlock.itemCount++;
    }
    
    vEntry.cityName = currentCityBlock.blockName; // Use blockName as the collapse ID
  });

  if (currentCityBlock) {
    cityBlocks.push(currentCityBlock);
  }

  // Inject city headers
  cityBlocks.forEach((block, index) => {
    if (block.cityName === 'Unknown City') return; // Skip if no real city is known yet

    const itemsInBlock = rawVirtualEntries.filter(v => v.cityName === block.blockName && v.startTime >= block.startTime && v.startTime <= block.endTime);
    const hasOnlyTransport = itemsInBlock.length > 0 && itemsInBlock.every(v => v.entry.type === 'transport');
    
    if (hasOnlyTransport || itemsInBlock.length === 0) {
      itemsInBlock.forEach(v => v.cityName = undefined);
      return; // Skip injecting the city header
    }

    virtualEntries.push({
      entry: {
        id: `city-header-${index}`,
        tripId: activeTrip?.id || '',
        type: 'other',
        title: block.blockName,
        date: '',
        price: 0,
        currency: '',
        notes: '',
        createdAt: ''
      },
      virtualType: 'city-header',
      startTime: block.startTime - 1, // Ensure it sorts just before the first item
      cityName: block.blockName,
      blockType: 'city',
      cityItemCount: block.itemCount,
      cityStartDateLabel: getShortDateLabel(new Date(block.startTime).toISOString()),
      cityEndDateLabel: getShortDateLabel(new Date(block.endTime).toISOString())
    });
  });

  // Re-sort with headers injected
  rawVirtualEntries.forEach(v => virtualEntries.push(v));

  if (entries.length > 0 && state.settings.realtimeTimeline !== false) {
    // Check if current time falls strictly within an ongoing activity
    const overlappingActivity = virtualEntries.find(v => {
      if (v.virtualType === 'city-header' || v.virtualType === 'check-in' || v.virtualType === 'check-out') return false;
      const endT = getEntryEndTime(v);
      return currentTime >= v.startTime && currentTime < endT; // < endT so it doesn't overlap on the exact end minute
    });

    if (overlappingActivity) {
      overlappingActivity.isOngoingNow = true;
    } else {
      let currentCityForTime: string | undefined = undefined;
      const block = cityBlocks.find(b => currentTime >= b.startTime && currentTime <= b.endTime);
      if (block) currentCityForTime = block.blockName;

      virtualEntries.push({
        virtualType: 'current-time',
        startTime: currentTime,
        endTime: currentTime,
        cityName: currentCityForTime,
        entry: { id: 'current-time', tripId: activeTrip?.id || '', type: 'other', title: 'Current Time', date: new Date(currentTime).toISOString().split('T')[0], price: 0, currency: '', notes: '', createdAt: '' }
      });
    }
  }

  virtualEntries.sort((a, b) => a.startTime - b.startTime);

  // --- Build active hotel stays indexed by hotel entry id ---
  // Maps hotel entry id -> { checkInTime, checkOutTime, meta }
  const hotelStays = new Map<string, { checkInTime: number; checkOutTime: number; meta: OngoingHotelMeta }>();
  entries.forEach(entry => {
    if (entry.type === 'hotel' && entry.hotelDetails) {
      const checkInTime = new Date(entry.hotelDetails.checkInTime).getTime();
      const checkOutTime = new Date(entry.hotelDetails.checkOutTime).getTime();
      hotelStays.set(entry.id, {
        checkInTime,
        checkOutTime,
        meta: {
          id: entry.id,
          name: entry.hotelDetails.name || 'Hotel',
          city: entry.hotelDetails.city || '',
          checkInLabel: getShortDateLabel(entry.hotelDetails.checkInTime),
          checkOutLabel: getShortDateLabel(entry.hotelDetails.checkOutTime),
          checkInDateTime: getShortDateTime(entry.hotelDetails.checkInTime),
          checkOutDateTime: getShortDateTime(entry.hotelDetails.checkOutTime),
        },
      });
    }
  });

  // --- Count activities inside each hotel stay ---
  const activityCountPerHotel = new Map<string, number>();
  virtualEntries.forEach(vEntry => {
    if (vEntry.virtualType) return; // skip check-in/check-out nodes
    hotelStays.forEach((stay, hotelId) => {
      if (vEntry.startTime >= stay.checkInTime && vEntry.startTime <= stay.checkOutTime) {
        activityCountPerHotel.set(hotelId, (activityCountPerHotel.get(hotelId) || 0) + 1);
      }
    });
  });

  // --- Map virtual entries to display metadata ---
  let lastDate = '';
  let lastTravelArrivalTime: number | null = null;
  let lastHotelCheckoutTime: number | null = null;

  const entriesWithMeta = virtualEntries.map((vEntry, index) => {
    // Determine which hotel stay (if any) this entry belongs to
    let ongoingHotel: OngoingHotelMeta | undefined;
    hotelStays.forEach((stay, hotelId) => {
      if (vEntry.startTime >= stay.checkInTime && vEntry.startTime <= stay.checkOutTime) {
        ongoingHotel = stay.meta;
      }
    });

    const localDate = new Date(vEntry.startTime);
    const yyyy = localDate.getFullYear();
    const mm = String(localDate.getMonth() + 1).padStart(2, '0');
    const dd = String(localDate.getDate()).padStart(2, '0');
    const localDateStr = `${yyyy}-${mm}-${dd}`;


    let showDate = localDateStr !== lastDate;
    let dateLabel = getDateLabel(localDateStr);

    if (vEntry.virtualType === 'city-header') {
      const isCityCollapsed = collapsedCities.has(vEntry.cityName!);
      if (isCityCollapsed) {
        showDate = true;
        if (vEntry.cityStartDateLabel !== vEntry.cityEndDateLabel) {
          const [startMonth, startDay] = (vEntry.cityStartDateLabel || '').split(' ');
          const [endMonth, endDay] = (vEntry.cityEndDateLabel || '').split(' ');
          if (startMonth === endMonth) {
             dateLabel = `${startMonth}\n${startDay}-${endDay}`;
          } else {
             dateLabel = `${startMonth} ${startDay}\n-\n${endMonth} ${endDay}`;
          }
        }
        lastDate = localDateStr;
      } else {
        showDate = false;
        // Reset lastDate so the first actual item in this block always shows the date badge
        lastDate = '';
      }
    } else if (vEntry.virtualType !== 'current-time') {
      lastDate = localDateStr;
    }

    let gapText = '';

    const formatGapStr = (mins: number, suffix: string) => {
      const d = Math.floor(mins / (24 * 60));
      const h = Math.floor((mins % (24 * 60)) / 60);
      const m = mins % 60;
      if (d > 0) return `${d}d ${h}h ${suffix}`;
      if (h > 0 && m > 0) return `${h}h ${m}m ${suffix}`;
      if (h > 0) return `${h}h ${suffix}`;
      return `${m}m ${suffix}`;
    };

    if ((vEntry.virtualType === 'city-header' || vEntry.virtualType === 'check-in') && lastTravelArrivalTime !== null) {
      const diffMs = vEntry.startTime - lastTravelArrivalTime;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins > 0) {
        let suffix = 'before first activity';
        if (vEntry.virtualType === 'check-in') {
          suffix = 'until check-in';
        } else if (vEntry.virtualType === 'city-header') {
          const nextEntry = virtualEntries[index + 1];
          if (nextEntry && nextEntry.virtualType === 'check-in') {
            suffix = 'until check-in';
          }
        }
        gapText = formatGapStr(diffMins, suffix);
        lastTravelArrivalTime = null;
      }
    }

    if (vEntry.entry.type === 'transport' && lastTravelArrivalTime !== null) {
      const diffMs = vEntry.startTime - lastTravelArrivalTime;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins > 0) {
        gapText = formatGapStr(diffMins, 'until pickup');
        lastTravelArrivalTime = null;
      }
    }

    if (vEntry.entry.type === 'transport' && lastHotelCheckoutTime !== null) {
      const diffMs = vEntry.startTime - lastHotelCheckoutTime;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins > 0) {
        gapText = formatGapStr(diffMins, 'until pickup');
        lastHotelCheckoutTime = null;
      }
    }

    if (vEntry.entry.type === 'flight' && lastHotelCheckoutTime !== null) {
      const diffMs = vEntry.startTime - lastHotelCheckoutTime;
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins > 0) {
        gapText = formatGapStr(diffMins, 'until flight');
        lastHotelCheckoutTime = null;
      }
    }

    if (vEntry.entry.type === 'flight' && vEntry.entry.flightDetails) {
      lastTravelArrivalTime = new Date(vEntry.entry.flightDetails.arrivalTime).getTime();
    }
    if (vEntry.entry.type === 'transport' && vEntry.entry.transportDetails) {
      lastTravelArrivalTime = new Date(vEntry.entry.transportDetails.endTime).getTime();
    }
    if (vEntry.virtualType === 'check-out' && vEntry.entry.hotelDetails) {
      lastHotelCheckoutTime = new Date(vEntry.entry.hotelDetails.checkOutTime).getTime();
    }

    // Build collapse-related props for check-in nodes
    const isCheckIn = vEntry.virtualType === 'check-in';
    const hotelId = vEntry.entry.id;
    const isCollapsed = isCheckIn && collapsedHotels.has(hotelId);
    const activityCount = activityCountPerHotel.get(hotelId) || 0;
    const collapsedSummary = isCollapsed && activityCount > 0
      ? `${activityCount} ${activityCount === 1 ? 'activity' : 'activities'} hidden`
      : undefined;

    const isCompleted = state.settings.realtimeTimeline !== false && vEntry.virtualType !== 'current-time' && getEntryEndTime(vEntry) < currentTime;

    return {
      vEntry,
      showDate,
      dateLabel,
      index,
      gapText,
      ongoingHotel,
      isCollapsible: isCheckIn,
      isCollapsed,
      collapsedSummary,
      isCompleted,
    };
  });

  // --- Filter out entries based on collapse state ---
  const visibleEntries = entriesWithMeta.filter(item => {
    // 1. If city is collapsed (or multiScreenItinerary), hide everything inside it (except the city-header itself)
    if (item.vEntry.virtualType !== 'city-header' && item.vEntry.cityName && (state.settings.multiScreenItinerary || collapsedCities.has(item.vEntry.cityName))) {
      return false;
    }

    // 2. Always show check-in and city-header nodes
    if (item.vEntry.virtualType === 'city-header' || item.vEntry.virtualType === 'check-in') {
      return true;
    }

    // 3. If hotel is collapsed, hide activities AND check-out node
    if (item.ongoingHotel && collapsedHotels.has(item.ongoingHotel.id)) {
      // For check-out, only hide it if it belongs to the collapsed hotel
      if (item.vEntry.virtualType === 'check-out' && item.vEntry.entry.id === item.ongoingHotel.id) {
        return false;
      }
      // For activities inside the hotel (flights and transports are inter-city/major events, don't hide them)
      if (!item.vEntry.virtualType && item.vEntry.entry.type !== 'flight' && item.vEntry.entry.type !== 'transport') {
        return false;
      }
    }

    return true;
  });

  // --- Re-evaluate showDate based purely on what's visible ---
  let visibleLastDate = '';
  visibleEntries.forEach(item => {
    const localDate = new Date(item.vEntry.startTime);
    const yyyy = localDate.getFullYear();
    const mm = String(localDate.getMonth() + 1).padStart(2, '0');
    const dd = String(localDate.getDate()).padStart(2, '0');
    const localDateStr = `${yyyy}-${mm}-${dd}`;

    if (item.vEntry.virtualType === 'city-header') {
      // dateLabel is already formatted correctly in the first pass
      item.showDate = !!item.isCollapsed;
      // Reset so the next visible item establishes its own date context
      visibleLastDate = ''; 
    } else {
      item.showDate = localDateStr !== visibleLastDate;
      visibleLastDate = localDateStr;
    }
  });

  // --- Group visible entries into blocks ---
  const visibleGroups: Array<{ type: 'city' | 'standalone', cityName?: string, items: typeof visibleEntries }> = [];
  let currentGroup: { type: 'city' | 'standalone', cityName?: string, items: typeof visibleEntries } | null = null;

  visibleEntries.forEach(item => {
    if (item.vEntry.cityName) {
      if (currentGroup && currentGroup.type === 'city' && currentGroup.cityName === item.vEntry.cityName) {
        currentGroup.items.push(item);
      } else {
        if (currentGroup) visibleGroups.push(currentGroup);
        currentGroup = { type: 'city', cityName: item.vEntry.cityName, items: [item] };
      }
    } else {
      if (currentGroup) {
        visibleGroups.push(currentGroup);
        currentGroup = null;
      }
      visibleGroups.push({ type: 'standalone', items: [item] });
    }
  });
  if (currentGroup) visibleGroups.push(currentGroup);

  const handleEntryPress = (entry: ItineraryEntry) => {
    router.push({
      pathname: '/edit-entry',
      params: {
        entryId: entry.id,
        tripId: entry.tripId,
        type: entry.type,
        title: entry.title,
        date: entry.date,
        price: String(entry.price),
        currency: entry.currency,
        notes: entry.notes,
      },
    });
  };

  if (!activeTrip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[Typography.h1, { color: colors.text }]}>Itinerary</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="map-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[Typography.h3, { color: colors.text, marginTop: 16 }]}>No trip selected</Text>
          <Text style={[Typography.body, { color: colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
            Go to Trips and tap on a trip to view its itinerary
          </Text>
          <TouchableOpacity
            style={[styles.goButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/')}
          >
            <Text style={[Typography.button, { color: '#FFF' }]}>Go to Trips</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[Typography.h1, { color: colors.text }]} numberOfLines={1}>
            {activeTrip.name}
          </Text>
          <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} planned
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: colors.primary + '15' }]}
            onPress={() => setShowPrices(!showPrices)}
          >
            <Ionicons name={showPrices ? "eye-off-outline" : "eye-outline"} size={14} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: colors.primary + '15' }]}
            onPress={() => {
              const isAnyCollapsed = collapsedCities.size > 0 || collapsedHotels.size > 0;
              if (isAnyCollapsed) {
                setCollapsedCities(new Set());
                setCollapsedHotels(new Set());
              } else {
                const allCities = new Set<string>();
                const allHotels = new Set<string>();
                cityBlocks.forEach(b => {
                  if (b.cityName !== 'Unknown City') allCities.add(b.cityName);
                });
                entries.forEach(e => {
                  if (e.type === 'hotel') allHotels.add(e.id);
                });
                setCollapsedCities(allCities);
                setCollapsedHotels(allHotels);
              }
            }}
          >
            <Ionicons name={(collapsedCities.size > 0 || collapsedHotels.size > 0) ? "expand" : "contract"} size={14} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: colors.primary + '15' }]}
            onPress={() => router.push('/')}
          >
            <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Timeline */}
      {entries.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="git-commit-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[Typography.h3, { color: colors.text, marginTop: 16 }]}>No entries yet</Text>
          <Text style={[Typography.body, { color: colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
            Add flights, hotels, attractions, and more to build your itinerary!
          </Text>
        </View>
      ) : (
        <FlatList
          data={visibleGroups}
          keyExtractor={(group, index) => group.type === 'city' ? `city-${group.cityName}-${index}` : `standalone-${index}`}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: group }) => {
            const isCityGroup = group.type === 'city';
            const isCollapsed = isCityGroup && (state.settings.multiScreenItinerary || collapsedCities.has(group.cityName!));
            
            const renderTimelineItem = (item: typeof visibleEntries[0], indexInGroup: number) => (
              <TimelineItem
                key={item.vEntry.entry.id + (item.vEntry.virtualType || '')}
                entry={item.vEntry.entry}
                virtualType={item.vEntry.virtualType}
                cityName={item.vEntry.cityName}
                blockType={item.vEntry.blockType}
                cityItemCount={item.vEntry.cityItemCount}
                cityStartDateLabel={item.vEntry.cityStartDateLabel}
                cityEndDateLabel={item.vEntry.cityEndDateLabel}
                ongoingHotel={item.ongoingHotel}
                showDate={item.showDate}
                dateLabel={item.dateLabel}
                isFirst={item.index === 0}
                isLast={item.index === virtualEntries.length - 1} // Global last
                isCompleted={item.isCompleted}
                gapText={item.gapText}
                isCollapsible={item.vEntry.virtualType === 'city-header' ? true : item.isCollapsible}
                isCollapsed={item.vEntry.virtualType === 'city-header' ? (state.settings.multiScreenItinerary || collapsedCities.has(item.vEntry.cityName!)) : item.isCollapsed}
                isNavigable={item.vEntry.virtualType === 'city-header' && state.settings.multiScreenItinerary}
                collapsedSummary={item.collapsedSummary}
                isCurrentCity={item.vEntry.virtualType === 'city-header' ? (virtualEntries.some(v => v.virtualType === 'current-time' && v.cityName === item.vEntry.cityName) || virtualEntries.some(v => v.isOngoingNow && v.cityName === item.vEntry.cityName)) : false}
                isOngoingNow={item.vEntry.isOngoingNow}
                onToggleCollapse={() => {
                  if (item.vEntry.virtualType === 'city-header') {
                    if (state.settings.multiScreenItinerary) {
                      router.push({
                        pathname: '/city-details',
                        params: {
                          tripId: activeTrip?.id || '',
                          cityName: item.vEntry.cityName
                        }
                      });
                    } else {
                      toggleCollapseCity(item.vEntry.cityName!);
                    }
                  } else {
                    toggleCollapseHotel(item.vEntry.entry.id);
                  }
                }}
                onPress={() => item.vEntry.virtualType !== 'city-header' && handleEntryPress(item.vEntry.entry)}
                theme={state.settings.theme}
                showPrice={showPrices}
                cityImageUri={state.settings.showCardImages?.city !== false && item.vEntry.virtualType === 'city-header' && item.vEntry.cityName ? cityImageMap[`${activeTrip?.id}::${item.vEntry.cityName}`] : undefined}
                onPickCityImage={item.vEntry.virtualType === 'city-header' && item.vEntry.cityName ? () => handlePickCityImage(item.vEntry.cityName!) : undefined}
                entryImageUri={(item.vEntry.entry.type === 'hotel' || item.vEntry.entry.type === 'attraction') && state.settings.showCardImages?.[item.vEntry.entry.type] !== false ? entryImageMap[item.vEntry.entry.id] : undefined}
              />
            );

            if (isCityGroup && !isCollapsed) {
              const hasGap = !!group.items[0].gapText;
              return (
                <View style={{ position: 'relative', marginBottom: 12 }}>
                  {/* Absolute border box that only wraps the cards, not the timeline */}
                  <View 
                    style={{
                      position: 'absolute',
                      top: hasGap ? 26 : 0,
                      bottom: 0,
                      left: 103, // 65 (date) + 46 (timeline) = 111. 103 gives 8px padding left of cards
                      right: 8,  // cards have marginRight 16. 8 gives 8px padding right of cards
                      borderWidth: 1, 
                      borderColor: colors.primary + '30', 
                      borderRadius: 24, 
                      backgroundColor: colors.primary + (state.settings.theme === 'dark' ? '08' : '05'),
                    }} 
                  />
                  {group.items.map((item, idx) => renderTimelineItem(item, idx))}
                </View>
              );
            }

            return (
              <View>
                {group.items.map((item, idx) => renderTimelineItem(item, idx))}
              </View>
            );
          }}
        />
      )}

      <FAB
        onPress={() =>
          router.push({
            pathname: '/add-entry',
            params: { tripId: activeTrip?.id || '', currency: activeTrip.baseCurrency },
          })
        }
        theme={state.settings.theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
