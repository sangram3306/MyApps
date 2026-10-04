import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CURRENCIES } from '../data/exchangeRates';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

interface CurrencyPickerProps {
  visible: boolean;
  selectedCurrencies: string[];
  maxSelections: number;
  onConfirm: (currencies: string[]) => void;
  onClose: () => void;
  theme: 'light' | 'dark';
}

export default function CurrencyPicker({
  visible,
  selectedCurrencies,
  maxSelections,
  onConfirm,
  onClose,
  theme,
}: CurrencyPickerProps) {
  const colors = Colors[theme];
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>(selectedCurrencies);

  const filteredCurrencies = CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCurrency = (code: string) => {
    if (selected.includes(code)) {
      // Don't allow unselecting if maxSelections is 1 and it's the only one
      if (maxSelections === 1 && selected.length === 1) return;
      setSelected(selected.filter((c) => c !== code));
    } else {
      if (maxSelections === 1) {
        setSelected([code]);
      } else if (selected.length < maxSelections) {
        setSelected([...selected, code]);
      }
    }
  };

  const handleConfirm = () => {
    onConfirm(selected);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <SafeAreaView style={[styles.modal, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[Typography.h3, { color: colors.text }]}>
              Select Currencies ({selected.length}/{maxSelections})
            </Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={[Typography.button, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search currencies..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
          </View>

          {/* Selected Pills */}
          {selected.length > 0 && (
            <View style={styles.pillContainer}>
              {selected.map((code) => (
                <TouchableOpacity
                  key={code}
                  style={[styles.pill, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                  onPress={() => toggleCurrency(code)}
                >
                  <Text style={[Typography.captionMedium, { color: colors.primary }]}>{code}</Text>
                  <Ionicons name="close-circle" size={16} color={colors.primary} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Currency List */}
          <FlatList
            data={filteredCurrencies}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => {
              const isSelected = selected.includes(item.code);
              return (
                <TouchableOpacity
                  style={[
                    styles.currencyRow,
                    {
                      backgroundColor: isSelected ? colors.primary + '10' : 'transparent',
                      borderBottomColor: colors.borderLight,
                    },
                  ]}
                  onPress={() => toggleCurrency(item.code)}
                >
                  <View style={styles.currencyInfo}>
                    <Text style={[Typography.bodyMedium, { color: colors.text }]}>
                      {item.symbol} {item.code}
                    </Text>
                    <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                      {item.name}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { // Force rebuild
    flex: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  currencyInfo: {
    flex: 1,
  },
});
