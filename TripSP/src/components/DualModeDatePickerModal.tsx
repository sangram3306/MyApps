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
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

interface DualModeDatePickerModalProps {
  visible: boolean;
  value: Date;
  title?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  theme?: 'light' | 'dark';
  onConfirm: (date: Date) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function DualModeDatePickerModal({
  visible,
  value,
  title = 'Select Date',
  minimumDate,
  maximumDate,
  theme = 'dark',
  onConfirm,
  onClose,
}: DualModeDatePickerModalProps) {
  const colors = Colors[theme];

  const [mode, setMode] = useState<'type' | 'calendar'>('type');

  // Type Mode inputs: [ DD ] / [ MM ] / [ YYYY ]
  const [day, setDay] = useState('01');
  const [month, setMonth] = useState('01');
  const [year, setYear] = useState('2026');

  // Calendar Mode state
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(0); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(value));

  const dayRef = useRef<TextInput>(null);
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  // Sync state whenever modal opens or value changes
  useEffect(() => {
    if (visible) {
      const d = new Date(value);
      setSelectedDate(d);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());

      setDay(String(d.getDate()).padStart(2, '0'));
      setMonth(String(d.getMonth() + 1).padStart(2, '0'));
      setYear(String(d.getFullYear()));
    }
  }, [visible, value]);

  const applyDate = (newDate: Date) => {
    setSelectedDate(newDate);
    setViewYear(newDate.getFullYear());
    setViewMonth(newDate.getMonth());
    setDay(String(newDate.getDate()).padStart(2, '0'));
    setMonth(String(newDate.getMonth() + 1).padStart(2, '0'));
    setYear(String(newDate.getFullYear()));
  };

  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const parseTypeState = (): Date | null => {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    if (m < 1 || m > 12) return null;
    const maxDays = getDaysInMonth(y, m - 1);
    const clampedDay = Math.min(Math.max(d, 1), maxDays);
    return new Date(y, m - 1, clampedDay, value.getHours(), value.getMinutes(), value.getSeconds());
  };

  const handleSwitchMode = (newMode: 'type' | 'calendar') => {
    if (newMode === 'calendar') {
      const parsed = parseTypeState();
      if (parsed) {
        setSelectedDate(parsed);
        setViewYear(parsed.getFullYear());
        setViewMonth(parsed.getMonth());
      }
    } else {
      setDay(String(selectedDate.getDate()).padStart(2, '0'));
      setMonth(String(selectedDate.getMonth() + 1).padStart(2, '0'));
      setYear(String(selectedDate.getFullYear()));
    }
    setMode(newMode);
  };

  // Day Input Handler: [ DD ]
  const handleDayChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    if (clean.length > 2) return;

    if (clean === '') {
      setDay('');
      return;
    }

    const num = parseInt(clean, 10);
    if (num > 31) {
      setDay('31');
      monthRef.current?.focus();
      return;
    }

    setDay(clean);
    // Auto advance if 2 digits or if first digit > 3 (impossible for a day to start with 4-9)
    if (clean.length === 2 || (num > 3 && clean.length === 1)) {
      monthRef.current?.focus();
    }
  };

  // Month Input Handler: [ MM ]
  const handleMonthChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    if (clean.length > 2) return;

    if (clean === '') {
      setMonth('');
      return;
    }

    const num = parseInt(clean, 10);
    if (num > 12) {
      setMonth('12');
      yearRef.current?.focus();
      return;
    }

    setMonth(clean);
    // Auto advance if 2 digits or if first digit > 1 (impossible for month to start with 2-9)
    if (clean.length === 2 || (num > 1 && clean.length === 1)) {
      yearRef.current?.focus();
    }
  };

  // Year Input Handler: [ YYYY ]
  const handleYearChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    if (clean.length > 4) return;
    setYear(clean);
  };

  // Calendar Month Navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const isDayDisabled = (y: number, m: number, d: number) => {
    const checkDate = new Date(y, m, d, 23, 59, 59, 999);
    const startOfCheck = new Date(y, m, d, 0, 0, 0, 0);

    if (minimumDate) {
      const minStart = new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate(), 0, 0, 0, 0);
      if (startOfCheck < minStart) return true;
    }
    if (maximumDate) {
      const maxEnd = new Date(maximumDate.getFullYear(), maximumDate.getMonth(), maximumDate.getDate(), 23, 59, 59, 999);
      if (checkDate > maxEnd) return true;
    }
    return false;
  };

  const handleSelectCalendarDay = (d: number) => {
    if (isDayDisabled(viewYear, viewMonth, d)) return;
    const newDate = new Date(viewYear, viewMonth, d, value.getHours(), value.getMinutes(), value.getSeconds());
    applyDate(newDate);
  };

  // Quick Preset Chips
  const handlePreset = (type: 'today' | 'tomorrow' | 'week' | 'month') => {
    const base = new Date();
    if (type === 'tomorrow') {
      base.setDate(base.getDate() + 1);
    } else if (type === 'week') {
      base.setDate(base.getDate() + 7);
    } else if (type === 'month') {
      base.setMonth(base.getMonth() + 1);
    }
    base.setHours(value.getHours(), value.getMinutes(), value.getSeconds());
    applyDate(base);
  };

  const handleConfirm = () => {
    let finalDate: Date;
    if (mode === 'calendar') {
      finalDate = new Date(selectedDate);
    } else {
      const parsed = parseTypeState();
      finalDate = parsed || new Date(value);
    }

    // Preserve time component from value
    finalDate.setHours(value.getHours(), value.getMinutes(), value.getSeconds(), 0);

    // Clamp to minimumDate / maximumDate if present
    if (minimumDate && finalDate < minimumDate) {
      finalDate = new Date(minimumDate);
    }
    if (maximumDate && finalDate > maximumDate) {
      finalDate = new Date(maximumDate);
    }

    onConfirm(finalDate);
    onClose();
  };

  // Calendar calculation
  const firstDayWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
  const totalDaysInViewMonth = getDaysInMonth(viewYear, viewMonth);

  const today = new Date();
  const isSelectedSame = (d: number) => {
    return (
      selectedDate.getFullYear() === viewYear &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getDate() === d
    );
  };

  const isTodaySame = (d: number) => {
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === d
    );
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
                  Type Date
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSwitchMode('calendar')}
                style={[
                  styles.segmentBtn,
                  mode === 'calendar' && { backgroundColor: colors.primary },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={mode === 'calendar' ? '#FFF' : colors.textMuted}
                />
                <Text
                  style={[
                    Typography.captionSemibold,
                    { color: mode === 'calendar' ? '#FFF' : colors.textMuted, marginLeft: 6 },
                  ]}
                >
                  Calendar
                </Text>
              </TouchableOpacity>
            </View>

            {/* Mode Content */}
            {mode === 'type' ? (
              <View style={styles.typeContent}>
                {/* Segmented [ DD ] / [ MM ] / [ YYYY ] Row */}
                <View style={styles.inputsRow}>
                  {/* Day (DD) */}
                  <View style={[styles.inputWrapper, { flex: 1.1 }]}>
                    <Text style={[Typography.caption, { color: colors.textMuted, marginBottom: 6 }]}>
                      DAY (DD)
                    </Text>
                    <TextInput
                      ref={dayRef}
                      style={[
                        styles.dateInput,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.text,
                        },
                      ]}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                      value={day}
                      onChangeText={handleDayChange}
                      placeholder="DD"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  <Text style={[styles.separator, { color: colors.textSecondary }]}>/</Text>

                  {/* Month (MM) */}
                  <View style={[styles.inputWrapper, { flex: 1.1 }]}>
                    <Text style={[Typography.caption, { color: colors.textMuted, marginBottom: 6 }]}>
                      MONTH (MM)
                    </Text>
                    <TextInput
                      ref={monthRef}
                      style={[
                        styles.dateInput,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.text,
                        },
                      ]}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                      value={month}
                      onChangeText={handleMonthChange}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Backspace' && month === '') {
                          dayRef.current?.focus();
                        }
                      }}
                      placeholder="MM"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  <Text style={[styles.separator, { color: colors.textSecondary }]}>/</Text>

                  {/* Year (YYYY) */}
                  <View style={[styles.inputWrapper, { flex: 1.6 }]}>
                    <Text style={[Typography.caption, { color: colors.textMuted, marginBottom: 6 }]}>
                      YEAR (YYYY)
                    </Text>
                    <TextInput
                      ref={yearRef}
                      style={[
                        styles.dateInput,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.text,
                        },
                      ]}
                      keyboardType="number-pad"
                      maxLength={4}
                      selectTextOnFocus
                      value={year}
                      onChangeText={handleYearChange}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Backspace' && year === '') {
                          monthRef.current?.focus();
                        }
                      }}
                      placeholder="YYYY"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                {/* Quick Presets */}
                <View style={styles.presetsRow}>
                  <TouchableOpacity
                    style={[styles.presetChip, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}
                    onPress={() => handlePreset('today')}
                    activeOpacity={0.7}
                  >
                    <Text style={[Typography.captionMedium, { color: colors.primary }]}>Today</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.presetChip, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}
                    onPress={() => handlePreset('tomorrow')}
                    activeOpacity={0.7}
                  >
                    <Text style={[Typography.captionMedium, { color: colors.primary }]}>Tomorrow</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.presetChip, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}
                    onPress={() => handlePreset('week')}
                    activeOpacity={0.7}
                  >
                    <Text style={[Typography.captionMedium, { color: colors.primary }]}>+1 Week</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.presetChip, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}
                    onPress={() => handlePreset('month')}
                    activeOpacity={0.7}
                  >
                    <Text style={[Typography.captionMedium, { color: colors.primary }]}>+1 Month</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Calendar Mode */
              <View style={styles.calendarContent}>
                {/* Month Navigator Header */}
                <View style={styles.calendarNavRow}>
                  <TouchableOpacity
                    onPress={handlePrevMonth}
                    style={[styles.navArrowBtn, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="chevron-back" size={16} color={colors.text} />
                  </TouchableOpacity>

                  <Text style={[Typography.h3, { color: colors.text, fontSize: 16 }]}>
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </Text>

                  <TouchableOpacity
                    onPress={handleNextMonth}
                    style={[styles.navArrowBtn, { backgroundColor: colors.inputBg, borderColor: colors.borderLight }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="chevron-forward" size={16} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Weekday Names Header */}
                <View style={styles.weekdaysRow}>
                  {WEEKDAY_NAMES.map((w, idx) => (
                    <Text
                      key={idx}
                      style={[
                        Typography.captionSemibold,
                        { color: idx === 0 || idx === 6 ? colors.textMuted : colors.textSecondary, width: `${100 / 7}%`, textAlign: 'center' },
                      ]}
                    >
                      {w}
                    </Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={styles.daysGrid}>
                  {/* Empty cells before month starts */}
                  {Array.from({ length: firstDayWeekday }).map((_, idx) => (
                    <View key={`empty-${idx}`} style={styles.dayCell} />
                  ))}

                  {/* Month days */}
                  {Array.from({ length: totalDaysInViewMonth }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const isSelected = isSelectedSame(dayNum);
                    const isToday = isTodaySame(dayNum);
                    const disabled = isDayDisabled(viewYear, viewMonth, dayNum);

                    return (
                      <TouchableOpacity
                        key={`day-${dayNum}`}
                        disabled={disabled}
                        onPress={() => handleSelectCalendarDay(dayNum)}
                        style={[
                          styles.dayCell,
                          isSelected && [styles.selectedDayCell, { backgroundColor: colors.primary }],
                          isToday && !isSelected && [styles.todayDayCell, { borderColor: colors.primary }],
                          disabled && { opacity: 0.25 },
                        ]}
                        activeOpacity={0.6}
                      >
                        <Text
                          style={[
                            Typography.bodyMedium,
                            {
                              color: isSelected
                                ? '#FFF'
                                : isToday
                                ? colors.primary
                                : colors.text,
                              fontSize: 14,
                            },
                          ]}
                        >
                          {dayNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Calendar Jump to Today Footer */}
                <TouchableOpacity
                  onPress={() => applyDate(new Date())}
                  style={styles.todayShortcut}
                >
                  <Ionicons name="today-outline" size={13} color={colors.primary} />
                  <Text style={[Typography.captionSemibold, { color: colors.primary, marginLeft: 4 }]}>
                    Today ({today.getDate()} {MONTH_NAMES[today.getMonth()].slice(0, 3)})
                  </Text>
                </TouchableOpacity>
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
                <Text style={[Typography.button, { color: '#FFF' }]}>Set Date</Text>
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
    paddingHorizontal: 16,
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
    marginBottom: 18,
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
    paddingVertical: 10,
  },
  inputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 18,
  },
  inputWrapper: {
    alignItems: 'center',
  },
  dateInput: {
    width: '100%',
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
  separator: {
    fontSize: 22,
    fontWeight: '300',
    marginHorizontal: 8,
    marginTop: 18,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  calendarContent: {
    paddingVertical: 4,
  },
  calendarNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 18,
  },
  selectedDayCell: {
    borderRadius: 18,
  },
  todayDayCell: {
    borderWidth: 1.5,
    borderRadius: 18,
  },
  todayShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    flex: 1.4,
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
