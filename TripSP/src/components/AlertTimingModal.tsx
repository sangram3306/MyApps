import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { formatLeadTime } from '../utils/notifications';

export interface AlertPreset {
  label: string;
  minutes: number;
  isDefault?: boolean;
}

interface AlertTimingModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon: string;
  accentColor: string;
  currentMinutes: number;
  presets: AlertPreset[];
  onSave: (minutes: number) => void;
  theme: 'light' | 'dark';
}

export default function AlertTimingModal({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  accentColor,
  currentMinutes,
  presets,
  onSave,
  theme,
}: AlertTimingModalProps) {
  const colors = Colors[theme];
  const [selectedMinutes, setSelectedMinutes] = useState<number>(currentMinutes);
  const [customValue, setCustomValue] = useState<string>('');
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days'>('hours');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  useEffect(() => {
    setSelectedMinutes(currentMinutes);
    // If currentMinutes does not match any preset, pre-populate custom input
    const matchesPreset = presets.some((p) => p.minutes === currentMinutes);
    if (!matchesPreset && currentMinutes > 0) {
      setShowCustomInput(true);
      if (currentMinutes % 1440 === 0) {
        setCustomValue(String(currentMinutes / 1440));
        setCustomUnit('days');
      } else if (currentMinutes % 60 === 0) {
        setCustomValue(String(currentMinutes / 60));
        setCustomUnit('hours');
      } else {
        setCustomValue(String(currentMinutes));
        setCustomUnit('minutes');
      }
    } else {
      setCustomValue('');
    }
  }, [currentMinutes, visible]);

  const handleSelectPreset = (minutes: number) => {
    setSelectedMinutes(minutes);
    setShowCustomInput(false);
    setCustomValue('');
  };

  const handleApplyCustom = () => {
    const num = parseFloat(customValue);
    if (isNaN(num) || num <= 0) return;

    let multiplier = 1;
    if (customUnit === 'hours') multiplier = 60;
    if (customUnit === 'days') multiplier = 1440;

    const calculatedMinutes = Math.round(num * multiplier);
    setSelectedMinutes(calculatedMinutes);
  };

  const handleSave = () => {
    if (showCustomInput && customValue.trim()) {
      const num = parseFloat(customValue);
      if (!isNaN(num) && num > 0) {
        let multiplier = 1;
        if (customUnit === 'hours') multiplier = 60;
        if (customUnit === 'days') multiplier = 1440;
        const calculatedMinutes = Math.round(num * multiplier);
        onSave(calculatedMinutes);
        onClose();
        return;
      }
    }
    onSave(selectedMinutes);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Sheet Handle */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: accentColor + '20' }]}>
              <Ionicons name={icon as any} size={22} color={accentColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[Typography.h3, { color: colors.text }]}>{title}</Text>
              <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {subtitle || 'Select reminder lead time before event'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Current Selection Summary */}
          <View style={[styles.summaryBadge, { backgroundColor: accentColor + '12', borderColor: accentColor + '30' }]}>
            <Ionicons name="alarm-outline" size={16} color={accentColor} />
            <Text style={[Typography.captionMedium, { color: accentColor, marginLeft: 6 }]}>
              Reminder set for: <Text style={{ fontWeight: '700' }}>{formatLeadTime(selectedMinutes)} before</Text>
            </Text>
          </View>

          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {/* Presets List */}
            <Text style={[Typography.label, styles.sectionHeader, { color: colors.textMuted }]}>
              Quick Presets
            </Text>
            <View style={styles.presetContainer}>
              {presets.map((preset) => {
                const isSelected = selectedMinutes === preset.minutes && !showCustomInput;
                return (
                  <TouchableOpacity
                    key={preset.minutes}
                    style={[
                      styles.presetItem,
                      {
                        backgroundColor: isSelected ? accentColor + '18' : colors.surfaceElevated,
                        borderColor: isSelected ? accentColor : colors.borderLight,
                      },
                    ]}
                    onPress={() => handleSelectPreset(preset.minutes)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.presetLeft}>
                      <Ionicons
                        name="time-outline"
                        size={16}
                        color={isSelected ? accentColor : colors.textSecondary}
                      />
                      <Text
                        style={[
                          Typography.bodyMedium,
                          {
                            color: isSelected ? accentColor : colors.text,
                            marginLeft: 10,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {preset.label}
                      </Text>
                      {preset.isDefault && (
                        <View style={[styles.defaultBadge, { backgroundColor: colors.primary + '25' }]}>
                          <Text style={[Typography.caption, { color: colors.primary, fontSize: 10, fontWeight: '700' }]}>
                            DEFAULT
                          </Text>
                        </View>
                      )}
                    </View>

                    <View
                      style={[
                        styles.radioIndicator,
                        {
                          borderColor: isSelected ? accentColor : colors.textMuted,
                          backgroundColor: isSelected ? accentColor : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Timing Accordion / Input */}
            <Text style={[Typography.label, styles.sectionHeader, { color: colors.textMuted, marginTop: 16 }]}>
              Custom Time
            </Text>

            <TouchableOpacity
              style={[
                styles.customToggleBtn,
                {
                  backgroundColor: showCustomInput ? accentColor + '18' : colors.surfaceElevated,
                  borderColor: showCustomInput ? accentColor : colors.borderLight,
                },
              ]}
              onPress={() => setShowCustomInput(!showCustomInput)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name="options-outline"
                  size={16}
                  color={showCustomInput ? accentColor : colors.textSecondary}
                />
                <Text
                  style={[
                    Typography.bodyMedium,
                    {
                      color: showCustomInput ? accentColor : colors.text,
                      marginLeft: 10,
                      fontWeight: showCustomInput ? '700' : '500',
                    },
                  ]}
                >
                  Enter Custom Reminder
                </Text>
              </View>
              <Ionicons
                name={showCustomInput ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={showCustomInput ? accentColor : colors.textMuted}
              />
            </TouchableOpacity>

            {showCustomInput && (
              <View style={[styles.customBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <View style={styles.customInputRow}>
                  <TextInput
                    style={[
                      styles.customTextInput,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={customValue}
                    onChangeText={(val) => {
                      setCustomValue(val);
                      const num = parseFloat(val);
                      if (!isNaN(num) && num > 0) {
                        let multiplier = 1;
                        if (customUnit === 'hours') multiplier = 60;
                        if (customUnit === 'days') multiplier = 1440;
                        setSelectedMinutes(Math.round(num * multiplier));
                      }
                    }}
                    placeholder="e.g. 45"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />

                  {/* Units segmented tabs */}
                  <View style={[styles.unitSelector, { borderColor: colors.border }]}>
                    {(['minutes', 'hours', 'days'] as const).map((unit) => {
                      const isActive = customUnit === unit;
                      return (
                        <TouchableOpacity
                          key={unit}
                          style={[
                            styles.unitBtn,
                            {
                              backgroundColor: isActive ? accentColor : 'transparent',
                            },
                          ]}
                          onPress={() => {
                            setCustomUnit(unit);
                            const num = parseFloat(customValue);
                            if (!isNaN(num) && num > 0) {
                              let multiplier = 1;
                              if (unit === 'hours') multiplier = 60;
                              if (unit === 'days') multiplier = 1440;
                              setSelectedMinutes(Math.round(num * multiplier));
                            }
                          }}
                        >
                          <Text
                            style={[
                              Typography.captionMedium,
                              {
                                color: isActive ? '#FFF' : colors.textSecondary,
                                fontSize: 11,
                                textTransform: 'capitalize',
                              },
                            ]}
                          >
                            {unit === 'minutes' ? 'Mins' : unit === 'hours' ? 'Hrs' : 'Days'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {parseFloat(customValue) > 0 && (
                  <Text style={[Typography.caption, { color: accentColor, marginTop: 8 }]}>
                    ✓ Will trigger {formatLeadTime(selectedMinutes)} prior to event
                  </Text>
                )}
              </View>
            )}
            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[Typography.button, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: accentColor }]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={[Typography.button, { color: '#FFF' }]}>Save Alert Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
    paddingTop: 12,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  scrollList: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  presetContainer: {
    gap: 8,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  presetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  defaultBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  radioIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  customToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  customBox: {
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customTextInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  unitSelector: {
    flexDirection: 'row',
    marginLeft: 10,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  unitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
});
