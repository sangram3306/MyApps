import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';
import { Colors } from '../../src/theme/colors';
import { Typography } from '../../src/theme/typography';
import { PackingCategory, PackingItem, DEFAULT_PACKING_TEMPLATE } from '../../src/types';

// Generate a simple unique ID
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export default function PackingScreen() {
  const { state, getActiveTrip, getPackingCategoriesForTrip, savePackingCategories } = useApp();
  const colors = Colors[state.settings.theme];
  const activeTrip = getActiveTrip();
  const tripId = activeTrip?.id || '';

  const categories = useMemo(
    () => (tripId ? getPackingCategoriesForTrip(tripId) : []),
    [tripId, state.packingCategories]
  );

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [addingItemToCategoryId, setAddingItemToCategoryId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Progress
  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0);
  const checkedItems = categories.reduce((sum, c) => sum + c.items.filter((i) => i.checked).length, 0);
  const progressPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  // ─── Helpers ──────────────────────────────────────────

  const saveAll = useCallback(
    (updated: PackingCategory[]) => {
      // Save all categories (for all trips)
      const otherTrips = state.packingCategories.filter((c) => c.tripId !== tripId);
      savePackingCategories([...otherTrips, ...updated]);
    },
    [tripId, state.packingCategories, savePackingCategories]
  );

  const toggleExpand = (catId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // ─── Template ─────────────────────────────────────────

  const loadTemplate = () => {
    if (categories.length > 0) {
      Alert.alert(
        'Load Template',
        'This will replace your current packing list with the default template. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: doLoadTemplate },
        ]
      );
    } else {
      doLoadTemplate();
    }
  };

  const doLoadTemplate = () => {
    const templateCategories: PackingCategory[] = DEFAULT_PACKING_TEMPLATE.map((tmpl) => ({
      id: uid(),
      tripId,
      name: tmpl.name,
      icon: tmpl.icon,
      items: tmpl.items.map((name) => ({ id: uid(), name, checked: false })),
    }));
    saveAll(templateCategories);
    // Expand all by default
    const expanded: Record<string, boolean> = {};
    templateCategories.forEach((c) => (expanded[c.id] = true));
    setExpandedCategories(expanded);
  };

  // ─── Check/Uncheck ────────────────────────────────────

  const toggleItem = (catId: string, itemId: string) => {
    const updated = categories.map((c) =>
      c.id === catId
        ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i)) }
        : c
    );
    saveAll(updated);
  };

  // ─── Add Item ─────────────────────────────────────────

  const addItem = (catId: string) => {
    const name = newItemName.trim();
    if (!name) return;
    const updated = categories.map((c) =>
      c.id === catId ? { ...c, items: [...c.items, { id: uid(), name, checked: false }] } : c
    );
    saveAll(updated);
    setNewItemName('');
    setAddingItemToCategoryId(null);
  };

  // ─── Delete Item ──────────────────────────────────────

  const deleteItem = (catId: string, itemId: string) => {
    const cat = categories.find((c) => c.id === catId);
    const item = cat?.items.find((i) => i.id === itemId);
    Alert.alert(
      item?.name || 'Item',
      '',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = categories.map((c) =>
              c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
            );
            saveAll(updated);
          },
        },
      ]
    );
  };

  // ─── Add Category ─────────────────────────────────────

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const newCat: PackingCategory = {
      id: uid(),
      tripId,
      name,
      icon: 'folder',
      items: [],
    };
    saveAll([...categories, newCat]);
    setExpandedCategories((prev) => ({ ...prev, [newCat.id]: true }));
    setNewCategoryName('');
    setAddingCategory(false);
  };

  // ─── Delete Category ──────────────────────────────────

  const deleteCategory = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    Alert.alert(
      'Delete Category',
      `Delete "${cat?.name}" and all its items?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => saveAll(categories.filter((c) => c.id !== catId)),
        },
      ]
    );
  };

  // ─── Empty State ──────────────────────────────────────

  if (!activeTrip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[Typography.h1, { color: colors.text }]}>Packing List</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="bag-check" size={48} color={colors.primary} />
          </View>
          <Text style={[Typography.h3, { color: colors.text, marginTop: 20, textAlign: 'center' }]}>
            No Active Trip
          </Text>
          <Text style={[Typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
            Select or create a trip first to manage your packing list
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Category Progress ────────────────────────────────

  const getCategoryProgress = (cat: PackingCategory) => {
    const total = cat.items.length;
    const checked = cat.items.filter((i) => i.checked).length;
    return { total, checked, text: `${checked}/${total}` };
  };

  // ─── Render ───────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.h1, { color: colors.text }]}>Packing List</Text>
              <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {activeTrip.name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={loadTemplate}
              style={[styles.templateBtn, { backgroundColor: colors.primary + '20' }]}
            >
              <Text style={[Typography.button, { color: colors.primary, fontSize: 12 }]}>Template</Text>
            </TouchableOpacity>
          </View>

          {/* Progress Card */}
          <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={[Typography.bodySemibold, { color: colors.text }]}>
                  {checkedItems} of {totalItems} packed
                </Text>
                <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  {progressPercent === 100 ? 'All packed! ✈️' : `${progressPercent}% complete`}
                </Text>
              </View>
              <Text style={[Typography.display, { color: colors.primary, fontSize: 28 }]}>
                {progressPercent}%
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: progressPercent === 100 ? colors.success : colors.primary,
                    width: `${progressPercent}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* Categories */}
          {categories.map((cat) => {
            const isExpanded = expandedCategories[cat.id] !== false; // default expanded
            const progress = getCategoryProgress(cat);
            const allChecked = progress.total > 0 && progress.checked === progress.total;

            return (
              <View
                key={cat.id}
                style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                {/* Category Header */}
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => toggleExpand(cat.id)}
                  onLongPress={() => deleteCategory(cat.id)}
                >
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryIcon, { backgroundColor: (allChecked ? colors.success : colors.primary) + '20' }]}>
                      <Ionicons
                        name={cat.icon as any}
                        size={18}
                        color={allChecked ? colors.success : colors.primary}
                      />
                    </View>
                    <Text style={[Typography.bodySemibold, { color: colors.text }]}>{cat.name}</Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text style={[Typography.caption, { color: allChecked ? colors.success : colors.textMuted }]}>
                      {progress.text}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textMuted}
                      style={{ marginLeft: 8 }}
                    />
                  </View>
                </TouchableOpacity>

                {/* Items */}
                {isExpanded && (
                  <View style={styles.itemsList}>
                    {cat.items.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.itemRow, { borderBottomColor: colors.borderLight }]}
                        onPress={() => toggleItem(cat.id, item.id)}
                        onLongPress={() => deleteItem(cat.id, item.id)}
                      >
                        <Ionicons
                          name={item.checked ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={item.checked ? colors.success : colors.textMuted}
                        />
                        <Text
                          style={[
                            item.checked ? Typography.bodySemibold : Typography.body,
                            {
                              color: item.checked ? colors.success : colors.text,
                              marginLeft: 12,
                              flex: 1,
                            },
                          ]}
                        >
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {/* Add Item Input */}
                    {addingItemToCategoryId === cat.id ? (
                      <View style={[styles.addItemRow, { borderTopColor: colors.borderLight }]}>
                        <TextInput
                          style={[
                            styles.addItemInput,
                            {
                              backgroundColor: colors.inputBg,
                              color: colors.text,
                              borderColor: colors.inputBorder,
                            },
                          ]}
                          placeholder="Item name"
                          placeholderTextColor={colors.textMuted}
                          value={newItemName}
                          onChangeText={setNewItemName}
                          onSubmitEditing={() => addItem(cat.id)}
                          autoFocus
                        />
                        <TouchableOpacity onPress={() => addItem(cat.id)} style={{ marginLeft: 8 }}>
                          <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setAddingItemToCategoryId(null);
                            setNewItemName('');
                          }}
                          style={{ marginLeft: 4 }}
                        >
                          <Ionicons name="close-circle" size={28} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addItemBtn}
                        onPress={() => {
                          setAddingItemToCategoryId(cat.id);
                          setNewItemName('');
                        }}
                      >
                        <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                        <Text style={[Typography.caption, { color: colors.primary, marginLeft: 6 }]}>
                          Add a new item
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {/* Add New Category */}
          {addingCategory ? (
            <View
              style={[
                styles.categoryCard,
                { backgroundColor: colors.card, borderColor: colors.border, padding: 16 },
              ]}
            >
              <TextInput
                style={[
                  styles.addItemInput,
                  {
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                    borderColor: colors.inputBorder,
                    marginBottom: 12,
                  },
                ]}
                placeholder="Category name"
                placeholderTextColor={colors.textMuted}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                onSubmitEditing={addCategory}
                autoFocus
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    setAddingCategory(false);
                    setNewCategoryName('');
                  }}
                  style={[styles.actionBtn, { backgroundColor: colors.borderLight }]}
                >
                  <Text style={[Typography.button, { color: colors.textSecondary, fontSize: 12 }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={addCategory}
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={[Typography.button, { color: '#FFF', fontSize: 12 }]}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addCategoryBtn, { borderColor: colors.border }]}
              onPress={() => setAddingCategory(true)}
            >
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text style={[Typography.bodySemibold, { color: colors.primary, marginLeft: 8 }]}>
                Add a new category
              </Text>
            </TouchableOpacity>
          )}
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
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
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
  templateBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  progressCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemsList: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  addItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  addItemInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  addCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
