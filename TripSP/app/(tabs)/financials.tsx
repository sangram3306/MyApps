import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DualModeDatePickerModal from '../../src/components/DualModeDatePickerModal';
import * as Crypto from 'expo-crypto';
import { useApp } from '../../src/context/AppContext';
import { Colors } from '../../src/theme/colors';
import { Typography } from '../../src/theme/typography';
import { EntryType, ENTRY_TYPE_META, ItineraryEntry, CustomCategory } from '../../src/types';
import { convertCurrency, formatCurrency } from '../../src/data/exchangeRates';
import { toLocalDateString } from '../../src/utils/date';
import { getCustomCategories, saveCustomCategories } from '../../src/storage/asyncStorage';
import CategoryBar from '../../src/components/CategoryBar';

const BASE_CATEGORIES: Array<{
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  placeholder: string;
}> = [
  {
    id: 'food',
    label: 'Food',
    icon: 'restaurant-outline',
    color: '#FFB347',
    placeholder: 'e.g. Lunch, Dinner, Street food, Coffee',
  },
  {
    id: 'shopping',
    label: 'Shopping',
    icon: 'bag-handle-outline',
    color: '#EC4899',
    placeholder: 'e.g. Clothes, Souvenirs, Market purchases',
  },
  {
    id: 'grocery',
    label: 'Grocery',
    icon: 'cart-outline',
    color: '#10B981',
    placeholder: 'e.g. Supermarket, Fruits, Water, Snacks',
  },
  {
    id: 'other',
    label: 'Others',
    icon: 'pricetag-outline',
    color: '#8B5CF6',
    placeholder: 'e.g. Laundry, SIM card, Metro card, Tips',
  },
];

const PRESET_COLORS = [
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#10B981', // Emerald
];

const PRESET_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  'pricetag-outline',
  'wine-outline',
  'cafe-outline',
  'car-outline',
  'gift-outline',
  'film-outline',
  'fitness-outline',
  'medkit-outline',
  'sparkles-outline',
  'bus-outline',
];

