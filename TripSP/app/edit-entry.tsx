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
  ImageBackground,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/context/AppContext';
import { Colors } from '../src/theme/colors';
import { Typography } from '../src/theme/typography';
import { EntryType, ENTRY_TYPE_META } from '../src/types';
import { toLocalDateString, formatTime } from '../src/utils/date';
import DocumentManager from '../src/components/DocumentManager';
import { getEntryImages, saveEntryImages } from '../src/storage/asyncStorage';
import DualModeTimePickerModal from '../src/components/DualModeTimePickerModal';
import DualModeDatePickerModal from '../src/components/DualModeDatePickerModal';

const ENTRY_TYPES: EntryType[] = ['flight', 'hotel', 'attraction', 'food', 'transport', 'shopping', 'other'];

export default function EditEntryScreen() {
  const { state, updateEntry, deleteEntry } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{
    entryId?: string;
    id?: string;
    tripId?: string;
    type?: string;
    title?: string;
    date?: string;
    price?: string;
    currency?: string;
    notes?: string;
  }>();
  const colors = Colors[state.settings.theme];

  const targetEntryId = params.entryId || params.id || '';
  const existingEntry = state.entries.find(e => e.id === targetEntryId);

  const [isEditing, setIsEditing] = useState(false);
  const [type, setType] = useState<EntryType>(existingEntry?.type || (params.type as EntryType) || 'flight');
  const [title, setTitle] = useState(existingEntry?.title || params.title || '');
  const [date, setDate] = useState(
    existingEntry?.date
      ? new Date(existingEntry.date + 'T00:00:00')
      : params.date
      ? new Date(params.date + 'T00:00:00')
      : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [price, setPrice] = useState(existingEntry?.price !== undefined ? String(existingEntry.price) : params.price || '');
  const [notes, setNotes] = useState(existingEntry?.notes || params.notes || '');
  const [entryImageUri, setEntryImageUri] = useState<string | null>(null);

  React.useEffect(() => {
    getEntryImages().then(map => {
      if (targetEntryId && map[targetEntryId]) {
        setEntryImageUri(map[targetEntryId]);
      }
    });
  }, [targetEntryId]);

  const launchPicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const fileName = `entry_img_${encodeURIComponent(targetEntryId)}.jpg`;
      const newUri = FileSystem.documentDirectory + fileName;

      try {
        await FileSystem.copyAsync({ from: asset.uri, to: newUri });
        setEntryImageUri(newUri);
        const map = await getEntryImages();
        map[targetEntryId] = newUri;
        await saveEntryImages(map);
      } catch (err) {
        console.error('Failed to save entry image', err);
      }
    }
  };

  const handlePickImage = () => {
    if (!isEditing) return;
    if (entryImageUri) {
      Alert.alert(
        'Cover Photo',
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Remove Photo', 
            style: 'destructive', 
            onPress: async () => {
              setEntryImageUri(null);
              const map = await getEntryImages();
              delete map[targetEntryId];
              await saveEntryImages(map);
            }
          },
          { text: 'Change Photo', onPress: launchPicker }
        ]
      );
    } else {
      launchPicker();
    }
  };
  
  const [documents, setDocuments] = useState<any[]>(existingEntry?.documents || []);
  const flightDetails = existingEntry?.flightDetails;

  // Flight-specific states
  const [flightType, setFlightType] = useState<'direct' | 'connecting'>(flightDetails?.isConnecting ? 'connecting' : 'direct');
  // For Direct flights
  const [flightFrom, setFlightFrom] = useState(flightDetails?.from || '');
  const [flightName, setFlightName] = useState(flightDetails?.flightName || '');
  const [flightCategory, setFlightCategory] = useState<'domestic' | 'international'>(flightDetails?.flightType || 'domestic');
  const [flightTo, setFlightTo] = useState(flightDetails?.to || '');
  const [departureTerminal, setDepartureTerminal] = useState(flightDetails?.departureTerminal || '');
  const [arrivalTerminal, setArrivalTerminal] = useState(flightDetails?.arrivalTerminal || '');
  const [departureDateTime, setDepartureDateTime] = useState(flightDetails?.departureTime ? new Date(flightDetails.departureTime) : new Date());
  const [arrivalDateTime, setArrivalDateTime] = useState(flightDetails?.arrivalTime ? new Date(flightDetails.arrivalTime) : new Date());
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
  }>>(
    flightDetails?.isConnecting && flightDetails.connections ? 
    flightDetails.connections.map(c => ({
      from: c.from,
      to: c.to,
      departureTime: new Date(c.departureTime),
      arrivalTime: new Date(c.arrivalTime),
      flightName: c.flightName || '',
      departureTerminal: c.departureTerminal || '',
      arrivalTerminal: c.arrivalTerminal || ''
    })) : 
    [
      { from: flightDetails?.from || '', to: '', departureTime: flightDetails?.departureTime ? new Date(flightDetails.departureTime) : new Date(), arrivalTime: flightDetails?.arrivalTime ? new Date(flightDetails.arrivalTime) : new Date(), flightName: flightDetails?.flightName || '', departureTerminal: flightDetails?.departureTerminal || '', arrivalTerminal: flightDetails?.arrivalTerminal || '' },
      { from: '', to: flightDetails?.to || '', departureTime: new Date(), arrivalTime: new Date(), flightName: '', departureTerminal: '', arrivalTerminal: '' },
    ]
  );
  // Date picker state for dynamic connections list
  const [activePicker, setActivePicker] = useState<{ index: number; type: 'depDate' | 'depTime' | 'arrDate' | 'arrTime' } | null>(null);

  const hotelDetails = existingEntry?.hotelDetails;

  // Hotel-specific states
  const [hotelName, setHotelName] = useState(hotelDetails?.name || '');
  const [hotelAddress, setHotelAddress] = useState(hotelDetails?.address || '');
  const [hotelCity, setHotelCity] = useState(hotelDetails?.city || '');
  const [checkInDateTime, setCheckInDateTime] = useState(hotelDetails?.checkInTime ? new Date(hotelDetails.checkInTime) : new Date());
  const [checkOutDateTime, setCheckOutDateTime] = useState(hotelDetails?.checkOutTime ? new Date(hotelDetails.checkOutTime) : new Date());
  const [showCheckInDate, setShowCheckInDate] = useState(false);
  const [showCheckInTime, setShowCheckInTime] = useState(false);
  const [showCheckOutDate, setShowCheckOutDate] = useState(false);
  const [showCheckOutTime, setShowCheckOutTime] = useState(false);

  const attractionDetails = existingEntry?.attractionDetails;
  const [attractionStartTime, setAttractionStartTime] = useState(attractionDetails?.startTime ? new Date(attractionDetails.startTime) : new Date());
  const [attractionEndTime, setAttractionEndTime] = useState(attractionDetails?.endTime ? new Date(attractionDetails.endTime) : new Date(new Date().setHours(new Date().getHours() + 2)));
  const [attractionLink, setAttractionLink] = useState(attractionDetails?.link || '');
  const [showAttractionStartTime, setShowAttractionStartTime] = useState(false);
  const [showAttractionEndTime, setShowAttractionEndTime] = useState(false);

  const transportDetails = existingEntry?.transportDetails;
  const [transportStartTime, setTransportStartTime] = useState(transportDetails?.startTime ? new Date(transportDetails.startTime) : new Date());
  const [transportEndTime, setTransportEndTime] = useState(transportDetails?.endTime ? new Date(transportDetails.endTime) : new Date(new Date().setHours(new Date().getHours() + 1)));
  const [showTransportStartTime, setShowTransportStartTime] = useState(false);
  const [showTransportEndTime, setShowTransportEndTime] = useState(false);
  const [transportFrom, setTransportFrom] = useState(transportDetails?.from || '');
  const [transportTo, setTransportTo] = useState(transportDetails?.to || '');
  const [transportDropOffAddress, setTransportDropOffAddress] = useState(transportDetails?.dropOffAddress || '');

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

  React.useEffect(() => {
    if (existingEntry && !isEditing) {
      setType(existingEntry.type);
      setTitle(existingEntry.title || '');
      setDate(new Date(existingEntry.date + 'T00:00:00' || new Date()));
      setPrice(String(existingEntry.price || ''));
      setNotes(existingEntry.notes || '');
      setDocuments(existingEntry.documents || []);

      if (existingEntry.flightDetails) {
        setFlightType(existingEntry.flightDetails.isConnecting ? 'connecting' : 'direct');
        setFlightFrom(existingEntry.flightDetails.from || '');
        setFlightTo(existingEntry.flightDetails.to || '');
        setFlightName(existingEntry.flightDetails.flightName || '');
        setFlightCategory(existingEntry.flightDetails.flightType || 'domestic');
        setDepartureTerminal(existingEntry.flightDetails.departureTerminal || '');
        setArrivalTerminal(existingEntry.flightDetails.arrivalTerminal || '');
        if (existingEntry.flightDetails.departureTime) setDepartureDateTime(new Date(existingEntry.flightDetails.departureTime));
        if (existingEntry.flightDetails.arrivalTime) setArrivalDateTime(new Date(existingEntry.flightDetails.arrivalTime));
        
        if (existingEntry.flightDetails.connections) {
          setConnections(existingEntry.flightDetails.connections.map(c => ({
            from: c.from,
            to: c.to,
            departureTime: new Date(c.departureTime),
            arrivalTime: new Date(c.arrivalTime),
            flightName: c.flightName || '',
            departureTerminal: c.departureTerminal || '',
            arrivalTerminal: c.arrivalTerminal || ''
          })));
        }
      }

      if (existingEntry.hotelDetails) {
        setHotelName(existingEntry.hotelDetails.name || '');
        setHotelAddress(existingEntry.hotelDetails.address || '');
        setHotelCity(existingEntry.hotelDetails.city || '');
        if (existingEntry.hotelDetails.checkInTime) setCheckInDateTime(new Date(existingEntry.hotelDetails.checkInTime));
        if (existingEntry.hotelDetails.checkOutTime) setCheckOutDateTime(new Date(existingEntry.hotelDetails.checkOutTime));
      }

      if (existingEntry.attractionDetails) {
        if (existingEntry.attractionDetails.startTime) setAttractionStartTime(new Date(existingEntry.attractionDetails.startTime));
        if (existingEntry.attractionDetails.endTime) setAttractionEndTime(new Date(existingEntry.attractionDetails.endTime));
      }

      if (existingEntry.transportDetails) {
        if (existingEntry.transportDetails.startTime) setTransportStartTime(new Date(existingEntry.transportDetails.startTime));
        if (existingEntry.transportDetails.endTime) setTransportEndTime(new Date(existingEntry.transportDetails.endTime));
        setTransportFrom(existingEntry.transportDetails.from || '');
        setTransportTo(existingEntry.transportDetails.to || '');
        setTransportDropOffAddress(existingEntry.transportDetails.dropOffAddress || '');
      }
    }
  }, [existingEntry, isEditing]);


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

    await updateEntry({
      id: targetEntryId,
      tripId: existingEntry?.tripId || params.tripId || '',
      type,
      title: finalTitle,
      date: toLocalDateString(finalDate),
      price: parseFloat(price) || 0,
      currency: existingEntry?.currency || params.currency || state.settings.selectedCurrencies[0] || 'USD',
      notes: notes.trim(),
      createdAt: existingEntry?.createdAt || new Date().toISOString(),
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
          localName: existingEntry?.hotelDetails?.localName,
          localAddress: existingEntry?.hotelDetails?.localAddress,
          customGpsUrl: existingEntry?.hotelDetails?.customGpsUrl,
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
          localName: existingEntry?.transportDetails?.localName,
          localAddress: existingEntry?.transportDetails?.localAddress,
          customGpsUrl: existingEntry?.transportDetails?.customGpsUrl,
        }
      })
    });

    Keyboard.dismiss();
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete Entry', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(targetEntryId);
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {(type === 'hotel' || type === 'attraction') ? (
          <View style={{ width: '100%', height: 260 }}>
            {entryImageUri ? (
              <ImageBackground 
                source={{ uri: entryImageUri }} 
                style={{ width: '100%', height: '100%', justifyContent: 'space-between', paddingBottom: 16 }}
                imageStyle={{ resizeMode: 'cover' }}
              >
                <View style={[styles.header, { backgroundColor: 'transparent' }]}>
                  <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="close" size={24} color="#FFF" style={{ textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }} />
                  </TouchableOpacity>
                  <Text style={[Typography.h3, { color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }]}>{isEditing ? 'Edit Entry' : 'View Entry'}</Text>
                  {isEditing ? (
                    <TouchableOpacity onPress={handleSave}>
                      <Text style={[Typography.button, { color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }]}>Save</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => setIsEditing(true)}>
                      <Text style={[Typography.button, { color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }]}>Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {isEditing && (
                  <TouchableOpacity
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20, alignSelf: 'flex-end', marginRight: 16 }}
                    onPress={handlePickImage}
                  >
                    <Ionicons name="camera" size={24} color="#FFF" />
                  </TouchableOpacity>
                )}
              </ImageBackground>
            ) : (
              <View style={{ width: '100%', height: '100%', backgroundColor: colors.primary + '10', justifyContent: 'space-between' }}>
                <View style={[styles.header, { backgroundColor: 'transparent' }]}>
                  <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={[Typography.h3, { color: colors.text }]}>{isEditing ? 'Edit Entry' : 'View Entry'}</Text>
                  {isEditing ? (
                    <TouchableOpacity onPress={handleSave}>
                      <Text style={[Typography.button, { color: colors.primary }]}>Save</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => setIsEditing(true)}>
                      <Text style={[Typography.button, { color: colors.primary }]}>Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {isEditing && (
                  <View style={{ alignItems: 'center', paddingBottom: 36 }}>
                    <TouchableOpacity
                      style={{ backgroundColor: colors.primary + '20', padding: 16, borderRadius: 30, alignItems: 'center' }}
                      onPress={handlePickImage}
                    >
                      <Ionicons name="camera-outline" size={32} color={colors.primary} />
                      <Text style={[Typography.captionSemibold, { color: colors.primary, marginTop: 8 }]}>Add Cover Photo</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[Typography.h3, { color: colors.text }]}>{isEditing ? 'Edit Entry' : 'View Entry'}</Text>
            {isEditing ? (
              <TouchableOpacity onPress={handleSave}>
                <Text style={[Typography.button, { color: colors.primary }]}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={[Typography.button, { color: colors.primary }]}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 20 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >


          {/* Title (Hidden for flight/hotel) */}
          {type !== 'flight' && type !== 'hotel' && (
            <View style={styles.field}>
              <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>
                Title
              </Text>
              <TextInput editable={isEditing}
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
              
              {isEditing ? (
                <>
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
                  

                </>
              ) : (
                <>
                  <View style={{ marginBottom: 16, paddingHorizontal: 20 }}>
                    <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 4 }]}>Route</Text>
                    <Text style={[Typography.body, { color: colors.text }]}>{flightType === 'direct' ? 'Direct' : 'Connecting'}</Text>
                  </View>
                  <View style={{ marginBottom: 16, paddingHorizontal: 20 }}>
                    <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 4 }]}>Flight Type</Text>
                    <Text style={[Typography.body, { color: colors.text }]}>{flightCategory === 'international' ? 'International' : 'Domestic'}</Text>
                  </View>

                </>
              )}

              {flightType === 'direct' ? (
                <View style={{ paddingHorizontal: 20 }}>
                  {isEditing ? (
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
                  ) : (
                    !!flightName && (
                      <View style={{ marginBottom: 16 }}>
                        <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 4 }]}>Flight Name / Airline</Text>
                        <Text style={[Typography.body, { color: colors.text }]}>{flightName}</Text>
                      </View>
                    )
                  )}
                  <View style={styles.row}>
                    <View style={[{ flex: 1, marginBottom: 12, marginRight: 8 }]}>
                      <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>From</Text>
                      <TextInput editable={isEditing}
                        style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                        placeholder="e.g. JFK"
                        placeholderTextColor={colors.textMuted}
                        value={flightFrom}
                        onChangeText={setFlightFrom}
                      />
                    </View>
                    <View style={[{ flex: 1, marginBottom: 12 }]}>
                      <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>To</Text>
                      <TextInput editable={isEditing}
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
                      <TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', flex: 1, marginRight: 8, paddingHorizontal: isEditing ? 12 : 0 }]} onPress={() => setShowDepDate(true)}>
                        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                        <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{formatDate(departureDateTime)}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', flex: 1, paddingHorizontal: isEditing ? 12 : 0 }]} onPress={() => setShowDepTime(true)}>
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
                      <TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', flex: 1, marginRight: 8, paddingHorizontal: isEditing ? 12 : 0 }]} onPress={() => setShowArrDate(true)}>
                        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                        <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{formatDate(arrivalDateTime)}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', flex: 1, paddingHorizontal: isEditing ? 12 : 0 }]} onPress={() => setShowArrTime(true)}>
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

                  {isEditing ? (
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
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
                  ) : (
                    (departureTerminal || arrivalTerminal) && (
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 0 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 4 }]}>Dep. Terminal</Text>
                          <Text style={[Typography.body, { color: colors.text }]}>{departureTerminal || '-'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 4 }]}>Arr. Terminal</Text>
                          <Text style={[Typography.body, { color: colors.text }]}>{arrivalTerminal || '-'}</Text>
                        </View>
                      </View>
                    )
                  )}
                </View>
              ) : (
                <View style={{ paddingHorizontal: 20 }}>
                  {connections.map((conn, index) => (
                    <View key={index} style={{ marginBottom: 20, backgroundColor: colors.background, padding: 12, borderRadius: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={[Typography.captionSemibold, { color: colors.primary }]}>Flight Leg {index + 1}</Text>
                        {isEditing && connections.length > 2 && (
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
                          <TextInput editable={isEditing}
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
                          <TextInput editable={isEditing}
                            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text, paddingVertical: 10 }]}
                            placeholder="LHR" placeholderTextColor={colors.textMuted}
                            value={conn.to}
                            onChangeText={(val) => {
                              const newConns = [...connections];
                              newConns[index].to = val;
                              setConnections(newConns);
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
                          <TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, marginRight: 8, paddingVertical: 10 }]} onPress={() => setActivePicker({ index, type: 'depDate' })}>
                            <Text style={[Typography.captionMedium, { color: colors.text }]}>{formatDate(conn.departureTime)}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, paddingVertical: 10 }]} onPress={() => setActivePicker({ index, type: 'depTime' })}>
                            <Text style={[Typography.captionMedium, { color: colors.text }]}>{formatTime(conn.departureTime, state.settings.timeFormat)}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={[{ marginBottom: 16 }]}>
                        <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, fontSize: 10 }]}>Arrival (Date & Time)</Text>
                        <View style={styles.row}>
                          <TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, marginRight: 8, paddingVertical: 10 }]} onPress={() => setActivePicker({ index, type: 'arrDate' })}>
                            <Text style={[Typography.captionMedium, { color: colors.text }]}>{formatDate(conn.arrivalTime)}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1, paddingVertical: 10 }]} onPress={() => setActivePicker({ index, type: 'arrTime' })}>
                            <Text style={[Typography.captionMedium, { color: colors.text }]}>{formatTime(conn.arrivalTime, state.settings.timeFormat)}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={{ marginBottom: 12 }}>
                        <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, fontSize: 10 }]}>FLIGHT NAME / AIRLINE</Text>
                        <TextInput
                          editable={isEditing}
                          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder, paddingVertical: 10 }]}
                          placeholder={isEditing ? "e.g. Indigo" : "-"}
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
                            editable={isEditing}
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder, paddingVertical: 10 }]}
                            placeholder={isEditing ? "e.g. T1" : "-"}
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
                            editable={isEditing}
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder, paddingVertical: 10 }]}
                            placeholder={isEditing ? "e.g. T2" : "-"}
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

                  {isEditing && (
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: colors.primary + '20', borderRadius: 12 }}
                      onPress={() => setConnections([...connections, { from: connections[connections.length - 1].to, to: '', departureTime: new Date(), arrivalTime: new Date(), flightName: '', departureTerminal: '', arrivalTerminal: '' }])}
                    >
                      <Ionicons name="add" size={16} color={colors.primary} />
                      <Text style={[Typography.captionSemibold, { color: colors.primary, marginLeft: 6 }]}>Add Flight Leg</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Hotel Details (Conditional) */}
          {type === 'hotel' && (
            <View style={{ backgroundColor: colors.primary + '10', paddingVertical: 16, marginBottom: 20, borderRadius: 16 }}>
              <View style={[styles.field, { marginBottom: 12 }]}>
                <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Hotel Name</Text>
                <TextInput editable={isEditing}
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="e.g. The Ritz"
                  placeholderTextColor={colors.textMuted}
                  value={hotelName}
                  onChangeText={setHotelName}
                />
              </View>

              <View style={[styles.field, { marginBottom: 12 }]}>
                <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Address</Text>
                <TextInput editable={isEditing}
                  style={[styles.input, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', color: colors.text, paddingHorizontal: isEditing ? 12 : 0 }]}
                  placeholder="e.g. 15 Place Vendôme"
                  placeholderTextColor={colors.textMuted}
                  value={hotelAddress}
                  onChangeText={setHotelAddress}
                />
              </View>

              <View style={[styles.field, { marginBottom: 12 }]}>
                <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>City</Text>
                <TextInput editable={isEditing}
                  style={[styles.input, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', color: colors.text, paddingHorizontal: isEditing ? 12 : 0 }]}
                  placeholder="e.g. Paris"
                  placeholderTextColor={colors.textMuted}
                  value={hotelCity}
                  onChangeText={setHotelCity}
                />
              </View>

              <View style={[styles.field, { marginBottom: 12 }]}>
                <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>Check-In (Date & Time)</Text>
                <View style={styles.row}>
                  <TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', flex: 1, marginRight: 8, paddingHorizontal: isEditing ? 12 : 0 }]} onPress={() => setShowCheckInDate(true)}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                    <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{formatDate(checkInDateTime)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', flex: 1, paddingHorizontal: isEditing ? 12 : 0 }]} onPress={() => setShowCheckInTime(true)}>
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
                  <TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', flex: 1, marginRight: 8, paddingHorizontal: isEditing ? 12 : 0 }]} onPress={() => setShowCheckOutDate(true)}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                    <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{formatDate(checkOutDateTime)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', flex: 1, paddingHorizontal: isEditing ? 12 : 0 }]} onPress={() => setShowCheckOutTime(true)}>
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
                <TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', flex: 1, marginRight: 8, paddingHorizontal: isEditing ? 12 : 0 }]} onPress={() => setShowAttractionStartTime(true)}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{formatTime(attractionStartTime, state.settings.timeFormat)}</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', flex: 1, paddingHorizontal: isEditing ? 12 : 0 }]} onPress={() => setShowAttractionEndTime(true)}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isEditing ? colors.inputBg : 'transparent', borderWidth: isEditing ? 1 : 0, borderColor: isEditing ? colors.inputBorder : 'transparent', borderRadius: 10, paddingHorizontal: isEditing ? 10 : 0 }}>
                  <Ionicons name="link-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                  <TextInput
                    editable={isEditing}
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
                  <TextInput editable={isEditing}
                    style={[styles.input, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', color: colors.text, paddingHorizontal: isEditing ? 12 : 0 }]}
                    placeholder="e.g. Airport, Station"
                    placeholderTextColor={colors.textMuted}
                    value={transportFrom}
                    onChangeText={setTransportFrom}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>To (Dropoff)</Text>
                  <TextInput editable={isEditing}
                    style={[styles.input, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', color: colors.text, paddingHorizontal: isEditing ? 12 : 0 }]}
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
                <TextInput editable={isEditing}
                  style={[styles.input, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', color: colors.text, paddingHorizontal: isEditing ? 12 : 0 }]}
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
                  <TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', flex: 1, marginRight: 8, paddingHorizontal: isEditing ? 12 : 0 }]} onPress={() => setShowTransportStartTime(true)}>
                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                    <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>{formatTime(transportStartTime, state.settings.timeFormat)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity disabled={!isEditing} style={[styles.dateButton, { backgroundColor: isEditing ? colors.inputBg : 'transparent', borderColor: isEditing ? colors.inputBorder : 'transparent', flex: 1, paddingHorizontal: isEditing ? 12 : 0 }]} onPress={() => setShowTransportEndTime(true)}>
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
            <TextInput editable={isEditing}
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                },
              ]}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>
              Notes
            </Text>
            {isEditing ? (
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
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder="Add notes..."
                placeholderTextColor={colors.textMuted}
                scrollEnabled={false}
              />
            ) : (
              <View
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    minHeight: 100,
                    paddingTop: 14,
                    paddingBottom: 14,
                  },
                ]}
              >
                <Text
                  style={[
                    Typography.body,
                    {
                      color: notes ? colors.text : colors.textMuted,
                      lineHeight: 22,
                    },
                  ]}
                  selectable={true}
                >
                  {notes || 'No notes added'}
                </Text>
              </View>
            )}
          </View>

          <DocumentManager 
            documents={documents} 
            onChange={setDocuments} 
            theme={state.settings.theme} 
            editable={isEditing}
          />

          {/* Delete Button */}
          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: colors.error + '15' }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={[Typography.button, { color: colors.error, marginLeft: 8 }]}>
              Delete Entry
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
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
  },
});
