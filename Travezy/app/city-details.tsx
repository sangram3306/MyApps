import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/theme/colors';
import { Typography } from '../src/theme/typography';
import { ItineraryEntry } from '../src/types';
import TimelineItem from '../src/components/TimelineItem';
import { getCityImages, saveCityImages, getEntryImages, saveEntryImages } from '../src/storage/asyncStorage';

// Re-use types from itinerary
export interface VirtualItineraryEntry {
  entry: ItineraryEntry;
  virtualType?: 'check-in' | 'check-out' | 'city-header';
  startTime: number;
  cityName?: string;
  blockType?: 'city' | 'travel';
  cityItemCount?: number;
  cityStartDateLabel?: string;
  cityEndDateLabel?: string;
}

export interface OngoingHotelMeta {
  hotelName: string;
}

export default function CityDetailsScreen() {
  const { state } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ tripId: string; cityName: string }>();
  const colors = Colors[state.settings.theme];

  const [showPrices, setShowPrices] = useState(true);
  const [collapsedHotels, setCollapsedHotels] = useState<Set<string>>(new Set());
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

  const handlePickCityImage = useCallback(async () => {
    const tripId = params.tripId as string;
    const cityName = params.cityName as string;
    if (!tripId || !cityName) return;

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
  }, [params.tripId, params.cityName, cityImageMap]);

  const activeTrip = state.trips.find(t => t.id === params.tripId);
  const entries = state.entries
    .filter(e => e.tripId === params.tripId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const cityImageUri = cityImageMap[`${params.tripId}::${params.cityName}`];

  if (!activeTrip || !params.cityName) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Text style={[Typography.h3, { color: colors.text }]}>Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getEntryStartTime = (entry: ItineraryEntry) => {
    if (entry.type === 'flight' && entry.flightDetails) return new Date(entry.flightDetails.departureTime).getTime();
    if (entry.type === 'attraction' && entry.attractionDetails) return new Date(entry.attractionDetails.startTime).getTime();
    if (entry.type === 'transport' && entry.transportDetails) return new Date(entry.transportDetails.startTime).getTime();
    return new Date(entry.date + 'T00:00:00').getTime();
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
        vEntry.startTime = latestTravelTimeOnSameDay + 60000;
      }
    }
  });

  rawVirtualEntries.sort((a, b) => a.startTime - b.startTime);

  // --- Infer Cities ---
  let currentCity = 'Unknown City';
  rawVirtualEntries.forEach(vEntry => {
    if (vEntry.entry.type === 'flight' && vEntry.entry.flightDetails) {
      currentCity = vEntry.entry.flightDetails.to;
      return; // Flights are not part of the city block
    }
    if (vEntry.entry.type === 'hotel' && vEntry.entry.hotelDetails && vEntry.entry.hotelDetails.city) {
      currentCity = vEntry.entry.hotelDetails.city;
    }
    vEntry.cityName = currentCity;
  });

  // --- Filter for this city ---
  const cityEntries = rawVirtualEntries.filter(v => v.cityName === params.cityName);
  if (cityEntries.length > 0) {
    const minT = cityEntries[0].startTime;
    const maxT = cityEntries[cityEntries.length - 1].startTime + 86400000;
    if (currentTime >= minT && currentTime <= maxT && state.settings.realtimeTimeline !== false) {
      const overlappingActivity = cityEntries.find(v => {
        if (v.virtualType === 'city-header' || v.virtualType === 'check-in' || v.virtualType === 'check-out') return false;
        const endT = getEntryEndTime(v);
        return currentTime >= v.startTime && currentTime < endT;
      });

      if (overlappingActivity) {
        overlappingActivity.isOngoingNow = true;
      } else {
        cityEntries.push({
          virtualType: 'current-time',
          startTime: currentTime,
          endTime: currentTime,
          cityName: params.cityName as string,
          entry: { id: 'current-time', tripId: (params.tripId as string) || '', type: 'other', title: 'Current Time', date: new Date(currentTime).toISOString().split('T')[0], price: 0, currency: '', notes: '', createdAt: '' }
        });
        cityEntries.sort((a, b) => a.startTime - b.startTime);
      }
    }
  }

  // --- Build active hotel stays indexed by hotel entry id ---
  const hotelStays = new Map<string, { checkInTime: number; checkOutTime: number; meta: OngoingHotelMeta }>();
  entries.forEach(entry => {
    if (entry.type === 'hotel' && entry.hotelDetails) {
      const checkInTime = new Date(entry.hotelDetails.checkInTime).getTime();
      const checkOutTime = new Date(entry.hotelDetails.checkOutTime).getTime();
      hotelStays.set(entry.id, {
        checkInTime,
        checkOutTime,
        meta: { hotelName: entry.hotelDetails.name }
      });
    }
  });

  // --- Final Pass: Calculate gaps and format for rendering ---
  const renderableItems: any[] = [];
  let lastDay = '';
  
  cityEntries.forEach((vEntry, index) => {
    let gapText = '';
    if (index > 0) {
      const prevEntry = cityEntries[index - 1];
      const prevEndTime = getEntryEndTime(prevEntry);
      if (prevEndTime > 0 && vEntry.startTime > prevEndTime) {
        const gapMs = vEntry.startTime - prevEndTime;
        if (gapMs > 0 && gapMs < 24 * 60 * 60 * 1000) {
          const hours = Math.floor(gapMs / 3600000);
          const mins = Math.floor((gapMs % 3600000) / 60000);
          if (hours > 0 && mins > 0) gapText = `${hours}h ${mins}m free`;
          else if (hours > 0) gapText = `${hours}h free`;
          else gapText = `${mins}m free`;
        }
      }
    }

    const currentDay = new Date(vEntry.startTime).toDateString();
    let showDate = false;
    let dateLabel = '';
    if (currentDay !== lastDay) {
      showDate = true;
      const d = new Date(vEntry.startTime);
      dateLabel = `${d.toLocaleDateString('en-US', { weekday: 'short' })}\n${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      lastDay = currentDay;
    }

    // Determine if this item is inside an active hotel stay
    let activeOngoingHotel: OngoingHotelMeta | undefined = undefined;
    for (const [hotelId, stay] of Array.from(hotelStays.entries())) {
      if (vEntry.entry.type === 'hotel' && vEntry.entry.id === hotelId) continue;
      if (vEntry.startTime >= stay.checkInTime && vEntry.startTime < stay.checkOutTime) {
        activeOngoingHotel = stay.meta;
        break;
      }
    }

    // Calculate collapse logic for hotels
    const isInsideHotel = !!activeOngoingHotel;
    let isHidden = false;
    
    if (isInsideHotel) {
      // Find which hotel this item is inside
      const activeHotelEntry = Array.from(hotelStays.entries()).find(([_, stay]) => 
        vEntry.startTime >= stay.checkInTime && vEntry.startTime < stay.checkOutTime
      );
      if (activeHotelEntry && collapsedHotels.has(activeHotelEntry[0])) {
        isHidden = true;
      }
    }

    // Summarize hotel
    let collapsedSummary = '';
    if (vEntry.virtualType === 'check-in' && collapsedHotels.has(vEntry.entry.id)) {
      const stay = hotelStays.get(vEntry.entry.id);
      if (stay) {
        const nights = Math.round((stay.checkOutTime - stay.checkInTime) / (1000 * 60 * 60 * 24));
        const activitiesCount = cityEntries.filter(e => 
          e.startTime > stay.checkInTime && 
          e.startTime < stay.checkOutTime && 
          e.entry.id !== vEntry.entry.id
        ).length;
        collapsedSummary = `${nights} ${nights === 1 ? 'night' : 'nights'}${activitiesCount > 0 ? ` • ${activitiesCount} ${activitiesCount === 1 ? 'activity' : 'activities'}` : ''}`;
      }
    }

    if (!isHidden) {
      const isCompleted = state.settings.realtimeTimeline !== false && vEntry.virtualType !== 'current-time' && getEntryEndTime(vEntry) < currentTime;

      renderableItems.push({
        index: renderableItems.length,
        vEntry,
        ongoingHotel: activeOngoingHotel,
        showDate,
        dateLabel,
        gapText,
        isCollapsible: vEntry.virtualType === 'check-in',
        isCollapsed: collapsedHotels.has(vEntry.entry.id),
        collapsedSummary,
        isCompleted
      });
    }
  });

  const toggleCollapseHotel = (hotelId: string) => {
    setCollapsedHotels(prev => {
      const next = new Set(prev);
      if (next.has(hotelId)) next.delete(hotelId);
      else next.add(hotelId);
      return next;
    });
  };

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {cityImageUri ? (
        <ImageBackground 
          source={{ uri: cityImageUri }} 
          style={{ width: '100%', minHeight: 200, justifyContent: 'space-between', paddingBottom: 16 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20 }}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20 }}
                onPress={() => setShowPrices(!showPrices)}
              >
                <Ionicons name={showPrices ? "eye-off-outline" : "eye-outline"} size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 20 }}
                onPress={handlePickCityImage}
              >
                <Ionicons name="camera" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ paddingHorizontal: 16, marginTop: 60, backgroundColor: 'rgba(0,0,0,0.35)', paddingTop: 20, paddingBottom: 16 }}>
            <Text style={[Typography.h1, { color: '#FFF', fontSize: 32, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }]} numberOfLines={1}>
              {params.cityName}
            </Text>
            <Text style={[Typography.caption, { color: 'rgba(255,255,255,0.9)', marginTop: 4 }]}>
              {cityEntries.length} {cityEntries.length === 1 ? 'entry' : 'entries'} planned
            </Text>
          </View>
        </ImageBackground>
      ) : (
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View>
              <Text style={[Typography.h1, { color: colors.text }]} numberOfLines={1}>
                {params.cityName}
              </Text>
              <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {cityEntries.length} {cityEntries.length === 1 ? 'entry' : 'entries'} planned
              </Text>
            </View>
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
              onPress={handlePickCityImage}
            >
              <Ionicons name="camera-outline" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={renderableItems}
        keyExtractor={(item) => item.vEntry.entry.id + (item.vEntry.virtualType || '')}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TimelineItem
            key={item.vEntry.entry.id + (item.vEntry.virtualType || '')}
            entry={item.vEntry.entry}
            virtualType={item.vEntry.virtualType}
            cityName={item.vEntry.cityName}
            ongoingHotel={item.ongoingHotel}
            showDate={item.showDate}
            dateLabel={item.dateLabel}
            isFirst={item.index === 0}
            isLast={item.index === renderableItems.length - 1}
            isCompleted={item.isCompleted}
            gapText={item.gapText}
            isCollapsible={item.isCollapsible}
            isCollapsed={item.isCollapsed}
            collapsedSummary={item.collapsedSummary}
            isOngoingNow={item.vEntry.isOngoingNow}
            onToggleCollapse={() => toggleCollapseHotel(item.vEntry.entry.id)}
            onPress={() => handleEntryPress(item.vEntry.entry)}
            theme={state.settings.theme}
            showPrice={showPrices}
            entryImageUri={(item.vEntry.entry.type === 'hotel' || item.vEntry.entry.type === 'attraction') && state.settings.showCardImages?.[item.vEntry.entry.type] !== false ? entryImageMap[item.vEntry.entry.id] : undefined}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
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
    padding: 32,
  },
});
