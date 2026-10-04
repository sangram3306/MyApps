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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/theme/colors';
import { Typography } from '../src/theme/typography';
import { ENTRY_TYPE_META, ItineraryEntry, EntryType } from '../src/types';
import { toLocalDateString } from '../src/utils/date';
import * as Crypto from 'expo-crypto';
import DocumentManager from '../src/components/DocumentManager';

const ENTRY_TYPES: EntryType[] = ['flight', 'hotel', 'attraction', 'food', 'transport', 'other'];

export default function AddEntryScreen() {
  const { state, addEntry } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ tripId: string; currency: string }>();
  const colors = Colors[state.settings.theme];

  const [type, setType] = useState<EntryType>('flight');
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
  const [checkInDateTime, setCheckInDateTime] = useState(new Date());
  const [checkOutDateTime, setCheckOutDateTime] = useState(new Date());
  const [showCheckInDate, setShowCheckInDate] = useState(false);
  const [showCheckInTime, setShowCheckInTime] = useState(false);
  const [showCheckOutDate, setShowCheckOutDate] = useState(false);
  const [showCheckOutTime, setShowCheckOutTime] = useState(false);

  // Attraction-specific states
  const [attractionStartTime, setAttractionStartTime] = useState(new Date());
  const [attractionEndTime, setAttractionEndTime] = useState(new Date(new Date().setHours(new Date().getHours() + 2)));
  const [showAttractionStartTime, setShowAttractionStartTime] = useState(false);
  const [showAttractionEndTime, setShowAttractionEndTime] = useState(false);

  // Transport-specific states
  const [transportStartTime, setTransportStartTime] = useState(new Date());
  const [transportEndTime, setTransportEndTime] = useState(new Date(new Date().setHours(new Date().getHours() + 1)));
  const [showTransportStartTime, setShowTransportStartTime] = useState(false);
  const [showTransportEndTime, setShowTransportEndTime] = useState(false);

  // Documents state
  const [documents, setDocuments] = useState<any[]>([]);

  const formatDateTime = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric'
    }) + ' ' + d.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    });
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
            flightName: c.flightName.trim(),
            departureTerminal: c.departureTerminal.trim(),
            arrivalTerminal: c.arrivalTerminal.trim(),
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
        }
      }),
      ...(type === 'attraction' && {
        attractionDetails: {
          startTime: new Date(new Date(date).setHours(attractionStartTime.getHours(), attractionStartTime.getMinutes())).toISOString(),
          endTime: new Date(new Date(date).setHours(attractionEndTime.getHours(), attractionEndTime.getMinutes())).toISOString(),
        }
      }),
      ...(type === 'transport' && {
        transportDetails: {
          startTime: new Date(new Date(date).setHours(transportStartTime.getHours(), transportStartTime.getMinutes())).toISOString(),
          endTime: new Date(new Date(date).setHours(transportEndTime.getHours(), transportEndTime.getMinutes())).toISOString(),
        }
      })
    };

    await addEntry(entry);
    router.back();
  };

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

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
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
                placeholder={`e.g., ${type === 'attraction' ? 'Eiffel Tower Visit' : type === 'food' ? 'Dinner at Café' : type === 'transport' ? 'Airport Taxi' : 'Activity'}`}
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
                        <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{departureDateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                      </TouchableOpacity>
                    </View>
                    {showDepDate && (
                      <DateTimePicker value={departureDateTime} mode="date" display="spinner"
                        onValueChange={(e, d) => { if(d) setDepartureDateTime(d); if(Platform.OS === 'android') setShowDepDate(false); }} />
                    )}
                    {showDepTime && (
                      <DateTimePicker value={departureDateTime} mode="time" display="spinner"
                        onValueChange={(e, d) => { if(d) setDepartureDateTime(d); if(Platform.OS === 'android') setShowDepTime(false); }} />
                    )}
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
                        <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{arrivalDateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                      </TouchableOpacity>
                    </View>
                    {showArrDate && (
                      <DateTimePicker value={arrivalDateTime} mode="date" display="spinner"
                        onValueChange={(e, d) => { if(d) setArrivalDateTime(d); if(Platform.OS === 'android') setShowArrDate(false); }} />
                    )}
                    {showArrTime && (
                      <DateTimePicker value={arrivalDateTime} mode="time" display="spinner"
                        onValueChange={(e, d) => { if(d) setArrivalDateTime(d); if(Platform.OS === 'android') setShowArrTime(false); }} />
                    )}
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
                            <Text style={[Typography.captionMedium, { color: colors.text }]}>{conn.departureTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={[{ marginBottom: 0 }]}>
                        <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, fontSize: 10 }]}>Arrival (Date & Time)</Text>
                        <View style={styles.row}>
                          <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, marginRight: 8, paddingVertical: 10 }]} onPress={() => setActivePicker({ index, type: 'arrDate' })}>
                            <Text style={[Typography.captionMedium, { color: colors.text }]}>{formatDate(conn.arrivalTime)}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, paddingVertical: 10 }]} onPress={() => setActivePicker({ index, type: 'arrTime' })}>
                            <Text style={[Typography.captionMedium, { color: colors.text }]}>{conn.arrivalTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Active Picker Overlay for Connecting Flights */}
                  {activePicker && (
                    <DateTimePicker
                      value={
                        activePicker.type.startsWith('dep')
                          ? connections[activePicker.index].departureTime
                          : connections[activePicker.index].arrivalTime
                      }
                      mode={activePicker.type.endsWith('Date') ? 'date' : 'time'}
                      display="spinner"
                      onValueChange={(e, d) => {
                        if (d) {
                          const newConns = [...connections];
                          if (activePicker.type.startsWith('dep')) {
                            newConns[activePicker.index].departureTime = d;
                          } else {
                            newConns[activePicker.index].arrivalTime = d;
                          }
                          setConnections(newConns);
                        }
                        if (Platform.OS === 'android') setActivePicker(null);
                      }}
                    />
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
                    <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{checkInDateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                  </TouchableOpacity>
                </View>
                {showCheckInDate && (
                  <DateTimePicker value={checkInDateTime} mode="date" display="spinner"
                    onValueChange={(e, d) => { if(d) setCheckInDateTime(d); if(Platform.OS === 'android') setShowCheckInDate(false); }} />
                )}
                {showCheckInTime && (
                  <DateTimePicker value={checkInDateTime} mode="time" display="spinner"
                    onValueChange={(e, d) => { if(d) setCheckInDateTime(d); if(Platform.OS === 'android') setShowCheckInTime(false); }} />
                )}
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
                    <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{checkOutDateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                  </TouchableOpacity>
                </View>
                {showCheckOutDate && (
                  <DateTimePicker value={checkOutDateTime} mode="date" display="spinner"
                    onValueChange={(e, d) => { if(d) setCheckOutDateTime(d); if(Platform.OS === 'android') setShowCheckOutDate(false); }} />
                )}
                {showCheckOutTime && (
                  <DateTimePicker value={checkOutDateTime} mode="time" display="spinner"
                    onValueChange={(e, d) => { if(d) setCheckOutDateTime(d); if(Platform.OS === 'android') setShowCheckOutTime(false); }} />
                )}
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
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="spinner"
                  onValueChange={(event, d) => {
                    if (d) setDate(d);
                    if (Platform.OS === 'android') setShowDatePicker(false);
                  }}
                  textColor={colors.text}
                />
              )}
            </View>
          )}

          {/* Attraction Times (Conditional) */}
          {type === 'attraction' && (
            <View style={[styles.field, { backgroundColor: colors.primary + '10', padding: 12, borderRadius: 12 }]}>
              <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Time (Start & End)</Text>
              <View style={styles.row}>
                <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, marginRight: 8 }]} onPress={() => setShowAttractionStartTime(true)}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{attractionStartTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1 }]} onPress={() => setShowAttractionEndTime(true)}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{attractionEndTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                </TouchableOpacity>
              </View>
              {showAttractionStartTime && (
                <DateTimePicker value={attractionStartTime} mode="time" display="spinner"
                  onValueChange={(e, d) => { if(d) setAttractionStartTime(d); if(Platform.OS === 'android') setShowAttractionStartTime(false); }} />
              )}
              {showAttractionEndTime && (
                <DateTimePicker value={attractionEndTime} mode="time" display="spinner"
                  onValueChange={(e, d) => { if(d) setAttractionEndTime(d); if(Platform.OS === 'android') setShowAttractionEndTime(false); }} />
              )}
            </View>
          )}

          {/* Transport Times (Conditional) */}
          {type === 'transport' && (
            <View style={[styles.field, { backgroundColor: colors.primary + '10', padding: 12, borderRadius: 12 }]}>
              <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Time (Pickup & Dropoff)</Text>
              <View style={styles.row}>
                <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, marginRight: 8 }]} onPress={() => setShowTransportStartTime(true)}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{transportStartTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1 }]} onPress={() => setShowTransportEndTime(true)}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{transportEndTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                </TouchableOpacity>
              </View>
              {showTransportStartTime && (
                <DateTimePicker value={transportStartTime} mode="time" display="spinner"
                  onValueChange={(e, d) => { if(d) setTransportStartTime(d); if(Platform.OS === 'android') setShowTransportStartTime(false); }} />
              )}
              {showTransportEndTime && (
                <DateTimePicker value={transportEndTime} mode="time" display="spinner"
                  onValueChange={(e, d) => { if(d) setTransportEndTime(d); if(Platform.OS === 'android') setShowTransportEndTime(false); }} />
              )}
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
    height: 120,
    paddingTop: 14,
  },
});
