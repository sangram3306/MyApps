import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/theme/colors';
import { Typography } from '../src/theme/typography';
import { ItineraryEntry } from '../src/types';
import TimelineItem from '../src/components/TimelineItem';

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

  const activeTrip = state.trips.find(t => t.id === params.tripId);
  const entries = state.entries
    .filter(e => e.tripId === params.tripId)
    .sort((a, b) => a.date.localeCompare(b.date));

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
      renderableItems.push({
        index: renderableItems.length,
        vEntry,
        ongoingHotel: activeOngoingHotel,
        showDate,
        dateLabel,
        gapText,
        isCollapsible: vEntry.virtualType === 'check-in',
        isCollapsed: collapsedHotels.has(vEntry.entry.id),
        collapsedSummary
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
      params: { ...entry } as any
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
        </View>
      </View>

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
            gapText={item.gapText}
            isCollapsible={item.isCollapsible}
            isCollapsed={item.isCollapsed}
            collapsedSummary={item.collapsedSummary}
            onToggleCollapse={() => toggleCollapseHotel(item.vEntry.entry.id)}
            onPress={() => handleEntryPress(item.vEntry.entry)}
            theme={state.settings.theme}
            showPrice={showPrices}
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
