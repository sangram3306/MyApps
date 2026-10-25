import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';
import { Colors } from '../../src/theme/colors';
import { Typography } from '../../src/theme/typography';
import { formatCurrency, convertCurrency } from '../../src/data/exchangeRates';
import TripCard from '../../src/components/TripCard';
import FAB from '../../src/components/FAB';
import UpNextTicker from '../../src/components/UpNextTicker';

export default function TripsScreen() {
  const { state, setActiveTrip, deleteTrip, updateTrip, duplicateTrip } = useApp();
  const router = useRouter();
  const colors = Colors[state.settings.theme];

  const activeTrip = state.trips.find((t) => t.id === state.activeTripId);
  const activeTripEntries = activeTrip ? state.entries.filter((e) => e.tripId === activeTrip.id) : [];

  const handleTripPress = async (tripId: string) => {
    await setActiveTrip(tripId);
    router.push('/(tabs)/itinerary');
  };

  const handleTripLongPress = (trip: any) => {
    const showDeleteConfirm = () => {
      Alert.alert('Delete Trip', 'This will delete the trip and all its entries. Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTrip(trip.id) },
      ]);
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Edit Trip', 'Duplicate Trip', 'Delete Trip'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 3,
          title: trip.name,
          message: 'What would you like to do?',
        },
        (idx) => {
          if (idx === 1) router.push({ pathname: '/edit-trip', params: { id: trip.id } });
          if (idx === 2) duplicateTrip(trip.id);
          if (idx === 3) showDeleteConfirm();
        }
      );
    } else {
      Alert.alert(
        trip.name,
        'What would you like to do?',
        [
          { text: 'Delete', style: 'destructive', onPress: showDeleteConfirm },
          { text: 'Duplicate', onPress: () => duplicateTrip(trip.id) },
          { text: 'Edit Trip', onPress: () => router.push({ pathname: '/edit-trip', params: { id: trip.id } }) },
        ],
        { cancelable: true }
      );
    }
  };

  const getTripEntryCount = (tripId: string) => {
    return state.entries.filter((e) => e.tripId === tripId).length;
  };

  const getTripTotalCost = (tripId: string, baseCurrency: string) => {
    const entries = state.entries.filter((e) => e.tripId === tripId);
    const total = entries.reduce((sum, e) => {
      return sum + convertCurrency(e.price, e.currency, baseCurrency, state.exchangeRates.rates);
    }, 0);
    return formatCurrency(total, baseCurrency);
  };

    const getTripStats = (tripId: string) => {
    const entries = state.entries.filter((e) => e.tripId === tripId);
    let intlFlights = 0;
    let domFlights = 0;
    let hotels = 0;
    let attractions = 0;
    let transports = 0;
    
    entries.forEach(e => {
      if (e.type === 'flight') {
        if (e.flightDetails?.flightType === 'international') intlFlights++;
        else domFlights++;
      } else if (e.type === 'hotel') {
        hotels++;
      } else if (e.type === 'attraction') {
        attractions++;
      } else if (e.type === 'transport') {
        transports++;
      }
    });
    
    return { intlFlights, domFlights, hotels, attractions, transports, total: entries.length };
  };

  const getTripDates = (tripId: string, defaultStart: string, defaultEnd: string) => {
    const entries = state.entries.filter((e) => e.tripId === tripId);
    if (entries.length === 0) return { start: defaultStart, end: defaultEnd };
    
    let minT = new Date(defaultStart).getTime();
    let maxT = new Date(defaultEnd).getTime();
    
    entries.forEach(e => {
      const eT = new Date(e.date).getTime();
      if (!isNaN(eT)) {
        if (eT < minT) minT = eT;
        if (eT > maxT) maxT = eT;
      }
    });
    
    return {
      start: new Date(minT).toISOString(),
      end: new Date(maxT).toISOString(),
    };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[Typography.h1, { color: colors.text }]}>TripSP</Text>
          <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            Your Travel Companion
          </Text>
        </View>
      </View>

      {/* Trip List */}
      {state.trips.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="airplane-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[Typography.h3, { color: colors.text, marginTop: 16 }]}>No trips yet</Text>
          <Text style={[Typography.body, { color: colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
            Tap the + button to create your first trip and start planning!
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...state.trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt))}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            (state.settings.showUpNextCard ?? true) && activeTrip && activeTripEntries.length > 0 ? (
              <View style={{ marginHorizontal: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[Typography.captionSemibold, { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 }]}>
                  {activeTrip.name} • Status
                </Text>
                <UpNextTicker
                  trip={activeTrip}
                  entries={activeTripEntries}
                  theme={state.settings.theme}
                  timeFormat={state.settings.timeFormat}
                  onPressEntry={(id) => {
                    const entry = activeTripEntries.find((e) => e.id === id);
                    if (entry) {
                      router.push({
                        pathname: '/edit-entry',
                        params: {
                          entryId: entry.id,
                          id: entry.id,
                          tripId: entry.tripId,
                          type: entry.type,
                          title: entry.title,
                          date: entry.date,
                          price: String(entry.price),
                          currency: entry.currency,
                          notes: entry.notes,
                        },
                      });
                    } else {
                      router.push({ pathname: '/edit-entry', params: { entryId: id, id } });
                    }
                  }}
                  maxWidth={200}
                />
              </View>
            ) : undefined
          }
          renderItem={({ item }) => {
            const { start, end } = getTripDates(item.id, item.startDate, item.endDate);
            return (
              <TripCard
                trip={item}
                stats={getTripStats(item.id)}
                totalCost={getTripTotalCost(item.id, state.settings.selectedCurrencies[0])}
                isActive={state.activeTripId === item.id}
                computedStartDate={start}
                computedEndDate={end}
                onPress={() => handleTripPress(item.id)}
                onLongPress={() => handleTripLongPress(item)}
                theme={state.settings.theme}
              />
            );
          }}
        />
      )}

      <FAB
        onPress={() => router.push('/add-trip')}
        theme={state.settings.theme}
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
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
});
