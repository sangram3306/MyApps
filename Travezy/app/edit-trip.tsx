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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/theme/colors';
import { Typography } from '../src/theme/typography';
import { Trip } from '../src/types';
import { toLocalDateString } from '../src/utils/date';
import { CURRENCIES } from '../src/data/exchangeRates';
import * as Crypto from 'expo-crypto';

import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

export default function EditTripScreen() {
  const { state, updateTrip } = useApp();
  const { id } = useLocalSearchParams();
  const trip = state.trips.find(t => t.id === id);
  const router = useRouter();
  const colors = Colors[state.settings.theme];

  const [name, setName] = useState(trip?.name || '');
  const [startDate, setStartDate] = useState(trip ? new Date(trip.startDate) : new Date());
  const [endDate, setEndDate] = useState(trip ? new Date(trip.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [baseCurrency, setBaseCurrency] = useState(trip?.baseCurrency || 'USD');
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
    };

    await updateTrip(updatedTrip);
    router.back();
  };

  const filteredCurrencies = CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
      c.name.toLowerCase().includes(currencySearch.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
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

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
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
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="spinner"
                onValueChange={(event, date) => {
                  if (date) {
                    setStartDate(date);
                    if (date > endDate) setEndDate(date);
                  }
                  if (Platform.OS === 'android') setShowStartPicker(false);
                }}
                textColor={colors.text}
              />
            )}
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
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="spinner"
                minimumDate={startDate}
                onValueChange={(event, date) => {
                  if (date) setEndDate(date);
                  if (Platform.OS === 'android') setShowEndPicker(false);
                }}
                textColor={colors.text}
              />
            )}
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
});
