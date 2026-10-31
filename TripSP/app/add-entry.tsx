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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/theme/colors';
import { Typography } from '../src/theme/typography';
import { ENTRY_TYPE_META, ItineraryEntry, EntryType } from '../src/types';
import { toLocalDateString, formatTime } from '../src/utils/date';
import * as Crypto from 'expo-crypto';
import DocumentManager from '../src/components/DocumentManager';
import DualModeTimePickerModal from '../src/components/DualModeTimePickerModal';
import DualModeDatePickerModal from '../src/components/DualModeDatePickerModal';

const ENTRY_TYPES: EntryType[] = ['flight', 'hotel', 'attraction', 'food', 'transport', 'shopping', 'other'];

export default function AddEntryScreen() {
  const { state, addEntry } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ tripId: string; currency: string; type?: string }>();
  const colors = Colors[state.settings.theme];

  const [type, setType] = useState<EntryType>((params.type as EntryType) || 'flight');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  // Flight-specific states
  const [flightType, setFlightType] = useState<'direct' | 'connecting'>('direct');
  // For Direct flights
  const [flightFrom, setFlightFrom] = useState('');
  const [flightName, setFlightName] = useState('');
  const [flightCategory, setFlightCategory] = useState<'domestic' | 'international'>('domestic');
  const [flightTo, setFlightTo] = useState('');
  const [departureTerminal, setDepartureTerminal] = useState('');
  const [arrivalTerminal, setArrivalTerminal] = useState('');
  const [departureDateTime, setDepartureDateTime] = useState(new Date());
  const [arrivalDateTime, setArrivalDateTime] = useState(new Date());
  const [showDepDate, setShowDepDate] = useState(false);
  const [showDepTime, setShowDepTime] = useState(false);
  const [showArrDate, setShowArrDate] = useState(false);
  const [showArrTime, setShowArrTime] = useState(false);
  
  // For Connecting flights
  const [connections, setConnections] = useState<Array<{
    from: string;
    to: string;
    departureTime: Date;
    arrivalTime: Date;
    flightName: string;
    departureTerminal: string;
    arrivalTerminal: string;
  }>>([
    { from: '', to: '', departureTime: new Date(), arrivalTime: new Date(), flightName: '', departureTerminal: '', arrivalTerminal: '' },
    { from: '', to: '', departureTime: new Date(), arrivalTime: new Date(), flightName: '', departureTerminal: '', arrivalTerminal: '' },
  ]);
  // Date picker state for dynamic connections list
  const [activePicker, setActivePicker] = useState<{ index: number; type: 'depDate' | 'depTime' | 'arrDate' | 'arrTime' } | null>(null);

  // Hotel-specific states
  const [hotelName, setHotelName] = useState('');
  const [hotelAddress, setHotelAddress] = useState('');
  const [hotelCity, setHotelCity] = useState('');
  const [hotelLink, setHotelLink] = useState('');
  const [checkInDateTime, setCheckInDateTime] = useState(new Date());
  const [checkOutDateTime, setCheckOutDateTime] = useState(new Date());
  const [showCheckInDate, setShowCheckInDate] = useState(false);
  const [showCheckInTime, setShowCheckInTime] = useState(false);
  const [showCheckOutDate, setShowCheckOutDate] = useState(false);
  const [showCheckOutTime, setShowCheckOutTime] = useState(false);

  // Attraction-specific states
  const [attractionStartTime, setAttractionStartTime] = useState(new Date());
  const [attractionEndTime, setAttractionEndTime] = useState(new Date(new Date().setHours(new Date().getHours() + 2)));
  const [attractionLink, setAttractionLink] = useState('');
  const [showAttractionStartTime, setShowAttractionStartTime] = useState(false);
  const [showAttractionEndTime, setShowAttractionEndTime] = useState(false);

  // Transport-specific states
  const [transportStartTime, setTransportStartTime] = useState(new Date());
  const [transportEndTime, setTransportEndTime] = useState(new Date(new Date().setHours(new Date().getHours() + 1)));
  const [showTransportStartTime, setShowTransportStartTime] = useState(false);
  const [showTransportEndTime, setShowTransportEndTime] = useState(false);
  const [transportFrom, setTransportFrom] = useState('');
  const [transportTo, setTransportTo] = useState('');
  const [transportDropOffAddress, setTransportDropOffAddress] = useState('');

  // Documents state
  const [documents, setDocuments] = useState<any[]>([]);

  const formatDateTime = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric'
    }) + ' ' + formatTime(d, state.settings.timeFormat);
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };


  const handleSave = async () => {
    let finalTitle = title.trim();
    let finalDate = date;

    if (type === 'flight') {
      finalTitle = `Flight: ${flightFrom.trim()} - ${flightTo.trim()}`;
      finalDate = departureDateTime;
    } else if (type === 'hotel') {
      finalTitle = hotelName.trim();
      finalDate = checkInDateTime;
    }

    if (!finalTitle) return;

    const entry: ItineraryEntry = {
      id: Crypto.randomUUID(),
      tripId: params.tripId || '',
      type,
      title: finalTitle,
      date: toLocalDateString(finalDate),
      price: parseFloat(price) || 0,
      currency: params.currency || 'USD',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      documents,
      ...(type === 'flight' && {
        flightDetails: flightType === 'direct' ? {
          from: flightFrom.trim(),
          to: flightTo.trim(),
          flightName: flightName.trim(),
          flightType: flightCategory,
          departureTerminal: departureTerminal.trim(),
          arrivalTerminal: arrivalTerminal.trim(),
          departureTime: departureDateTime.toISOString(),
          arrivalTime: arrivalDateTime.toISOString(),
          isConnecting: false,
        } : {
          // Calculate overall details from first and last leg
          from: connections[0]?.from.trim() || '',
          to: connections[connections.length - 1]?.to.trim() || '',
          departureTime: connections[0]?.departureTime.toISOString() || new Date().toISOString(),
          arrivalTime: connections[connections.length - 1]?.arrivalTime.toISOString() || new Date().toISOString(),
          isConnecting: true,
          flightName: flightName.trim(),
          flightType: flightCategory,
          connections: connections.map(c => ({
            from: c.from.trim(),
            to: c.to.trim(),
            departureTime: c.departureTime.toISOString(),
            arrivalTime: c.arrivalTime.toISOString(),
            flightName: c.flightName?.trim() || '',
            departureTerminal: c.departureTerminal?.trim() || '',
            arrivalTerminal: c.arrivalTerminal?.trim() || '',
          }))
        }
      }),
      ...(type === 'hotel' && {
        hotelDetails: {
          name: hotelName.trim(),
          address: hotelAddress.trim(),
          city: hotelCity.trim(),
          checkInTime: checkInDateTime.toISOString(),
          checkOutTime: checkOutDateTime.toISOString(),
          link: hotelLink.trim() || undefined,
        }
      }),
      ...(type === 'attraction' && {
        attractionDetails: {
          startTime: new Date(new Date(date).setHours(attractionStartTime.getHours(), attractionStartTime.getMinutes())).toISOString(),
          endTime: new Date(new Date(date).setHours(attractionEndTime.getHours(), attractionEndTime.getMinutes())).toISOString(),
          link: attractionLink.trim() || undefined,
        }
      }),
      ...(type === 'transport' && {
        transportDetails: {
          startTime: new Date(new Date(date).setHours(transportStartTime.getHours(), transportStartTime.getMinutes())).toISOString(),
          endTime: new Date(new Date(date).setHours(transportEndTime.getHours(), transportEndTime.getMinutes())).toISOString(),
          from: transportFrom.trim() || undefined,
          to: transportTo.trim() || undefined,
          dropOffAddress: transportDropOffAddress.trim() || undefined,
        }
      })
    };

    await addEntry(entry);
    router.back();
  };

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
          <Text style={[Typography.h3, { color: colors.text }]}>Add Entry</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text
              style={[
                Typography.button,
                { color: colors.primary },
              ]}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          {/* Entry Type Selector */}
          <View style={styles.field}>
            <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 10 }]}>
              Type
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.typeRow}>
                {ENTRY_TYPES.map((t) => {
                  const meta = ENTRY_TYPE_META[t];
                  const isSelected = type === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: isSelected ? meta.color + '20' : colors.inputBg,
                          borderColor: isSelected ? meta.color : colors.inputBorder,
                        },
                      ]}
                      onPress={() => setType(t)}
                    >
                      <Ionicons name={meta.icon as any} size={16} color={isSelected ? meta.color : colors.textMuted} />
                      <Text
                        style={[
                          Typography.captionMedium,
                          { color: isSelected ? meta.color : colors.textSecondary, marginLeft: 6 },
                        ]}
                      >
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Title (Hidden for flight/hotel) */}
          {type !== 'flight' && type !== 'hotel' && (
            <View style={styles.field}>
              <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>
                Title
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
                placeholder={`e.g., ${type === 'attraction' ? 'Eiffel Tower Visit' : type === 'food' ? 'Dinner at Café' : type === 'shopping' ? 'Local Market Shopping' : type === 'transport' ? 'Airport Taxi' : 'Expense / Activity'}`}
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
            </View>
          )}

          {/* Flight Details (Conditional) */}
          {type === 'flight' && (
            <View style={{ backgroundColor: colors.primary + '10', paddingVertical: 16, marginBottom: 20, borderRadius: 16, paddingHorizontal: 0 }}>
              
              {/* Flight Type Tabs */}
              <View style={[styles.field, { flexDirection: 'row', gap: 10, paddingHorizontal: 20 }]}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: flightType === 'direct' ? colors.primary : colors.inputBg }}
                  onPress={() => setFlightType('direct')}
                >
                  <Text style={[Typography.captionSemibold, { color: flightType === 'direct' ? '#fff' : colors.text }]}>Direct</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: flightType === 'connecting' ? colors.primary : colors.inputBg }}
                  onPress={() => setFlightType('connecting')}
                >
                  <Text style={[Typography.captionSemibold, { color: flightType === 'connecting' ? '#fff' : colors.text }]}>Connecting</Text>
                </TouchableOpacity>
              </View>


              <View style={{ marginBottom: 16, paddingHorizontal: 20 }}>
                <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Flight Type</Text>
                <View style={{ flexDirection: 'row', backgroundColor: colors.inputBg, borderRadius: 8, padding: 4 }}>
                  <TouchableOpacity 
                    style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: flightCategory === 'domestic' ? colors.primary : 'transparent' }}
                    onPress={() => setFlightCategory('domestic')}
                  >
                    <Text style={[Typography.captionSemibold, { color: flightCategory === 'domestic' ? '#FFF' : colors.text }]}>Domestic</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: flightCategory === 'international' ? colors.primary : 'transparent' }}
                    onPress={() => setFlightCategory('international')}
                  >
                    <Text style={[Typography.captionSemibold, { color: flightCategory === 'international' ? '#FFF' : colors.text }]}>International</Text>
                  </TouchableOpacity>
                </View>
              </View>
              


              {flightType === 'direct' ? (
                <View style={{ paddingHorizontal: 20 }}>
                  <View style={{ marginBottom: 16 }}>
                    <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Flight Name / Airline</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                      placeholder="e.g. Indigo 6E 123"
                      placeholderTextColor={colors.textMuted}
                      value={flightName}
                      onChangeText={setFlightName}
                    />
                  </View>
                  <View style={styles.row}>
                    <View style={[{ flex: 1, marginBottom: 12, marginRight: 8 }]}>
                      <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>From</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                        placeholder="e.g. JFK"
                        placeholderTextColor={colors.textMuted}
                        value={flightFrom}
                        onChangeText={setFlightFrom}
                      />
                    </View>
                    <View style={[{ flex: 1, marginBottom: 12 }]}>
                      <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>To</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                        placeholder="e.g. LHR"
                        placeholderTextColor={colors.textMuted}
                        value={flightTo}
                        onChangeText={setFlightTo}
                      />
                    </View>
                  </View>

                  <View style={[{ marginBottom: 12 }]}>
                    <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Departure (Date & Time)</Text>
                    <View style={styles.row}>
                      <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, marginRight: 8 }]} onPress={() => setShowDepDate(true)}>
                        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                        <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{formatDate(departureDateTime)}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1 }]} onPress={() => setShowDepTime(true)}>
                        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                        <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{formatTime(departureDateTime, state.settings.timeFormat)}</Text>
                      </TouchableOpacity>
                    </View>
                    <DualModeDatePickerModal
                      visible={showDepDate}
                      value={departureDateTime}
                      title="Departure Date"
                      theme={state.settings.theme}
                      onConfirm={(d) => setDepartureDateTime(d)}
                      onClose={() => setShowDepDate(false)}
                    />
                    <DualModeTimePickerModal
                      visible={showDepTime}
                      value={departureDateTime}
                      title="Departure Time"
                      timeFormat={state.settings.timeFormat}
                      theme={state.settings.theme}
                      onConfirm={(d) => setDepartureDateTime(d)}
                      onClose={() => setShowDepTime(false)}
                    />
                  </View>

                  <View style={[{ marginBottom: 0 }]}>
                    <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Arrival (Date & Time)</Text>
                    <View style={styles.row}>
                      <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, marginRight: 8 }]} onPress={() => setShowArrDate(true)}>
                        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                        <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{formatDate(arrivalDateTime)}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1 }]} onPress={() => setShowArrTime(true)}>
                        <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                        <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{formatTime(arrivalDateTime, state.settings.timeFormat)}</Text>
                      </TouchableOpacity>
                    </View>
                    <DualModeDatePickerModal
                      visible={showArrDate}
                      value={arrivalDateTime}
                      title="Arrival Date"
                      minimumDate={departureDateTime}
                      theme={state.settings.theme}
                      onConfirm={(d) => setArrivalDateTime(d)}
                      onClose={() => setShowArrDate(false)}
                    />
                    <DualModeTimePickerModal
                      visible={showArrTime}
                      value={arrivalDateTime}
                      title="Arrival Time"
                      timeFormat={state.settings.timeFormat}
                      theme={state.settings.theme}
                      onConfirm={(d) => setArrivalDateTime(d)}
                      onClose={() => setShowArrTime(false)}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Dep. Terminal</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder }]}
                        placeholder="e.g. T1"
                        placeholderTextColor={colors.textMuted}
                        value={departureTerminal}
                        onChangeText={setDepartureTerminal}
                      />
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Arr. Terminal</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder }]}
                        placeholder="e.g. T2"
                        placeholderTextColor={colors.textMuted}
                        value={arrivalTerminal}
                        onChangeText={setArrivalTerminal}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={{ paddingHorizontal: 20 }}>
                  {connections.map((conn, index) => (
                    <View key={index} style={{ marginBottom: 20, backgroundColor: colors.background, padding: 12, borderRadius: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={[Typography.captionSemibold, { color: colors.primary }]}>Flight Leg {index + 1}</Text>
                        {connections.length > 2 && (
                          <TouchableOpacity onPress={() => {
                            const newConns = [...connections];
                            newConns.splice(index, 1);
                            setConnections(newConns);
                          }}>
                            <Ionicons name="trash-outline" size={18} color={'#EF4444'} />
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      <View style={styles.row}>
                        <View style={[{ flex: 1, marginBottom: 12, marginRight: 8 }]}>
                          <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, fontSize: 10 }]}>From</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text, paddingVertical: 10 }]}
                            placeholder="JFK" placeholderTextColor={colors.textMuted}
                            value={conn.from}
                            onChangeText={(val) => {
                              const newConns = [...connections];
                              newConns[index].from = val;
                              setConnections(newConns);
                            }}
                          />
                        </View>
                        <View style={[{ flex: 1, marginBottom: 12 }]}>
                          <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, fontSize: 10 }]}>To</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text, paddingVertical: 10 }]}
                            placeholder="LHR" placeholderTextColor={colors.textMuted}
                            value={conn.to}
                            onChangeText={(val) => {
                              const newConns = [...connections];
                              newConns[index].to = val;
                              setConnections(newConns);
                              // Auto-fill next leg's From airport
                              if (index < connections.length - 1 && !connections[index + 1].from) {
                                newConns[index + 1].from = val;
                                setConnections(newConns);
                              }
                            }}
                          />
                        </View>
                      </View>

                      <View style={[{ marginBottom: 12 }]}>
                        <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, fontSize: 10 }]}>Departure (Date & Time)</Text>
                        <View style={styles.row}>
                          <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, marginRight: 8, paddingVertical: 10 }]} onPress={() => setActivePicker({ index, type: 'depDate' })}>
                            <Text style={[Typography.captionMedium, { color: colors.text }]}>{formatDate(conn.departureTime)}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, paddingVertical: 10 }]} onPress={() => setActivePicker({ index, type: 'depTime' })}>
                            <Text style={[Typography.captionMedium, { color: colors.text }]}>{formatTime(conn.departureTime, state.settings.timeFormat)}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={[{ marginBottom: 12 }]}>
                        <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, fontSize: 10 }]}>Arrival (Date & Time)</Text>
                        <View style={styles.row}>
                          <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, marginRight: 8, paddingVertical: 10 }]} onPress={() => setActivePicker({ index, type: 'arrDate' })}>
                            <Text style={[Typography.captionMedium, { color: colors.text }]}>{formatDate(conn.arrivalTime)}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, paddingVertical: 10 }]} onPress={() => setActivePicker({ index, type: 'arrTime' })}>
                            <Text style={[Typography.captionMedium, { color: colors.text }]}>{formatTime(conn.arrivalTime, state.settings.timeFormat)}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={{ marginBottom: 12 }}>
                        <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, fontSize: 10 }]}>FLIGHT NAME / AIRLINE</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder, paddingVertical: 10 }]}
                          placeholder="e.g. Indigo"
                          placeholderTextColor={colors.textMuted}
                          value={conn.flightName}
                          onChangeText={(t) => {
                            const newConns = [...connections];
                            newConns[index].flightName = t;
                            setConnections(newConns);
                          }}
                        />
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={[styles.field, { flex: 1 }]}>
                          <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, fontSize: 10 }]}>DEP. TERMINAL</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder, paddingVertical: 10 }]}
                            placeholder="e.g. T1"
                            placeholderTextColor={colors.textMuted}
                            value={conn.departureTerminal}
                            onChangeText={(t) => {
                              const newConns = [...connections];
                              newConns[index].departureTerminal = t;
                              setConnections(newConns);
                            }}
                          />
                        </View>
                        <View style={[styles.field, { flex: 1 }]}>
                          <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, fontSize: 10 }]}>ARR. TERMINAL</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder, paddingVertical: 10 }]}
                            placeholder="e.g. T2"
                            placeholderTextColor={colors.textMuted}
                            value={conn.arrivalTerminal}
                            onChangeText={(t) => {
                              const newConns = [...connections];
                              newConns[index].arrivalTerminal = t;
                              setConnections(newConns);
                            }}
                          />
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Active Picker Overlay for Connecting Flights */}
                  {activePicker && (
                    activePicker.type.endsWith('Date') ? (
                      <DualModeDatePickerModal
                        visible={true}
                        value={
                          activePicker.type.startsWith('dep')
                            ? connections[activePicker.index].departureTime
                            : connections[activePicker.index].arrivalTime
                        }
                        title={activePicker.type.startsWith('dep') ? 'Connecting Dep Date' : 'Connecting Arr Date'}
                        theme={state.settings.theme}
                        onConfirm={(d) => {
                          const newConns = [...connections];
                          if (activePicker.type.startsWith('dep')) {
                            newConns[activePicker.index].departureTime = d;
                          } else {
                            newConns[activePicker.index].arrivalTime = d;
                          }
                          setConnections(newConns);
                        }}
                        onClose={() => setActivePicker(null)}
                      />
                    ) : (
                      <DualModeTimePickerModal
                        visible={true}
                        value={
                          activePicker.type.startsWith('dep')
                            ? connections[activePicker.index].departureTime
                            : connections[activePicker.index].arrivalTime
                        }
                        title={activePicker.type.startsWith('dep') ? 'Departure Time' : 'Arrival Time'}
                        timeFormat={state.settings.timeFormat}
                        theme={state.settings.theme}
                        onConfirm={(d) => {
                          const newConns = [...connections];
                          if (activePicker.type.startsWith('dep')) {
                            newConns[activePicker.index].departureTime = d;
                          } else {
                            newConns[activePicker.index].arrivalTime = d;
                          }
                          setConnections(newConns);
                          setActivePicker(null);
                        }}
                        onClose={() => setActivePicker(null)}
                      />
                    )
                  )}

                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: colors.primary + '20', borderRadius: 12 }}
                    onPress={() => setConnections([...connections, { from: connections[connections.length - 1].to, to: '', departureTime: new Date(), arrivalTime: new Date(), flightName: '', departureTerminal: '', arrivalTerminal: '' }])}
                  >
                    <Ionicons name="add" size={16} color={colors.primary} />
                    <Text style={[Typography.captionSemibold, { color: colors.primary, marginLeft: 6 }]}>Add Flight Leg</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Hotel Details (Conditional) */}
          {type === 'hotel' && (
            <View style={{ backgroundColor: colors.primary + '10', paddingVertical: 16, marginBottom: 20, borderRadius: 16 }}>
              <View style={[styles.field, { marginBottom: 12 }]}>
                <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Hotel Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="e.g. The Ritz"
                  placeholderTextColor={colors.textMuted}
                  value={hotelName}
                  onChangeText={setHotelName}
                />
              </View>

              <View style={[styles.field, { marginBottom: 12 }]}>
                <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="e.g. 15 Place Vendôme"
                  placeholderTextColor={colors.textMuted}
                  value={hotelAddress}
                  onChangeText={setHotelAddress}
                />
              </View>

              <View style={[styles.field, { marginBottom: 12 }]}>
                <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>City</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="e.g. Paris"
                  placeholderTextColor={colors.textMuted}
                  value={hotelCity}
                  onChangeText={setHotelCity}
                />
              </View>

              <View style={[styles.field, { marginBottom: 12 }]}>
                <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Check-In (Date & Time)</Text>
                <View style={styles.row}>
                  <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, marginRight: 8 }]} onPress={() => setShowCheckInDate(true)}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                    <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{formatDate(checkInDateTime)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1 }]} onPress={() => setShowCheckInTime(true)}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{formatTime(checkInDateTime, state.settings.timeFormat)}</Text>
                  </TouchableOpacity>
                </View>
                <DualModeDatePickerModal
                  visible={showCheckInDate}
                  value={checkInDateTime}
                  title="Check-In Date"
                  theme={state.settings.theme}
                  onConfirm={(d) => setCheckInDateTime(d)}
                  onClose={() => setShowCheckInDate(false)}
                />
                <DualModeTimePickerModal
                  visible={showCheckInTime}
                  value={checkInDateTime}
                  title="Check-In Time"
                  timeFormat={state.settings.timeFormat}
                  theme={state.settings.theme}
                  onConfirm={(d) => setCheckInDateTime(d)}
                  onClose={() => setShowCheckInTime(false)}
                />
              </View>

              <View style={[styles.field, { marginBottom: 0 }]}>
                <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Check-Out (Date & Time)</Text>
                <View style={styles.row}>
                  <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, marginRight: 8 }]} onPress={() => setShowCheckOutDate(true)}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                    <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{formatDate(checkOutDateTime)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1 }]} onPress={() => setShowCheckOutTime(true)}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{formatTime(checkOutDateTime, state.settings.timeFormat)}</Text>
                  </TouchableOpacity>
                </View>
                <DualModeDatePickerModal
                  visible={showCheckOutDate}
                  value={checkOutDateTime}
                  title="Check-Out Date"
                  minimumDate={checkInDateTime}
                  theme={state.settings.theme}
                  onConfirm={(d) => setCheckOutDateTime(d)}
                  onClose={() => setShowCheckOutDate(false)}
                />
                <DualModeTimePickerModal
                  visible={showCheckOutTime}
                  value={checkOutDateTime}
                  title="Check-Out Time"
                  timeFormat={state.settings.timeFormat}
                  theme={state.settings.theme}
                  onConfirm={(d) => setCheckOutDateTime(d)}
                  onClose={() => setShowCheckOutTime(false)}
                />
              </View>

              <View style={[styles.field, { marginBottom: 12 }]}>
                <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Website / Booking Link (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="e.g. booking.com/hotel..."
                  placeholderTextColor={colors.textMuted}
                  value={hotelLink}
                  onChangeText={setHotelLink}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
            </View>
          )}

          {/* Date (Hidden for flight/hotel) */}
          {type !== 'flight' && type !== 'hotel' && (
            <View style={styles.field}>
              <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>
                Date
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                  },
                ]}
                onPress={() => setShowDatePicker(!showDatePicker)}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                <Text style={[Typography.body, { color: colors.text, marginLeft: 10 }]}>
                  {formatDate(date)}
                </Text>
              </TouchableOpacity>
              <DualModeDatePickerModal
                visible={showDatePicker}
                value={date}
                title="Select Date"
                theme={state.settings.theme}
                onConfirm={(d) => setDate(d)}
                onClose={() => setShowDatePicker(false)}
              />
            </View>
          )}

          {/* Attraction Times (Conditional) */}
          {type === 'attraction' && (
            <View style={[styles.field, { backgroundColor: colors.primary + '10', padding: 12, borderRadius: 12 }]}>
              <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Time (Start & End)</Text>
              <View style={styles.row}>
                <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, marginRight: 8 }]} onPress={() => setShowAttractionStartTime(true)}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{formatTime(attractionStartTime, state.settings.timeFormat)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1 }]} onPress={() => setShowAttractionEndTime(true)}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{formatTime(attractionEndTime, state.settings.timeFormat)}</Text>
                </TouchableOpacity>
              </View>
              <DualModeTimePickerModal
                visible={showAttractionStartTime}
                value={attractionStartTime}
                title="Start Time"
                timeFormat={state.settings.timeFormat}
                theme={state.settings.theme}
                onConfirm={(d) => setAttractionStartTime(d)}
                onClose={() => setShowAttractionStartTime(false)}
              />
              <DualModeTimePickerModal
                visible={showAttractionEndTime}
                value={attractionEndTime}
                title="End Time"
                timeFormat={state.settings.timeFormat}
                theme={state.settings.theme}
                onConfirm={(d) => setAttractionEndTime(d)}
                onClose={() => setShowAttractionEndTime(false)}
              />

              {/* Website / Booking Link */}
              <View style={{ marginTop: 10 }}>
                <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 6 }]}>
                  Website / Booking Link (Optional)
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, paddingHorizontal: 10 }}>
                  <Ionicons name="link-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                  <TextInput
                    style={{ flex: 1, color: colors.text, height: 40, fontSize: 13 }}
                    placeholder="e.g., https://booking.com or museum.org"
                    placeholderTextColor={colors.textMuted}
                    value={attractionLink}
                    onChangeText={setAttractionLink}
                    keyboardType="url"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Transport Details (Conditional) */}
          {type === 'transport' && (
            <View style={{ backgroundColor: colors.primary + '10', paddingVertical: 16, marginBottom: 20, borderRadius: 16 }}>
              {/* Route: From & To */}
              <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>From (Pickup)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder="e.g. Airport, Station"
                    placeholderTextColor={colors.textMuted}
                    value={transportFrom}
                    onChangeText={setTransportFrom}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>To (Dropoff)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    placeholder="e.g. Hotel, Spot"
                    placeholderTextColor={colors.textMuted}
                    value={transportTo}
                    onChangeText={setTransportTo}
                  />
                </View>
              </View>

              {/* Dropoff Address */}
              <View style={[styles.field, { marginBottom: 12 }]}>
                <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Dropoff Address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="e.g. 15 Place Vendôme"
                  placeholderTextColor={colors.textMuted}
                  value={transportDropOffAddress}
                  onChangeText={setTransportDropOffAddress}
                />
              </View>

              {/* Time */}
              <View style={[styles.field, { marginBottom: 0 }]}>
                <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Time (Pickup & Dropoff)</Text>
                <View style={styles.row}>
                  <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, marginRight: 8 }]} onPress={() => setShowTransportStartTime(true)}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{formatTime(transportStartTime, state.settings.timeFormat)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1 }]} onPress={() => setShowTransportEndTime(true)}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{formatTime(transportEndTime, state.settings.timeFormat)}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <DualModeTimePickerModal
                visible={showTransportStartTime}
                value={transportStartTime}
                title="Pickup Time"
                timeFormat={state.settings.timeFormat}
                theme={state.settings.theme}
                onConfirm={(d) => setTransportStartTime(d)}
                onClose={() => setShowTransportStartTime(false)}
              />
              <DualModeTimePickerModal
                visible={showTransportEndTime}
                value={transportEndTime}
                title="Dropoff Time"
                timeFormat={state.settings.timeFormat}
                theme={state.settings.theme}
                onConfirm={(d) => setTransportEndTime(d)}
                onClose={() => setShowTransportEndTime(false)}
              />
            </View>
          )}

          {/* Price */}
          <View style={styles.field}>
            <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>
              Price ({params.currency || 'USD'})
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
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>
              Notes
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.notesInput,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                },
              ]}
              placeholder="Add any notes, booking references, etc."
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              scrollEnabled={false}
            />
          </View>
          <DocumentManager documents={documents} onChange={setDocuments} theme={state.settings.theme} />
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
  row: {
    flexDirection: 'row',
    paddingHorizontal: 0,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
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
  notesInput: {
    minHeight: 120,
    paddingTop: 14,
  },
});
