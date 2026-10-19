import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { convertCurrency, formatCurrency, CURRENCIES } from '../data/exchangeRates';

interface QuickCurrencyCalcModalProps {
  visible: boolean;
  onClose: () => void;
  baseCurrency: string;
  selectedCurrencies: string[];
  exchangeRates: Record<string, number>;
  initialCurrency?: string;
  theme: 'light' | 'dark';
}

const TIP_PERCENTAGES = [0, 10, 15, 18, 20];
const SPLIT_OPTIONS = [1, 2, 3, 4, 5];

export default function QuickCurrencyCalcModal({
  visible,
  onClose,
  baseCurrency,
  selectedCurrencies,
  exchangeRates,
  initialCurrency,
  theme,
}: QuickCurrencyCalcModalProps) {
  const colors = Colors[theme];

  // Default source currency to initialCurrency or first selected currency different from base
  const defaultSource = useMemo(() => {
    if (initialCurrency) return initialCurrency;
    const diff = selectedCurrencies.find((c) => c !== baseCurrency);
    return diff || 'USD';
  }, [initialCurrency, selectedCurrencies, baseCurrency]);

  const [sourceCurrency, setSourceCurrency] = useState(defaultSource);
  const [inputVal, setInputVal] = useState('100');
  const [tipPercent, setTipPercent] = useState(0);
  const [splitCount, setSplitCount] = useState(1);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // Sync if initialCurrency changes
  React.useEffect(() => {
    if (initialCurrency) {
      setSourceCurrency(initialCurrency);
    }
  }, [initialCurrency]);

  const numericAmount = useMemo(() => {
    const parsed = parseFloat(inputVal.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }, [inputVal]);

  const totalWithTip = useMemo(() => {
    return numericAmount * (1 + tipPercent / 100);
  }, [numericAmount, tipPercent]);

  const perPersonTotal = useMemo(() => {
    return totalWithTip / (splitCount || 1);
  }, [totalWithTip, splitCount]);

  const handleKeyPress = (char: string) => {
    if (char === 'C') {
      setInputVal('0');
      return;
    }
    if (char === '⌫') {
      if (inputVal.length <= 1) {
        setInputVal('0');
      } else {
        setInputVal(inputVal.slice(0, -1));
      }
      return;
    }
    if (char === '.') {
      if (!inputVal.includes('.')) {
        setInputVal(inputVal + '.');
      }
      return;
    }
    // Number typed
    if (inputVal === '0') {
      setInputVal(char);
    } else {
      if (inputVal.length < 10) {
        setInputVal(inputVal + char);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top Header */}
        <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
          <View style={styles.headerTitleRow}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="calculator" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[Typography.h3, { color: colors.text }]}>Quick Converter</Text>
              <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                Offline rates & tip calculator
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
          {/* Main Display Box */}
          <View style={[styles.displayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Input Row */}
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={[styles.currencySelector, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
                activeOpacity={0.7}
              >
                <Text style={[styles.currencyCode, { color: colors.primary }]}>{sourceCurrency}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.primary} />
              </TouchableOpacity>

              <Text style={[styles.inputValue, { color: colors.text }]} numberOfLines={1}>
                {inputVal}
              </Text>
            </View>

            {/* Currency Picker Quick Selector */}
            {showCurrencyPicker && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyRow}>
                {CURRENCIES.map((c) => (
                  <TouchableOpacity
                    key={c.code}
                    style={[
                      styles.currencyPill,
                      { backgroundColor: sourceCurrency === c.code ? colors.primary : colors.surfaceElevated },
                    ]}
                    onPress={() => {
                      setSourceCurrency(c.code);
                      setShowCurrencyPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.currencyPillText,
                        { color: sourceCurrency === c.code ? '#FFF' : colors.text },
                      ]}
                    >
                      {c.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Converted Summary */}
            <View style={[styles.conversionBox, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
              <View style={styles.convertedPrimaryRow}>
                <Text style={[styles.convertedLabel, { color: colors.textSecondary }]}>
                  In {baseCurrency} (Base):
                </Text>
                <Text style={[styles.convertedValue, { color: colors.primary }]}>
                  {formatCurrency(
                    convertCurrency(perPersonTotal, sourceCurrency, baseCurrency, exchangeRates),
                    baseCurrency
                  )}
                </Text>
              </View>

              {/* Other active currencies */}
              <View style={styles.otherCurrenciesRow}>
                {selectedCurrencies
                  .filter((c) => c !== baseCurrency && c !== sourceCurrency)
                  .map((cur) => (
                    <View key={cur} style={styles.miniCurrencyPill}>
                      <Text style={[styles.miniCurrencyText, { color: colors.textSecondary }]}>
                        {formatCurrency(
                          convertCurrency(perPersonTotal, sourceCurrency, cur, exchangeRates),
                          cur
                        )}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          </View>

          {/* Tip & Split Modifiers */}
          <View style={styles.modifierSection}>
            <View style={styles.modifierRow}>
              <Text style={[Typography.label, { color: colors.textMuted }]}>
                TIP: {tipPercent > 0 ? `+${tipPercent}% (${formatCurrency(numericAmount * (tipPercent / 100), sourceCurrency)})` : 'None'}
              </Text>
              <View style={styles.chipGroup}>
                {TIP_PERCENTAGES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: tipPercent === t ? colors.primary : colors.surfaceElevated,
                        borderColor: tipPercent === t ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setTipPercent(t)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: tipPercent === t ? '#FFF' : colors.text },
                      ]}
                    >
                      {t === 0 ? '0%' : `+${t}%`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.modifierRow, { marginTop: 14 }]}>
              <Text style={[Typography.label, { color: colors.textMuted }]}>
                SPLIT BILL: {splitCount} {splitCount === 1 ? 'person' : 'people'}
              </Text>
              <View style={styles.chipGroup}>
                {SPLIT_OPTIONS.map((count) => (
                  <TouchableOpacity
                    key={count}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: splitCount === count ? colors.primary : colors.surfaceElevated,
                        borderColor: splitCount === count ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSplitCount(count)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: splitCount === count ? '#FFF' : colors.text },
                      ]}
                    >
                      {count} {count === 1 ? '👤' : '👥'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Keypad */}
          <View style={[styles.keypad, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['.', '0', '⌫'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((btn) => (
                  <TouchableOpacity
                    key={btn}
                    style={[
                      styles.keypadBtn,
                      {
                        backgroundColor:
                          btn === '⌫'
                            ? colors.error + '18'
                            : colors.surfaceElevated,
                      },
                    ]}
                    onPress={() => handleKeyPress(btn)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.keypadBtnText,
                        { color: btn === '⌫' ? colors.error : colors.text },
                      ]}
                    >
                      {btn}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>

          {/* Quick Clear Button */}
          <TouchableOpacity
            style={[styles.clearBtn, { borderColor: colors.border }]}
            onPress={() => handleKeyPress('C')}
          >
            <Text style={[styles.clearBtnText, { color: colors.textSecondary }]}>Clear Keypad (C)</Text>
          </TouchableOpacity>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
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
    paddingBottom: 32,
  },
  displayCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '800',
  },
  inputValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
    maxWidth: '65%',
    textAlign: 'right',
  },
  currencyRow: {
    marginTop: 12,
    paddingVertical: 4,
  },
  currencyPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8,
  },
  currencyPillText: {
    fontWeight: '700',
    fontSize: 13,
  },
  conversionBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  convertedPrimaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convertedLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  convertedValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  otherCurrenciesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  miniCurrencyPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  miniCurrencyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modifierSection: {
    marginTop: 16,
  },
  modifierRow: {
    marginBottom: 4,
  },
  chipGroup: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  keypad: {
    marginTop: 20,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    gap: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 10,
  },
  keypadBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadBtnText: {
    fontSize: 22,
    fontWeight: '700',
  },
  clearBtn: {
    alignSelf: 'center',
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
