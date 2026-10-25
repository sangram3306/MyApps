import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface TaxiDriverCardModalProps {
  visible: boolean;
  onClose: () => void;
  hotelName: string;
  hotelAddress: string;
  hotelCity?: string;
  hotelPhone?: string;
  localName?: string;
  localAddress?: string;
  customGpsUrl?: string;
  countryOrCityHint?: string;
  onSaveLocalDetails?: (localName: string, localAddress: string, customGpsUrl?: string) => Promise<void>;
  theme: 'light' | 'dark';
}

const isMapLinkOrCoords = (str?: string): boolean => {
  if (!str) return false;
  const s = str.trim();
  if (/^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.|google\.[a-z.]+\/maps|maps\.apple\.com|waze\.com)/i.test(s)) return true;
  if (/^https?:\/\//i.test(s) && (s.includes('maps') || s.includes('geo') || s.includes('location') || s.includes('place'))) return true;
  if (/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/.test(s)) return true;
  return false;
};

export default function TaxiDriverCardModal({
  visible,
  onClose,
  hotelName,
  hotelAddress,
  hotelCity,
  hotelPhone,
  localName: initialLocalName,
  localAddress: initialLocalAddress,
  customGpsUrl: initialCustomGpsUrl,
  countryOrCityHint,
  onSaveLocalDetails,
  theme,
}: TaxiDriverCardModalProps) {
  const colors = Colors[theme];

  // Local language name, address, and custom GPS state
  const [currentLocalName, setCurrentLocalName] = useState(initialLocalName || '');
  const [currentLocalAddress, setCurrentLocalAddress] = useState(initialLocalAddress || '');
  const [currentCustomGpsUrl, setCurrentCustomGpsUrl] = useState(initialCustomGpsUrl || '');

  // Edit Sheet
  const [isEditingLocal, setIsEditingLocal] = useState(false);
  const [editLocalName, setEditLocalName] = useState(initialLocalName || '');
  const [editLocalAddress, setEditLocalAddress] = useState(initialLocalAddress || '');
  const [editCustomGpsUrl, setEditCustomGpsUrl] = useState(initialCustomGpsUrl || '');

  useEffect(() => {
    setCurrentLocalName(initialLocalName || '');
    setCurrentLocalAddress(initialLocalAddress || '');
    setCurrentCustomGpsUrl(initialCustomGpsUrl || '');
  }, [initialLocalName, initialLocalAddress, initialCustomGpsUrl]);

  const handleShowGpsHelp = () => {
    Alert.alert(
      'GPS & Map Link Formats',
      'You can paste any of the following:\n\n' +
      '• Google Maps Share Link:\n  Open Google Maps > Share > Copy Link\n  (e.g. https://maps.app.goo.gl/...)\n\n' +
      '• Full Google Maps URL:\n  (e.g. https://google.com/maps/place/...)\n\n' +
      '• Apple Maps Link:\n  (e.g. https://maps.apple.com/?...)\n\n' +
      '• Raw Coordinates:\n  (e.g. 21.0337, 105.8504)\n\n' +
      'Tapping "Open GPS Navigation" will launch your navigation app directly to this exact pin.',
      [{ text: 'Got it' }]
    );
  };

  const handleCallHotel = () => {
    if (!hotelPhone) {
      Alert.alert('No Phone Number', 'No phone number was recorded for this hotel.');
      return;
    }
    const cleanPhone = hotelPhone.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate call on this device.');
    });
  };

  const handleOpenMaps = async () => {
    const rawGps = currentCustomGpsUrl.trim() || (isMapLinkOrCoords(hotelAddress) ? hotelAddress.trim() : '');

    if (rawGps) {
      // Check if raw coordinates like "21.0337, 105.8504"
      const coordsMatch = rawGps.match(/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/);
      if (coordsMatch) {
        const [lat, lng] = rawGps.split(',').map((s) => s.trim());
        const url = Platform.select({
          ios: `maps:0,0?q=${lat},${lng}`,
          android: `geo:${lat},${lng}?q=${lat},${lng}`,
          default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        });
        const supported = await Linking.canOpenURL(url).catch(() => false);
        if (supported) {
          Linking.openURL(url).catch(() => {
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
          });
          return;
        }
      }

      // If URL without protocol, prepend https://
      let targetUrl = rawGps;
      if (!/^[a-zA-Z]+:\/\//.test(targetUrl) && !targetUrl.startsWith('maps:') && !targetUrl.startsWith('geo:')) {
        targetUrl = `https://${targetUrl}`;
      }

      Linking.openURL(targetUrl).catch(() => {
        Alert.alert('Unable to Open Link', 'The saved GPS link could not be opened on this device.');
      });
      return;
    }

    // Fallback: standard search query using hotel details
    const addressToSearch = isMapLinkOrCoords(hotelAddress) ? '' : (currentLocalAddress || hotelAddress);
    const nameToSearch = currentLocalName || hotelName;
    const query = encodeURIComponent(`${nameToSearch} ${addressToSearch} ${hotelCity || ''}`.trim());
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    });
  };

  const handleSaveLocal = async () => {
    const trimmedName = editLocalName.trim();
    const trimmedAddr = editLocalAddress.trim();
    const trimmedGps = editCustomGpsUrl.trim();
    setCurrentLocalName(trimmedName);
    setCurrentLocalAddress(trimmedAddr);
    setCurrentCustomGpsUrl(trimmedGps);
    setIsEditingLocal(false);

    if (onSaveLocalDetails) {
      await onSaveLocalDetails(trimmedName, trimmedAddr, trimmedGps);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: '#0A0D18' }]}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View style={styles.badge}>
            <Ionicons name="car" size={18} color="#FFD166" />
            <Text style={styles.badgeText}>SHOW TO DRIVER</Text>
          </View>

          <View style={styles.topBarActions}>
            {onSaveLocalDetails && (
              <TouchableOpacity
                onPress={() => {
                  setEditLocalName(currentLocalName);
                  setEditLocalAddress(currentLocalAddress);
                  setEditCustomGpsUrl(currentCustomGpsUrl);
                  setIsEditingLocal(true);
                }}
                style={styles.editLocalPill}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="pencil" size={13} color="#FFD166" />
                <Text style={styles.editLocalPillText}>
                  {currentLocalName || currentLocalAddress || currentCustomGpsUrl ? 'Edit Local / GPS' : '+ Add Local / GPS'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Full Screen Placard / Card */}
        <View style={styles.cardWrapper}>
          <View style={styles.driverCard}>
            <ScrollView
              contentContainerStyle={styles.cardInnerScroll}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Destination Header Tag */}
              <View style={styles.destinationHeader}>
                <View style={styles.destTag}>
                  <Ionicons name="business" size={18} color="#3B82F6" />
                  <Text style={styles.destTagText}>DESTINATION / HOTEL</Text>
                </View>

                {hotelCity ? (
                  <View style={styles.cityPill}>
                    <Ionicons name="location-sharp" size={13} color="#6C63FF" />
                    <Text style={styles.cityText}>{hotelCity}</Text>
                  </View>
                ) : null}
              </View>

              {/* Hotel Name Section */}
              <View style={styles.nameSection}>
                {currentLocalName ? (
                  <>
                    <Text style={styles.hotelLocalName} selectable>
                      {currentLocalName}
                    </Text>
                    <Text style={styles.hotelEnglishSubname} selectable>
                      {hotelName}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.hotelName} selectable>
                    {hotelName || 'Destination Hotel'}
                  </Text>
                )}
              </View>

              <View style={styles.addressDivider} />

              {/* Full Hotel Address Section - High Contrast and Legible */}
              <View style={styles.addressSection}>
                <View style={styles.addressHeaderRow}>
                  <Text style={styles.addressLabel}>
                    {currentLocalAddress ? 'ADDRESS / ĐỊA CHỈ:' : 'FULL ADDRESS:'}
                  </Text>
                  <Text style={styles.tapToSelectNote}>Tap to select text</Text>
                </View>

                {currentLocalAddress ? (
                  <>
                    <Text style={styles.hotelLocalAddress} selectable>
                      {currentLocalAddress}
                    </Text>
                    {hotelAddress && !isMapLinkOrCoords(hotelAddress) ? (
                      <View style={styles.englishSubAddressBox}>
                        <Text style={styles.englishSubAddressLabel}>ENGLISH:</Text>
                        <Text style={styles.hotelEnglishSubAddress} selectable>
                          {hotelAddress}
                        </Text>
                      </View>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.hotelAddress} selectable>
                    {isMapLinkOrCoords(hotelAddress)
                      ? '📍 GPS Pin / Map Link Saved (Tap "Open GPS Navigation" below)'
                      : (hotelAddress || 'No street address saved. Tap "+ Add Local / GPS" at the top to paste the address.')}
                  </Text>
                )}
              </View>
            </ScrollView>

            {/* Embedded Action Row */}
            <View style={styles.cardBottomActions}>
              {hotelPhone ? (
                <TouchableOpacity
                  style={styles.callHotelBtn}
                  onPress={handleCallHotel}
                  activeOpacity={0.85}
                >
                  <Ionicons name="call" size={18} color="#FFF" />
                  <Text style={styles.callHotelBtnText}>Call</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.openGpsBtn}
                onPress={handleOpenMaps}
                activeOpacity={0.85}
              >
                <Ionicons name={(currentCustomGpsUrl || isMapLinkOrCoords(hotelAddress)) ? "location-sharp" : "navigate"} size={20} color="#FFF" />
                <Text style={styles.openGpsBtnText}>Open GPS Navigation</Text>
                {(currentCustomGpsUrl || isMapLinkOrCoords(hotelAddress)) ? (
                  <View style={styles.pinBadge}>
                    <Text style={styles.pinBadgeText}>Exact Pin</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Bottom Brightness Tip */}
        <View style={styles.footerNote}>
          <Ionicons name="sunny-outline" size={16} color="#9CA3AF" />
          <Text style={styles.footerNoteText}>
            Turn phone brightness up to make this card easily readable at night
          </Text>
        </View>

        {/* Edit Local Name, Address & Custom GPS Sheet */}
        <Modal
          visible={isEditingLocal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsEditingLocal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.editCard}>
              <View style={styles.editHeader}>
                <Text style={styles.editTitle}>Local Text & GPS Link</Text>
                <TouchableOpacity onPress={() => setIsEditingLocal(false)}>
                  <Ionicons name="close" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.editSubtitle}>
                Add native script for the driver and paste your Google Maps link or coordinates for exact GPS navigation:
              </Text>

              <Text style={styles.inputLabel}>DESTINATION NAME (LOCAL SCRIPT)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Khách sạn Lồng Đèn Bạc"
                placeholderTextColor="#6B7280"
                value={editLocalName}
                onChangeText={setEditLocalName}
              />

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>ADDRESS (LOCAL SCRIPT)</Text>
              <TextInput
                style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="e.g. 12 Phố Cổ, Hoàn Kiếm, Hà Nội"
                placeholderTextColor="#6B7280"
                value={editLocalAddress}
                onChangeText={setEditLocalAddress}
                multiline
              />

              <View style={styles.labelWithInfoRow}>
                <Text style={[styles.inputLabel, { marginBottom: 0 }]}>GOOGLE MAPS LINK / GPS (OPTIONAL)</Text>
                <TouchableOpacity
                  onPress={handleShowGpsHelp}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.infoIconBtn}
                >
                  <Ionicons name="information-circle-outline" size={18} color="#FFD166" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. https://maps.app.goo.gl/... or 21.033, 105.850"
                placeholderTextColor="#6B7280"
                value={editCustomGpsUrl}
                onChangeText={setEditCustomGpsUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.editBtn, { backgroundColor: '#26293B' }]}
                  onPress={() => setIsEditingLocal(false)}
                >
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editBtn, { backgroundColor: '#3B82F6' }]}
                  onPress={handleSaveLocal}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700' }}>Save to Card</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2338',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FFD166',
  },
  badgeText: {
    color: '#FFD166',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editLocalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2338',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFD166' + '55',
    gap: 5,
  },
  editLocalPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD166',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E2338',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  driverCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
    justifyContent: 'space-between',
  },
  cardInnerScroll: {
    paddingBottom: 20,
  },
  destinationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  destTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  destTagText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#4B5563',
    letterSpacing: 1.2,
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  cityText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6C63FF',
  },
  nameSection: {
    marginBottom: 4,
  },
  hotelLocalName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0B0D17',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  hotelEnglishSubname: {
    fontSize: 17,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 4,
  },
  hotelName: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0B0D17',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  addressDivider: {
    height: 2,
    backgroundColor: '#E5E7EB',
    marginVertical: 18,
  },
  addressSection: {
    flex: 1,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6B7280',
    letterSpacing: 1.2,
  },
  tapToSelectNote: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  hotelLocalAddress: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0B0D17',
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  englishSubAddressBox: {
    marginTop: 12,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
  },
  englishSubAddressLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  hotelEnglishSubAddress: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
    lineHeight: 22,
  },
  hotelAddress: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 36,
  },
  cardBottomActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1.5,
    borderTopColor: '#F3F4F6',
  },
  openGpsBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  openGpsBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  pinBadge: {
    backgroundColor: '#FFD166',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 2,
  },
  pinBadgeText: {
    color: '#0B0D17',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  callHotelBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
    gap: 6,
  },
  callHotelBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 6,
  },
  footerNoteText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  editCard: {
    backgroundColor: '#141728',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#2D3250',
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  editSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  labelWithInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 6,
  },
  infoIconBtn: {
    padding: 2,
  },
  inputLabel: {
    color: '#FFD166',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#1E2238',
    color: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#343B60',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  editBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
});