export default function FinancialsScreen() {
  const { state, getActiveTrip, getEntriesForActiveTrip, addEntry } = useApp();
  const router = useRouter();
  const colors = Colors[state.settings.theme];

  const activeTrip = getActiveTrip();
  const entries = getEntriesForActiveTrip();
  const selectedCurrencies = state.settings.selectedCurrencies;
  const rates = state.exchangeRates.rates;

  // Custom categories state
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);

  useEffect(() => {
    getCustomCategories().then((cats) => {
      if (cats && Array.isArray(cats)) {
        setCustomCategories(cats);
      }
    });
  }, []);

  // Add Expense Modal state
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [expenseType, setExpenseType] = useState<string>('food');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expensePrice, setExpensePrice] = useState('');
  const [expenseCurrency, setExpenseCurrency] = useState(
    activeTrip?.baseCurrency || selectedCurrencies[0] || 'USD'
  );
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expenseNotes, setExpenseNotes] = useState('');

  // Add New Category state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);
  const [newCatIcon, setNewCatIcon] = useState<keyof typeof Ionicons.glyphMap>(PRESET_ICONS[0]);

  if (!activeTrip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[Typography.h1, { color: colors.text }]}>Financials</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="wallet-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[Typography.h3, { color: colors.text, marginTop: 16 }]}>No trip selected</Text>
          <Text style={[Typography.body, { color: colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
            Select a trip to view its financial breakdown
          </Text>
          <TouchableOpacity
            style={[styles.goButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/')}
          >
            <Text style={[Typography.button, { color: '#FFF' }]}>Go to Trips</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate totals per category in base currency
  const baseCurrency = state.settings.selectedCurrencies[0];
  const categoryTotals: Record<string, number> = {
    flight: 0,
    hotel: 0,
    attraction: 0,
    food: 0,
    transport: 0,
    shopping: 0,
    grocery: 0,
    other: 0,
  };

  entries.forEach((entry) => {
    const converted = convertCurrency(entry.price, entry.currency, baseCurrency, rates);
    const catKey = entry.type || 'other';
    if (categoryTotals[catKey] !== undefined) {
      categoryTotals[catKey] += converted;
    } else {
      categoryTotals[catKey] = (categoryTotals[catKey] || 0) + converted;
    }
  });

  const grandTotal = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

  // Convert grand total to all selected currencies
  const totalsInCurrencies = selectedCurrencies.map((cur) => ({
    currency: cur,
    amount: convertCurrency(grandTotal, baseCurrency, cur, rates),
  }));

  // Category breakdown for bars
  const categories = Object.keys(categoryTotals)
    .filter((type) => categoryTotals[type] > 0)
    .sort((a, b) => categoryTotals[b] - categoryTotals[a]);

  const getCategoryMeta = (catKey: string): {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    placeholder: string;
  } => {
    // Check custom categories first
    const custom = customCategories.find(
      (c) => c.id === catKey || c.label.toLowerCase() === catKey.toLowerCase()
    );
    if (custom) {
      return {
        label: custom.label,
        icon: custom.icon as keyof typeof Ionicons.glyphMap,
        color: custom.color,
        placeholder: `e.g. ${custom.label} expense`,
      };
    }
    // Check base categories
    const base = BASE_CATEGORIES.find((c) => c.id === catKey);
    if (base) {
      return { label: base.label, icon: base.icon, color: base.color, placeholder: base.placeholder };
    }
    // Check global ENTRY_TYPE_META
    if (ENTRY_TYPE_META[catKey]) {
      return {
        label: ENTRY_TYPE_META[catKey].label,
        icon: (ENTRY_TYPE_META[catKey].icon + '-outline') as keyof typeof Ionicons.glyphMap,
        color: ENTRY_TYPE_META[catKey].color,
        placeholder: `e.g. ${ENTRY_TYPE_META[catKey].label} expense`,
      };
    }
    // Fallback
    return {
      label: catKey.charAt(0).toUpperCase() + catKey.slice(1),
      icon: 'pricetag-outline' as keyof typeof Ionicons.glyphMap,
      color: '#8B5CF6',
      placeholder: 'e.g. Expense description',
    };
  };

  const openExpenseModal = (cat: string = 'food') => {
    setExpenseType(cat);
    setExpenseTitle('');
    setExpensePrice('');
    setExpenseDate(new Date());
    setExpenseNotes('');
    setExpenseCurrency(activeTrip.baseCurrency || baseCurrency);
    setIsCreatingCategory(false);
    setIsAddModalVisible(true);
  };

  const handleCreateCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) {
      Alert.alert('Category Name Required', 'Please enter a name for the new category.');
      return;
    }

    const exists =
      BASE_CATEGORIES.some((c) => c.label.toLowerCase() === trimmed.toLowerCase()) ||
      customCategories.some((c) => c.label.toLowerCase() === trimmed.toLowerCase());

    if (exists) {
      Alert.alert('Category Exists', 'A category with this name already exists.');
      return;
    }

    const newCatId = `custom_${Date.now()}`;
    const newCategory: CustomCategory = {
      id: newCatId,
      label: trimmed,
      icon: newCatIcon,
      color: newCatColor,
    };

    const updated = [...customCategories, newCategory];
    setCustomCategories(updated);
    await saveCustomCategories(updated);

    // Auto-select the newly created category
    setExpenseType(newCatId);
    setNewCatName('');
    setIsCreatingCategory(false);
  };

  const handleDeleteCustomCategory = (catId: string, catLabel: string) => {
    Alert.alert(
      'Delete Category',
      `Delete "${catLabel}"? Existing expenses in this category will display under Others.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = customCategories.filter((c) => c.id !== catId);
            setCustomCategories(updated);
            await saveCustomCategories(updated);
            if (expenseType === catId) {
              setExpenseType('other');
            }
          },
        },
      ]
    );
  };

  const handleSaveExpense = async () => {
    const trimmedTitle = expenseTitle.trim();
    const parsedPrice = parseFloat(expensePrice);

    if (!trimmedTitle) {
      Alert.alert('Expense Name Required', 'Please provide a name for this expense.');
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount greater than 0.');
      return;
    }

    const newEntry: ItineraryEntry = {
      id: Crypto.randomUUID(),
      tripId: activeTrip.id,
      type: expenseType as EntryType,
      title: trimmedTitle,
      date: toLocalDateString(expenseDate),
      price: parsedPrice,
      currency: expenseCurrency,
      notes: expenseNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    await addEntry(newEntry);
    setIsAddModalVisible(false);
    setExpenseTitle('');
    setExpensePrice('');
    setExpenseNotes('');
  };

  const formatDateButton = (d: Date) => {
    const today = new Date();
    const isToday =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    const formatted = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    return isToday ? `Today (${formatted})` : formatted;
  };

  const allDisplayCategories = [
    ...BASE_CATEGORIES,
    ...customCategories.map((c) => ({
      id: c.id,
      label: c.label,
      icon: c.icon as keyof typeof Ionicons.glyphMap,
      color: c.color,
      placeholder: `e.g. ${c.label} expense`,
      isCustom: true,
    })),
  ];

  const activeCategoryMeta =
    allDisplayCategories.find((c) => c.id === expenseType) ||
    getCategoryMeta(expenseType);

  const availableCurrencies = Array.from(
    new Set([activeTrip.baseCurrency, ...selectedCurrencies].filter(Boolean))
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header with subtle Add Expense button */}
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[Typography.h1, { color: colors.text }]}>Financials</Text>
            <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              {activeTrip.name}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.subtleAddBtn,
              {
                backgroundColor: colors.primary + '15',
                borderColor: colors.primary + '35',
              },
            ]}
            onPress={() => openExpenseModal('food')}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={15} color={colors.primary} />
            <Text style={[Typography.captionSemibold, { color: colors.primary, marginLeft: 4, fontSize: 13 }]}>
              Add Expense
            </Text>
          </TouchableOpacity>
        </View>

        {/* Total Spend Card */}
        <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
          <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8, textAlign: 'center' }]}>
            TOTAL SPEND
          </Text>

          {totalsInCurrencies.length > 0 && (
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={[Typography.display, { color: colors.text, fontSize: 36 }]}>
                {formatCurrency(totalsInCurrencies[0].amount, totalsInCurrencies[0].currency)}
              </Text>
              <Text style={[Typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
                {totalsInCurrencies[0].currency}
              </Text>
            </View>
          )}

          {totalsInCurrencies.length > 1 && (
            <View style={[styles.currencyRow, { gap: 8 }]}>
              {totalsInCurrencies.slice(1).map((item) => (
                <View
                  key={item.currency}
                  style={[
                    styles.currencyBlock,
                    {
                      backgroundColor: colors.primary + '15',
                      borderRadius: 12,
                      paddingVertical: 8,
                      paddingHorizontal: 4,
                      borderWidth: 1,
                      borderColor: colors.borderLight,
                    },
                  ]}
                >
                  <Text 
                    style={[Typography.display, { color: colors.text, fontSize: 16 }]} 
                    numberOfLines={1} 
                    adjustsFontSizeToFit
                  >
                    {formatCurrency(item.amount, item.currency)}
                  </Text>
                  <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                    {item.currency}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Category Breakdown */}
        {categories.length > 0 ? (
          <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
            <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 20 }]}>
              Breakdown by Category
            </Text>

            {categories.map((type) => {
              const meta = getCategoryMeta(type);
              return (
                <CategoryBar
                  key={type}
                  icon={meta.icon}
                  label={meta.label}
                  amount={categoryTotals[type]}
                  currency={baseCurrency}
                  percentage={grandTotal > 0 ? (categoryTotals[type] / grandTotal) * 100 : 0}
                  color={meta.color}
                  theme={state.settings.theme}
                />
              );
            })}
          </View>
        ) : (
          <View style={[styles.breakdownCard, styles.noDataContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="receipt-outline" size={32} color={colors.textMuted} style={{ alignSelf: 'center', marginBottom: 10 }} />
            <Text style={[Typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: 14 }]}>
              No expenses recorded for this trip yet
            </Text>
            <TouchableOpacity
              style={[
                styles.subtleAddBtn,
                {
                  backgroundColor: colors.primary + '15',
                  borderColor: colors.primary + '35',
                  alignSelf: 'center',
                },
              ]}
              onPress={() => openExpenseModal('food')}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={15} color={colors.primary} />
              <Text style={[Typography.captionSemibold, { color: colors.primary, marginLeft: 4, fontSize: 13 }]}>
                Add First Expense
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Entry List */}
        {entries.filter((e) => e.price > 0).length > 0 && (
          <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
            <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 16 }]}>
              All Expenses ({entries.filter((e) => e.price > 0).length})
            </Text>

            {entries
              .filter((e) => e.price > 0)
              .sort((a, b) => {
                const aConverted = convertCurrency(a.price, a.currency, baseCurrency, rates);
                const bConverted = convertCurrency(b.price, b.currency, baseCurrency, rates);
                return bConverted - aConverted;
              })
              .map((entry, index, arr) => {
                const meta = getCategoryMeta(entry.type);
                const converted = convertCurrency(entry.price, entry.currency, baseCurrency, rates);
                return (
                  <TouchableOpacity
                    key={entry.id}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: '/edit-entry',
                        params: {
                          entryId: entry.id,
                          tripId: activeTrip.id,
                          type: entry.type,
                          title: entry.title,
                          date: entry.date,
                          price: String(entry.price),
                          currency: entry.currency,
                          notes: entry.notes || '',
                        },
                      })
                    }
                    style={[
                      styles.expenseRow,
                      {
                        borderBottomColor: colors.borderLight,
                        borderBottomWidth: index < arr.length - 1 ? 1 : 0,
                      },
                    ]}
                  >
                    <View style={[styles.expenseIcon, { backgroundColor: meta.color + '20' }]}>
                      <Ionicons name={meta.icon as any} size={16} color={meta.color} />
                    </View>
                    <View style={styles.expenseInfo}>
                      <Text style={[Typography.bodyMedium, { color: colors.text }]} numberOfLines={1}>
                        {entry.title}
                      </Text>
                      <Text style={[Typography.caption, { color: colors.textMuted }]}>
                        {entry.date} · {meta.label}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[Typography.bodySemibold, { color: colors.text }]}>
                        {formatCurrency(converted, baseCurrency)}
                      </Text>
                      {entry.currency !== baseCurrency && (
                        <Text style={[Typography.caption, { color: colors.textMuted, fontSize: 10, marginTop: 1 }]}>
                          {formatCurrency(entry.price, entry.currency)}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
          </View>
        )}

        {/* Rate info */}
        <Text style={[Typography.caption, { color: colors.textMuted, textAlign: 'center', marginTop: 16, paddingHorizontal: 20 }]}>
          Exchange rates as of {state.exchangeRates.date}
        </Text>
      </ScrollView>

      {/* Add Expense Modal (Food, Shopping, Grocery, Others + Custom Categories) */}
      <Modal
        visible={isAddModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setIsAddModalVisible(false)}
          />
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Grab handle */}
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[Typography.h3, { color: colors.text }]}>Add Expense</Text>
                <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  Log everyday trip spending
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAddModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: colors.inputBg }]}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 60 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets
            >
              {/* Category selector: Food, Shopping, Grocery, Others, Custom + New */}
              <View style={styles.modalField}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[Typography.label, { color: colors.textMuted }]}>
                    CATEGORY
                  </Text>
                  {allDisplayCategories.some((c) => 'isCustom' in c && c.isCustom) && (
                    <Text style={[Typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
                      Hold custom to delete
                    </Text>
                  )}
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
                >
                  {allDisplayCategories.map((cat) => {
                    const isSelected = expenseType === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => {
                          setExpenseType(cat.id);
                          setIsCreatingCategory(false);
                        }}
                        onLongPress={() => {
                          if ('isCustom' in cat && cat.isCustom) {
                            handleDeleteCustomCategory(cat.id, cat.label);
                          }
                        }}
                        style={[
                          styles.categoryOptionBtn,
                          {
                            backgroundColor: isSelected ? cat.color + '22' : colors.inputBg,
                            borderColor: isSelected ? cat.color : colors.inputBorder,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={cat.icon}
                          size={15}
                          color={isSelected ? cat.color : colors.textSecondary}
                        />
                        <Text
                          style={[
                            Typography.captionSemibold,
                            {
                              color: isSelected ? cat.color : colors.textSecondary,
                              marginLeft: 6,
                            },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* + Add New Category button */}
                  <TouchableOpacity
                    onPress={() => setIsCreatingCategory(!isCreatingCategory)}
                    style={[
                      styles.addCategoryBtn,
                      {
                        backgroundColor: isCreatingCategory ? colors.primary + '20' : colors.primary + '10',
                        borderColor: colors.primary + (isCreatingCategory ? '80' : '35'),
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isCreatingCategory ? 'close' : 'add'}
                      size={15}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        Typography.captionSemibold,
                        { color: colors.primary, marginLeft: 4 },
                      ]}
                    >
                      {isCreatingCategory ? 'Close' : 'New'}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Inline Create Category Form */}
              {isCreatingCategory && (
                <View
                  style={[
                    styles.createCategoryCard,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.primary + '40',
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={[Typography.captionSemibold, { color: colors.text, fontSize: 13 }]}>
                      Add New Category
                    </Text>
                    <TouchableOpacity onPress={() => setIsCreatingCategory(false)}>
                      <Ionicons name="close" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {/* Name Input */}
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.inputBorder,
                        color: colors.text,
                        marginBottom: 12,
                      },
                    ]}
                    placeholder="Category name (e.g. Drinks, Fuel, Nightlife)"
                    placeholderTextColor={colors.textMuted}
                    value={newCatName}
                    onChangeText={setNewCatName}
                    autoFocus={true}
                  />

                  {/* Color Selector */}
                  <Text style={[Typography.label, { color: colors.textMuted, fontSize: 10, marginBottom: 8 }]}>
                    CHOOSE COLOR
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10, marginBottom: 12 }}
                  >
                    {PRESET_COLORS.map((color) => {
                      const isSelected = newCatColor === color;
                      return (
                        <TouchableOpacity
                          key={color}
                          onPress={() => setNewCatColor(color)}
                          style={[
                            styles.colorCircle,
                            {
                              backgroundColor: color,
                              borderWidth: isSelected ? 2.5 : 0,
                              borderColor: '#FFF',
                              transform: [{ scale: isSelected ? 1.15 : 1 }],
                            },
                          ]}
                        >
                          {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Icon Selector */}
                  <Text style={[Typography.label, { color: colors.textMuted, fontSize: 10, marginBottom: 8 }]}>
                    CHOOSE ICON
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, marginBottom: 14 }}
                  >
                    {PRESET_ICONS.map((iconName) => {
                      const isSelected = newCatIcon === iconName;
                      return (
                        <TouchableOpacity
                          key={iconName}
                          onPress={() => setNewCatIcon(iconName)}
                          style={[
                            styles.iconCircle,
                            {
                              backgroundColor: isSelected ? newCatColor + '25' : colors.card,
                              borderColor: isSelected ? newCatColor : colors.borderLight,
                            },
                          ]}
                        >
                          <Ionicons
                            name={iconName}
                            size={18}
                            color={isSelected ? newCatColor : colors.textSecondary}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Add Button */}
                  <TouchableOpacity
                    style={[
                      styles.saveCatBtn,
                      {
                        backgroundColor: newCatName.trim() ? colors.primary : colors.primary + '50',
                      },
                    ]}
                    onPress={handleCreateCategory}
                    disabled={!newCatName.trim()}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark" size={15} color="#FFF" />
                    <Text style={[Typography.captionSemibold, { color: '#FFF', marginLeft: 6 }]}>
                      Save Category
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Title / Name (User can name it whatever he wants) */}
              <View style={styles.modalField}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[Typography.label, { color: colors.textMuted }]}>
                    {expenseType === 'other' ? 'EXPENSE NAME (ANYTHING YOU WANT)' : 'EXPENSE NAME'}
                  </Text>
                  {expenseType === 'other' && (
                    <Text style={[Typography.caption, { color: activeCategoryMeta.color, fontSize: 11 }]}>
                      Custom Name
                    </Text>
                  )}
                </View>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.text,
                    },
                  ]}
                  placeholder={activeCategoryMeta.placeholder}
                  placeholderTextColor={colors.textMuted}
                  value={expenseTitle}
                  onChangeText={setExpenseTitle}
                />
              </View>

              {/* Amount & Currency selection */}
              <View style={styles.modalField}>
                <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>
                  AMOUNT & CURRENCY
                </Text>
                <View style={styles.amountRow}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <TextInput
                      style={[
                        styles.modalInput,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.text,
                          fontSize: 18,
                          fontWeight: '600',
                        },
                      ]}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      value={expensePrice}
                      onChangeText={setExpensePrice}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {availableCurrencies.map((cur) => {
                      const isSelected = expenseCurrency === cur;
                      return (
                        <TouchableOpacity
                          key={cur}
                          onPress={() => setExpenseCurrency(cur)}
                          style={[
                            styles.modalCurrencyChip,
                            {
                              backgroundColor: isSelected ? colors.primary : colors.inputBg,
                              borderColor: isSelected ? colors.primary : colors.inputBorder,
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              Typography.captionSemibold,
                              { color: isSelected ? '#FFF' : colors.text },
                            ]}
                          >
                            {cur}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>

              {/* Date */}
              <View style={styles.modalField}>
                <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>
                  DATE
                </Text>
                <TouchableOpacity
                  style={[
                    styles.modalDateBtn,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                    },
                  ]}
                  onPress={() => setShowDatePicker(!showDatePicker)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={17} color={colors.textSecondary} />
                  <Text style={[Typography.bodyMedium, { color: colors.text, marginLeft: 10 }]}>
                    {formatDateButton(expenseDate)}
                  </Text>
                </TouchableOpacity>
                <DualModeDatePickerModal
                  visible={showDatePicker}
                  value={expenseDate}
                  title="Expense Date"
                  theme={state.settings.theme}
                  onConfirm={(selected) => setExpenseDate(selected)}
                  onClose={() => setShowDatePicker(false)}
                />
              </View>

              {/* Notes (Optional) */}
              <View style={styles.modalField}>
                <Text style={[Typography.label, { color: colors.textMuted, marginBottom: 8 }]}>
                  NOTES (OPTIONAL)
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.text,
                      minHeight: 64,
                      textAlignVertical: 'top',
                    },
                  ]}
                  placeholder="Add any notes or details..."
                  placeholderTextColor={colors.textMuted}
                  value={expenseNotes}
                  onChangeText={setExpenseNotes}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveExpenseBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveExpense}
                activeOpacity={0.8}
              >
                <Text style={[Typography.button, { color: '#FFF' }]}>Save Expense</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingTop: 16,
    paddingBottom: 12,
  },
  subtleAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  totalCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  currencyBlock: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  noDataContainer: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  expenseIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdropTap: {
    flex: 1,
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalField: {
    marginBottom: 16,
  },
  categoryOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  addCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  createCategoryCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  saveCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalCurrencyChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  saveExpenseBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
});


