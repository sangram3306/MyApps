import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DualModeDatePickerModal from '../src/components/DualModeDatePickerModal';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/theme/colors';
import { Typography } from '../src/theme/typography';
import { Trip, TripStatus } from '../src/types';
import { toLocalDateString } from '../src/utils/date';
import { CURRENCIES } from '../src/data/exchangeRates';
import * as Crypto from 'expo-crypto';

import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

export default function EditTripScreen() {
  const { state, updateTrip, deleteTrip } = useApp();
  const { id } = useLocalSearchParams();
  const trip = state.trips.find(t => t.id === id);
  const router = useRouter();
  const colors = Colors[state.settings.theme];

  const [name, setName] = useState(trip?.name || '');
  const [startDate, setStartDate] = useState(trip ? new Date(trip.startDate) : new Date());
  const [endDate, setEndDate] = useState(trip ? new Date(trip.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [baseCurrency, setBaseCurrency] = useState(trip?.baseCurrency || 'USD');
  const [status, setStatus] = useState<TripStatus>(trip?.status || 'ACTIVE');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showCurrencyList, setShowCurrencyList] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleSave = async () => {
    if (!name.trim() || !trip) return;

    const updatedTrip: Trip = {
      ...trip,
      name: name.trim(),
      startDate: toLocalDateString(startDate),
      endDate: toLocalDateString(endDate),
      baseCurrency,
      status,
    };

    await updateTrip(updatedTrip);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert('Delete Trip', 'This will delete the trip and all its entries. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (trip) {
            await deleteTrip(trip.id);
            router.replace('/(tabs)');
          }
        },
      },
    ]);
  };

  const filteredCurrencies = CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
      c.name.toLowerCase().includes(currencySearch.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: colors.text }]}>Edit Trip</Text>
          <TouchableOpacity onPress={handleSave} disabled={!name.trim()}>
            <Text
              style={[
                Typography.button,
                { color: name.trim() ? colors.primary : colors.textMuted },
              ]}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          {/* Trip Name */}
          <View style={styles.field}>
            <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>
              Trip Name
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                },
              ]}
              placeholder="e.g., Paris Adventure 2024"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
                          />
          </View>

          {/* Trip Status */}
          <View style={styles.field}>
            <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>
              Trip Status
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['PLANNING', 'ACTIVE', 'COMPLETED', 'POSTPONED', 'CANCELLED'] as TripStatus[]).map((s) => {
                const isSelected = status === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                      borderWidth: 1,
                      backgroundColor: isSelected ? (s === 'PLANNING' ? '#8B5CF6' : colors.primary) : colors.inputBg,
                      borderColor: isSelected ? (s === 'PLANNING' ? '#8B5CF6' : colors.primary) : colors.inputBorder,
                    }}
                    onPress={() => setStatus(s)}
                  >
                    <Text
                      style={[
                        Typography.captionSemibold,
                        { color: isSelected ? '#FFF' : colors.text },
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Start Date */}
          <View style={styles.field}>
            <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>
              Start Date
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                },
              ]}
              onPress={() => setShowStartPicker(!showStartPicker)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <Text style={[Typography.body, { color: colors.text, marginLeft: 10 }]}>
                {formatDate(startDate)}
              </Text>
            </TouchableOpacity>
            <DualModeDatePickerModal
              visible={showStartPicker}
              value={startDate}
              title="Start Date"
              theme={state.settings.theme}
              onConfirm={(date) => {
                setStartDate(date);
                if (date > endDate) setEndDate(date);
              }}
              onClose={() => setShowStartPicker(false)}
            />
          </View>

          {/* End Date */}
          <View style={styles.field}>
            <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>
              End Date
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                },
              ]}
              onPress={() => setShowEndPicker(!showEndPicker)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <Text style={[Typography.body, { color: colors.text, marginLeft: 10 }]}>
                {formatDate(endDate)}
              </Text>
            </TouchableOpacity>
            <DualModeDatePickerModal
              visible={showEndPicker}
              value={endDate}
              title="End Date"
              minimumDate={startDate}
              theme={state.settings.theme}
              onConfirm={(date) => setEndDate(date)}
              onClose={() => setShowEndPicker(false)}
            />
          </View>

          {/* Base Currency */}
          <View style={styles.field}>
            <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>
              Base Currency
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                },
              ]}
              onPress={() => setShowCurrencyList(!showCurrencyList)}
            >
              <Ionicons name="cash-outline" size={18} color={colors.textSecondary} />
              <Text style={[Typography.body, { color: colors.text, marginLeft: 10 }]}>
                {baseCurrency} — {CURRENCIES.find((c) => c.code === baseCurrency)?.name}
              </Text>
              <Ionicons
                name={showCurrencyList ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
                style={{ marginLeft: 'auto' }}
              />
            </TouchableOpacity>

            {showCurrencyList && (
              <View style={[styles.currencyDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.currencySearch, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="Search..."
                  placeholderTextColor={colors.textMuted}
                  value={currencySearch}
                  onChangeText={setCurrencySearch}
                />
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {filteredCurrencies.map((cur) => (
                    <TouchableOpacity
                      key={cur.code}
                      style={[
                        styles.currencyOption,
                        {
                          backgroundColor: cur.code === baseCurrency ? colors.primary + '15' : 'transparent',
                          borderBottomColor: colors.borderLight,
                        },
                      ]}
                      onPress={() => {
                        setBaseCurrency(cur.code);
                        setShowCurrencyList(false);
                        setCurrencySearch('');
                      }}
                    >
                      <Text style={[Typography.body, { color: colors.text }]}>
                        {cur.symbol} {cur.code}
                      </Text>
                      <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                        {cur.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Delete Button */}
          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: colors.error + '15' }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={[Typography.button, { color: colors.error, marginLeft: 8 }]}>
              Delete Trip
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  field: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  currencyDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  currencySearch: {
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  currencyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 40,
  },
});
