import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../../src/context/AppContext';
import { Colors } from '../../src/theme/colors';
import { Typography } from '../../src/theme/typography';
import { CURRENCIES } from '../../src/data/exchangeRates';
import CurrencyPicker from '../../src/components/CurrencyPicker';
import { exportAllData, importAllData } from '../../src/storage/asyncStorage';


function OfflineRatesEditor({
  colors,
  primaryCurrency,
  secondaryCurrencies,
  rates,
  updateRates,
}: {
  colors: any;
  primaryCurrency: string;
  secondaryCurrencies: string[];
  rates: Record<string, number>;
  updateRates: (r: Record<string, number>) => void;
}) {
  const [localRates, setLocalRates] = React.useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    const primaryRate = rates[primaryCurrency] || 1;
    const initial: Record<string, string> = {};
    secondaryCurrencies.forEach(c => {
      const cRate = rates[c] || 1;
      initial[c] = (cRate / primaryRate).toFixed(4);
    });
    setLocalRates(initial);
  }, [primaryCurrency, secondaryCurrencies, rates]);

  const handleSave = () => {
    const primaryRate = rates[primaryCurrency] || 1;
    const newRates: Record<string, number> = {};
    Object.keys(localRates).forEach(c => {
      const val = parseFloat(localRates[c]);
      if (!isNaN(val)) {
        newRates[c] = primaryRate * val;
      }
    });
    updateRates(newRates);
  };

  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
      <View style={[styles.row, { borderBottomColor: colors.borderLight, backgroundColor: colors.primary + '10' }]}>
        <View>
          <Text style={[Typography.bodySemibold, { color: colors.primary }]}>Manual Conversion Rates</Text>
          <Text style={[Typography.caption, { color: colors.primary, opacity: 0.8, marginTop: 2 }]}>1 {primaryCurrency} equals:</Text>
        </View>
        {isEditing ? (
          <TouchableOpacity onPress={() => { handleSave(); setIsEditing(false); }}>
            <Text style={[Typography.button, { color: colors.primary }]}>Save</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Ionicons name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      {secondaryCurrencies.map((code: string, index: number) => (
        <View key={code} style={[styles.row, { borderBottomWidth: index < secondaryCurrencies.length - 1 ? 1 : 0, borderBottomColor: colors.borderLight }]}>
          <Text style={[Typography.bodyMedium, { color: colors.text }]}>{code}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isEditing ? (
              <TextInput
                style={{
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  width: 120,
                  textAlign: 'right',
                }}
                keyboardType="decimal-pad"
                value={localRates[code] || ''}
                onChangeText={(val) => setLocalRates(prev => ({ ...prev, [code]: val }))}
              />
            ) : (
              <Text style={[Typography.bodySemibold, { color: colors.text }]}>
                {localRates[code] || ''}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function SettingsScreen() {
  const { state, updateSettings, updateExchangeRates } = useApp();
  const colors = Colors[state.settings.theme];
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [editingCurrencyIndex, setEditingCurrencyIndex] = useState<number | null>(null);
  const [isProcessingData, setIsProcessingData] = useState(false);
  const [showImagesExpanded, setShowImagesExpanded] = useState(false);

  const handleExportData = async () => {
    try {
      setIsProcessingData(true);
      const jsonString = await exportAllData();
      const fileUri = FileSystem.cacheDirectory + 'TravezyBackup.travezy';
      await FileSystem.writeAsStringAsync(fileUri, jsonString);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Travezy Backup'
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Export Failed', 'An error occurred while exporting data.');
    } finally {
      setIsProcessingData(false);
    }
  };

  const handleImportData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsProcessingData(true);
        const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
        const success = await importAllData(fileContent);
        if (success) {
          Alert.alert('Import Successful', 'Data has been successfully imported. Please restart the app to apply all changes completely.');
        } else {
          Alert.alert('Import Failed', 'The selected file is not a valid backup or is corrupted.');
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Import Failed', 'An error occurred while importing data.');
    } finally {
      setIsProcessingData(false);
    }
  };

  const getCurrencyName = (code: string) => {
    return CURRENCIES.find((c) => c.code === code)?.name || code;
  };

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find((c) => c.code === code)?.symbol || code;
  };

  const moveCurrency = (index: number, direction: 'up' | 'down') => {
    const newCurrencies = [...state.settings.selectedCurrencies];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newCurrencies.length) {
      const temp = newCurrencies[index];
      newCurrencies[index] = newCurrencies[targetIndex];
      newCurrencies[targetIndex] = temp;
      updateSettings({ selectedCurrencies: newCurrencies });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[Typography.h1, { color: colors.text }]}>Settings</Text>
        </View>

        {/* General Section */}
        <Text style={[Typography.label, styles.sectionLabel, { color: colors.textMuted }]}>
          General
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Offline Mode */}
          <View style={[styles.row, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="cloud-offline" size={18} color={colors.warning} />
              </View>
              <View style={styles.rowText}>
                <Text style={[Typography.bodyMedium, { color: colors.text }]}>Offline Mode</Text>
                <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                  No internet required
                </Text>
              </View>
            </View>
            <Switch
              value={state.settings.offlineMode}
              onValueChange={(value) => updateSettings({ offlineMode: value })}
              trackColor={{ false: colors.borderLight, true: colors.primary + '60' }}
              thumbColor={state.settings.offlineMode ? colors.primary : colors.textMuted}
            />
          </View>

          {/* Theme */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons
                  name={state.settings.theme === 'dark' ? 'moon' : 'sunny'}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.rowText}>
                <Text style={[Typography.bodyMedium, { color: colors.text }]}>Dark Theme</Text>
                <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                  {state.settings.theme === 'dark' ? 'Dark mode active' : 'Light mode active'}
                </Text>
              </View>
            </View>
            <Switch
              value={state.settings.theme === 'dark'}
              onValueChange={(value) => updateSettings({ theme: value ? 'dark' : 'light' })}
              trackColor={{ false: colors.borderLight, true: colors.primary + '60' }}
              thumbColor={state.settings.theme === 'dark' ? colors.primary : colors.textMuted}
            />
          </View>
        </View>

        {/* Itinerary Section */}
        <Text style={[Typography.label, styles.sectionLabel, { color: colors.textMuted }]}>
          Itinerary
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.row, { borderBottomColor: 'transparent' }]}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="layers-outline" size={18} color={colors.accent} />
              </View>
              <View style={styles.rowText}>
                <Text style={[Typography.bodyMedium, { color: colors.text }]}>Multi-screen City View</Text>
                <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                  Open city details in a separate screen
                </Text>
              </View>
            </View>
            <Switch
              value={state.settings.multiScreenItinerary}
              onValueChange={(value) => updateSettings({ multiScreenItinerary: value })}
              trackColor={{ false: colors.borderLight, true: colors.primary + '60' }}
              thumbColor={state.settings.multiScreenItinerary ? colors.primary : colors.textMuted}
            />
          </View>
          
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="time-outline" size={18} color={colors.warning} />
              </View>
              <View style={styles.rowText}>
                <Text style={[Typography.bodyMedium, { color: colors.text }]}>Real-time Timeline Flow</Text>
                <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                  Show current time marker & auto-dim past items
                </Text>
              </View>
            </View>
            <Switch
              value={state.settings.realtimeTimeline ?? true}
              onValueChange={(value) => updateSettings({ realtimeTimeline: value })}
              trackColor={{ false: colors.borderLight, true: colors.primary + '60' }}
              thumbColor={(state.settings.realtimeTimeline ?? true) ? colors.primary : colors.textMuted}
            />
          </View>

          {/* Show Card Images Group */}
          <TouchableOpacity
            style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.borderLight }]}
            onPress={() => setShowImagesExpanded(!showImagesExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="images-outline" size={18} color={colors.accent} />
              </View>
              <View style={styles.rowText}>
                <Text style={[Typography.bodyMedium, { color: colors.text }]}>Show Cover Images</Text>
                <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                  Manage image visibility on timeline
                </Text>
              </View>
            </View>
            <Ionicons
              name={showImagesExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {showImagesExpanded && (
            <View style={{ 
              backgroundColor: state.settings.theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', 
              paddingVertical: 12, 
              paddingHorizontal: 24, 
              flexDirection: 'row', 
              justifyContent: 'space-between' 
            }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={[Typography.caption, { color: colors.text, marginBottom: 6 }]}>City</Text>
                <Switch
                  value={state.settings.showCardImages?.city ?? true}
                  onValueChange={(value) => updateSettings({ showCardImages: { ...(state.settings.showCardImages || { city: true, hotel: true, attraction: true }), city: value } })}
                  trackColor={{ false: colors.borderLight, true: colors.primary + '60' }}
                  thumbColor={state.settings.showCardImages?.city !== false ? colors.primary : colors.textMuted}
                  style={{ transform: [{ scale: 0.8 }] }}
                />
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[Typography.caption, { color: colors.text, marginBottom: 6 }]}>Hotel</Text>
                <Switch
                  value={state.settings.showCardImages?.hotel ?? true}
                  onValueChange={(value) => updateSettings({ showCardImages: { ...(state.settings.showCardImages || { city: true, hotel: true, attraction: true }), hotel: value } })}
                  trackColor={{ false: colors.borderLight, true: colors.primary + '60' }}
                  thumbColor={state.settings.showCardImages?.hotel !== false ? colors.primary : colors.textMuted}
                  style={{ transform: [{ scale: 0.8 }] }}
                />
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[Typography.caption, { color: colors.text, marginBottom: 6 }]}>Attraction</Text>
                <Switch
                  value={state.settings.showCardImages?.attraction ?? true}
                  onValueChange={(value) => updateSettings({ showCardImages: { ...(state.settings.showCardImages || { city: true, hotel: true, attraction: true }), attraction: value } })}
                  trackColor={{ false: colors.borderLight, true: colors.primary + '60' }}
                  thumbColor={state.settings.showCardImages?.attraction !== false ? colors.primary : colors.textMuted}
                  style={{ transform: [{ scale: 0.8 }] }}
                />
              </View>
            </View>
          )}
        </View>

                {/* Currency Section */}
        <Text style={[Typography.label, styles.sectionLabel, { color: colors.textMuted }]}>
          Display Currencies
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {state.settings.selectedCurrencies.map((code, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              onPress={() => {
                setEditingCurrencyIndex(index);
                setShowCurrencyPicker(true);
              }}
              style={[
                styles.row,
                {
                  borderBottomColor: colors.borderLight,
                  borderBottomWidth: index < state.settings.selectedCurrencies.length - 1 ? 1 : 0,
                },
              ]}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.currencyBadge, { backgroundColor: colors.accent + '20' }]}>
                  <Text style={[Typography.bodySemibold, { color: colors.accent }]}>
                    {getCurrencySymbol(code)}
                  </Text>
                </View>
                <View style={styles.rowText}>
                  <Text style={[Typography.bodyMedium, { color: colors.text }]}>{code}</Text>
                  <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                    {getCurrencyName(code)}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flexDirection: 'column', marginRight: 12 }}>
                  <TouchableOpacity 
                    onPress={() => moveCurrency(index, 'up')}
                    disabled={index === 0}
                    style={{ padding: 4, opacity: index === 0 ? 0.3 : 1 }}
                  >
                    <Ionicons name="chevron-up" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => moveCurrency(index, 'down')}
                    disabled={index === state.settings.selectedCurrencies.length - 1}
                    style={{ padding: 4, opacity: index === state.settings.selectedCurrencies.length - 1 ? 0.3 : 1 }}
                  >
                    <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.orderBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[Typography.captionMedium, { color: colors.primary }]}>#{index + 1}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Data Management Section */}
        <Text style={[Typography.label, styles.sectionLabel, { color: colors.textMuted }]}>
          Data Management
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={[styles.row, { borderBottomColor: colors.borderLight }]} onPress={handleExportData} disabled={isProcessingData}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[Typography.bodyMedium, { color: colors.text }]}>Export Backup</Text>
                <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                  Save all data and documents to a file
                </Text>
              </View>
            </View>
            {isProcessingData ? <ActivityIndicator color={colors.primary} size="small" /> : <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.row} onPress={handleImportData} disabled={isProcessingData}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="cloud-download-outline" size={18} color={colors.accent} />
              </View>
              <View style={styles.rowText}>
                <Text style={[Typography.bodyMedium, { color: colors.text }]}>Import Backup</Text>
                <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                  Restore data from a backup file
                </Text>
              </View>
            </View>
            {isProcessingData ? <ActivityIndicator color={colors.accent} size="small" /> : <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />}
          </TouchableOpacity>
        </View>

        {/* Exchange Rate Info */}
        <View style={[styles.rateInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="trending-up" size={18} color={colors.accent} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={[Typography.captionMedium, { color: colors.text }]}>
              Exchange Rates
            </Text>
            <Text style={[Typography.caption, { color: colors.textSecondary }]}>
              Last updated: {state.exchangeRates.date}
              {state.settings.offlineMode ? ' (using cached rates)' : ''}
            </Text>
          </View>
        </View>

        {/* Manual Rates Editor (Offline Mode) */}
        {state.settings.offlineMode && state.settings.selectedCurrencies.length > 1 && (
          <OfflineRatesEditor
            colors={colors}
            primaryCurrency={state.settings.selectedCurrencies[0]}
            secondaryCurrencies={state.settings.selectedCurrencies.slice(1)}
            rates={state.exchangeRates.rates}
            updateRates={updateExchangeRates}
          />
        )}

        {/* About Section */}
        <Text style={[Typography.label, styles.sectionLabel, { color: colors.textMuted }]}>
          About
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.row, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="information-circle" size={18} color={colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[Typography.bodyMedium, { color: colors.text }]}>Version</Text>
              </View>
            </View>
            <Text style={[Typography.caption, { color: colors.textSecondary }]}>1.0.0</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="shield-checkmark" size={18} color={colors.success} />
              </View>
              <View style={styles.rowText}>
                <Text style={[Typography.bodyMedium, { color: colors.text }]}>Data Storage</Text>
                <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                  All data stored locally on device
                </Text>
              </View>
            </View>
          </View>
        </View>
  
      </ScrollView>
      </KeyboardAvoidingView>

      <CurrencyPicker
        visible={showCurrencyPicker}
        selectedCurrencies={editingCurrencyIndex !== null ? [state.settings.selectedCurrencies[editingCurrencyIndex]] : []}
        maxSelections={1}
        onConfirm={(currencies) => {
          if (editingCurrencyIndex !== null && currencies.length === 1) {
            const newCurrencies = [...state.settings.selectedCurrencies];
            newCurrencies[editingCurrencyIndex] = currencies[0];
            updateSettings({ selectedCurrencies: newCurrencies });
          }
        }}
        onClose={() => {
          setShowCurrencyPicker(false);
          setEditingCurrencyIndex(null);
        }}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionLabel: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowText: {
    marginLeft: 12,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  changeCurrencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
  },
  rateInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
});
