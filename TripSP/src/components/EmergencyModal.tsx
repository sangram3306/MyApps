import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import {
  EMERGENCY_NUMBERS,
  EmergencyContact,
  getEmergencyInfoForTrip,
} from '../data/emergencyNumbers';

interface EmergencyModalProps {
  visible: boolean;
  onClose: () => void;
  tripName?: string;
  destinationHint?: string;
  showAllCountries?: boolean;
  theme: 'light' | 'dark';
}

export default function EmergencyModal({
  visible,
  onClose,
  tripName,
  destinationHint,
  showAllCountries = true,
  theme,
}: EmergencyModalProps) {
  const colors = Colors[theme];
  const [searchQuery, setSearchQuery] = useState('');

  // Default to detected country for active trip
  const detectedCountry = useMemo(() => {
    return getEmergencyInfoForTrip(tripName, destinationHint);
  }, [tripName, destinationHint]);

  const [selectedContact, setSelectedContact] = useState<EmergencyContact>(detectedCountry);

  // Keep selected contact synced if detectedCountry changes and search is empty
  React.useEffect(() => {
    if (!searchQuery) {
      setSelectedContact(detectedCountry);
    }
  }, [detectedCountry, searchQuery]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return EMERGENCY_NUMBERS;
    const q = searchQuery.toLowerCase();
    return EMERGENCY_NUMBERS.filter(
      (c) => c.country.toLowerCase().includes(q) || c.countryCode.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleCall = (number: string, serviceName: string) => {
    Alert.alert(
      `Call ${serviceName}?`,
      `This will immediately dial emergency services at ${number}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'destructive',
          onPress: () => {
            Linking.openURL(`tel:${number}`).catch(() => {
              Alert.alert('Unable to dial', `Could not initiate call to ${number} on this device.`);
            });
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.sosBadge, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="shield-checkmark" size={18} color={colors.error} />
            </View>
            <View>
              <Text style={[Typography.h3, { color: colors.text }]}>Emergency Hub</Text>
              <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                Offline assistance & numbers
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Active Country Card */}
          <View style={[styles.activeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.countryHeader}>
              <Text style={styles.flag}>{selectedContact.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.h2, { color: colors.text }]}>
                  {selectedContact.country}
                </Text>
                <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                  {selectedContact.countryCode !== 'GLOBAL'
                    ? `Destination Services · Code ${selectedContact.countryCode}`
                    : 'Universal Emergency Standard'}
                </Text>
              </View>
            </View>

            {/* Quick Dial Action Grid */}
            <View style={styles.dialGrid}>
              {/* Police */}
              <TouchableOpacity
                style={[styles.dialButton, { backgroundColor: '#3B82F6' }]}
                onPress={() => handleCall(selectedContact.police, 'Police')}
                activeOpacity={0.8}
              >
                <Ionicons name="shield" size={26} color="#FFF" />
                <Text style={styles.dialLabel}>Police</Text>
                <Text style={styles.dialNumber}>{selectedContact.police}</Text>
              </TouchableOpacity>

              {/* Ambulance */}
              <TouchableOpacity
                style={[styles.dialButton, { backgroundColor: '#EF4444' }]}
                onPress={() => handleCall(selectedContact.ambulance, 'Ambulance')}
                activeOpacity={0.8}
              >
                <Ionicons name="medical" size={26} color="#FFF" />
                <Text style={styles.dialLabel}>Ambulance</Text>
                <Text style={styles.dialNumber}>{selectedContact.ambulance}</Text>
              </TouchableOpacity>

              {/* Fire */}
              <TouchableOpacity
                style={[styles.dialButton, { backgroundColor: '#F97316' }]}
                onPress={() => handleCall(selectedContact.fire, 'Fire Rescue')}
                activeOpacity={0.8}
              >
                <Ionicons name="flame" size={26} color="#FFF" />
                <Text style={styles.dialLabel}>Fire</Text>
                <Text style={styles.dialNumber}>{selectedContact.fire}</Text>
              </TouchableOpacity>

              {/* Tourist Police / General */}
              <TouchableOpacity
                style={[styles.dialButton, { backgroundColor: '#8B5CF6' }]}
                onPress={() =>
                  handleCall(
                    selectedContact.touristPolice || selectedContact.general,
                    selectedContact.touristPolice ? 'Tourist Police' : 'General Emergency'
                  )
                }
                activeOpacity={0.8}
              >
                <Ionicons name="information-circle" size={26} color="#FFF" />
                <Text style={styles.dialLabel}>
                  {selectedContact.touristPolice ? 'Tourist Help' : 'General'}
                </Text>
                <Text style={styles.dialNumber}>
                  {selectedContact.touristPolice || selectedContact.general}
                </Text>
              </TouchableOpacity>
            </View>

            {selectedContact.notes ? (
              <View style={[styles.notesBox, { backgroundColor: colors.surfaceElevated }]}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                  {selectedContact.notes}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Search other countries (shown only when showAllCountries is true) */}
          {showAllCountries ? (
            <>
              <Text style={[styles.listHeader, { color: colors.text }]}>
                All Country Directories ({filteredCountries.length})
              </Text>

              <View style={[styles.searchBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Ionicons name="search" size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search country or code (e.g. France, JP)..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Countries List */}
              <View style={[styles.countriesList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {filteredCountries.map((c, i) => {
                  const isSelected = selectedContact.countryCode === c.countryCode;
                  return (
                    <TouchableOpacity
                      key={c.countryCode}
                      style={[
                        styles.countryRow,
                        {
                          borderBottomColor: colors.borderLight,
                          borderBottomWidth: i < filteredCountries.length - 1 ? 1 : 0,
                        },
                        isSelected && { backgroundColor: colors.primary + '15' },
                      ]}
                      onPress={() => setSelectedContact(c)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.rowFlag}>{c.flag}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[Typography.bodyMedium, { color: colors.text }]}>
                          {c.country}
                        </Text>
                        <Text style={[Typography.caption, { color: colors.textMuted }]}>
                          Police: {c.police} · Ambulance: {c.ambulance} · Fire: {c.fire}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      ) : (
                        <Ionicons name="call-outline" size={18} color={colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sosBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  activeCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  countryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  flag: {
    fontSize: 36,
  },
  dialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dialButton: {
    flexBasis: '48%',
    flexGrow: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  dialLabel: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  dialNumber: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 1,
  },
  notesBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginTop: 14,
    padding: 10,
    borderRadius: 12,
  },
  notesText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  listHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  countriesList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  rowFlag: {
    fontSize: 24,
  },
});
