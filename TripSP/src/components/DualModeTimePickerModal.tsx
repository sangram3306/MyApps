import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

interface DualModeTimePickerModalProps {
  visible: boolean;
  value: Date;
  title?: string;
  timeFormat?: '12h' | '24h';
  theme?: 'light' | 'dark';
  onConfirm: (date: Date) => void;
  onClose: () => void;
}

export default function DualModeTimePickerModal({
  visible,
  value,
  title = 'Select Time',
  timeFormat = '12h',
  theme = 'dark',
  onConfirm,
  onClose,
}: DualModeTimePickerModalProps) {
  const colors = Colors[theme];
  const is24h = timeFormat === '24h';

  const [mode, setMode] = useState<'type' | 'scroll'>('type');
  const [scrollDate, setScrollDate] = useState<Date>(new Date(value));

  // Type mode states
  const [hours, setHours] = useState('12');
  const [minutes, setMinutes] = useState('00');
  const [ampm, setAmPm] = useState<'AM' | 'PM'>('PM');

  const hourRef = useRef<TextInput>(null);
  const minuteRef = useRef<TextInput>(null);

  // Sync state whenever modal opens or value changes
  useEffect(() => {
    if (visible) {
      const d = new Date(value);
      setScrollDate(d);
      const rawH = d.getHours();
      const rawM = d.getMinutes();

      if (is24h) {
        setHours(String(rawH).padStart(2, '0'));
      } else {
        const h12 = rawH % 12 || 12;
        setHours(String(h12).padStart(2, '0'));
        setAmPm(rawH >= 12 ? 'PM' : 'AM');
      }
      setMinutes(String(rawM).padStart(2, '0'));
    }
  }, [visible, value, is24h]);

  const handleSwitchMode = (newMode: 'type' | 'scroll') => {
    if (newMode === 'scroll') {
      // Sync from type mode into scrollDate
      let h = parseInt(hours, 10);
      if (isNaN(h)) h = 0;
      let m = parseInt(minutes, 10);
      if (isNaN(m)) m = 0;

      if (!is24h) {
        h = h % 12;
        if (ampm === 'PM') h += 12;
      }
      const newD = new Date(value);
      newD.setHours(h, m, 0, 0);
      setScrollDate(newD);
    } else {
      // Sync from scrollDate into type mode
      const rawH = scrollDate.getHours();
      const rawM = scrollDate.getMinutes();
      if (is24h) {
        setHours(String(rawH).padStart(2, '0'));
      } else {
        const h12 = rawH % 12 || 12;
        setHours(String(h12).padStart(2, '0'));
        setAmPm(rawH >= 12 ? 'PM' : 'AM');
      }
      setMinutes(String(rawM).padStart(2, '0'));
    }
    setMode(newMode);
  };

  const handleHourChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    if (clean.length > 2) return;

    if (clean === '') {
      setHours('');
      return;
    }

    const num = parseInt(clean, 10);
    if (is24h) {
      if (num > 23) {
        setHours('23');
        minuteRef.current?.focus();
        return;
      }
      setHours(clean);
      if (clean.length === 2 || num > 2) {
        minuteRef.current?.focus();
      }
    } else {
      if (num > 12) {
        setHours('12');
        minuteRef.current?.focus();
        return;
      }
      setHours(clean);
      if (clean.length === 2 || (num > 1 && clean.length === 1)) {
        minuteRef.current?.focus();
      }
    }
  };

  const handleMinuteChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    if (clean.length > 2) return;

    if (clean === '') {
      setMinutes('');
      return;
    }

    const num = parseInt(clean, 10);
    if (num > 59) {
      setMinutes('59');
      return;
    }
    setMinutes(clean);
  };

  const handleConfirm = () => {
    const finalDate = new Date(value);
    if (mode === 'scroll') {
      finalDate.setHours(scrollDate.getHours(), scrollDate.getMinutes(), 0, 0);
    } else {
      let h = parseInt(hours, 10);
      if (isNaN(h)) h = is24h ? 0 : 12;
      let m = parseInt(minutes, 10);
      if (isNaN(m)) m = 0;

      if (!is24h) {
        h = h % 12;
        if (ampm === 'PM') h += 12;
      }
      finalDate.setHours(h, m, 0, 0);
    }
    onConfirm(finalDate);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.overlay}
        >
          <View style={[styles.dialogCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={[Typography.h3, { color: colors.text }]}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Mode Switcher Segment */}
            <View style={[styles.segmentContainer, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}>
              <TouchableOpacity
                onPress={() => handleSwitchMode('type')}
                style={[
                  styles.segmentBtn,
                  mode === 'type' && { backgroundColor: colors.primary },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="keypad-outline"
                  size={15}
                  color={mode === 'type' ? '#FFF' : colors.textMuted}
                />
                <Text
                  style={[
                    Typography.captionSemibold,
                    { color: mode === 'type' ? '#FFF' : colors.textMuted, marginLeft: 6 },
                  ]}
                >
                  Type Time
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSwitchMode('scroll')}
                style={[
                  styles.segmentBtn,
                  mode === 'scroll' && { backgroundColor: colors.primary },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="time-outline"
                  size={15}
                  color={mode === 'scroll' ? '#FFF' : colors.textMuted}
                />
                <Text
                  style={[
                    Typography.captionSemibold,
                    { color: mode === 'scroll' ? '#FFF' : colors.textMuted, marginLeft: 6 },
                  ]}
                >
                  Scroll Wheel
                </Text>
              </TouchableOpacity>
            </View>

            {/* Mode Content */}
            {mode === 'type' ? (
              <View style={styles.typeContent}>
                <View style={styles.inputsRow}>
                  {/* Hours */}
                  <View style={styles.inputWrapper}>
                    <Text style={[Typography.caption, { color: colors.textMuted, marginBottom: 6 }]}>
                      {is24h ? 'HOUR (00-23)' : 'HOUR (01-12)'}
                    </Text>
                    <TextInput
                      ref={hourRef}
                      style={[
                        styles.timeInput,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.text,
                        },
                      ]}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                      value={hours}
                      onChangeText={handleHourChange}
                      placeholder={is24h ? '00' : '12'}
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  <Text style={[styles.separator, { color: colors.text }]}>:</Text>

                  {/* Minutes */}
                  <View style={styles.inputWrapper}>
                    <Text style={[Typography.caption, { color: colors.textMuted, marginBottom: 6 }]}>
                      MINUTE (00-59)
                    </Text>
                    <TextInput
                      ref={minuteRef}
                      style={[
                        styles.timeInput,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.text,
                        },
                      ]}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                      value={minutes}
                      onChangeText={handleMinuteChange}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Backspace' && minutes === '') {
                          hourRef.current?.focus();
                        }
                      }}
                      placeholder="00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  {/* 12h AM/PM Toggle */}
                  {!is24h && (
                    <View style={styles.ampmColumn}>
                      <TouchableOpacity
                        onPress={() => setAmPm('AM')}
                        style={[
                          styles.ampmBtn,
                          {
                            backgroundColor: ampm === 'AM' ? colors.primary : colors.inputBg,
                            borderColor: ampm === 'AM' ? colors.primary : colors.inputBorder,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text style={[Typography.captionSemibold, { color: ampm === 'AM' ? '#FFF' : colors.text }]}>
                          AM
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setAmPm('PM')}
                        style={[
                          styles.ampmBtn,
                          {
                            backgroundColor: ampm === 'PM' ? colors.primary : colors.inputBg,
                            borderColor: ampm === 'PM' ? colors.primary : colors.inputBorder,
                            marginTop: 6,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text style={[Typography.captionSemibold, { color: ampm === 'PM' ? '#FFF' : colors.text }]}>
                          PM
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Helpful quick shortcut buttons */}
                <View style={styles.quickShortcutsRow}>
                  <TouchableOpacity
                    style={[styles.shortcutChip, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}
                    onPress={() => {
                      const now = new Date();
                      const rawH = now.getHours();
                      if (is24h) {
                        setHours(String(rawH).padStart(2, '0'));
                      } else {
                        const h12 = rawH % 12 || 12;
                        setHours(String(h12).padStart(2, '0'));
                        setAmPm(rawH >= 12 ? 'PM' : 'AM');
                      }
                      setMinutes(String(now.getMinutes()).padStart(2, '0'));
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="sparkles-outline" size={13} color={colors.primary} />
                    <Text style={[Typography.captionMedium, { color: colors.primary, marginLeft: 4 }]}>
                      Current Time
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.scrollContent}>
                <DateTimePicker
                  value={scrollDate}
                  mode="time"
                  display="spinner"
                  is24Hour={is24h}
                  textColor={colors.text}
                  onValueChange={(_, d) => {
                    if (d) setScrollDate(d);
                  }}
                  onDismiss={onClose}
                  style={{ width: '100%', height: 160 }}
                />
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.borderLight }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[Typography.button, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={[Typography.button, { color: '#FFF' }]}>Set Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    padding: 4,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  typeContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  inputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    alignItems: 'center',
  },
  timeInput: {
    width: 72,
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
  },
  separator: {
    fontSize: 28,
    fontWeight: '700',
    marginHorizontal: 8,
    marginTop: 18,
  },
  ampmColumn: {
    marginLeft: 12,
    marginTop: 18,
  },
  ampmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickShortcutsRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 8,
  },
  shortcutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
