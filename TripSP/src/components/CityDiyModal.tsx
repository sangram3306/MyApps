import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { CityDiyData, CityDiyItem, getCityDiyData, saveCityDiyData } from '../storage/asyncStorage';

interface CityDiyModalProps {
  visible: boolean;
  onClose: () => void;
  cityName: string;
  tripId: string;
  theme: 'light' | 'dark';
}

export default function CityDiyModal({
  visible,
  onClose,
  cityName,
  tripId,
  theme,
}: CityDiyModalProps) {
  const colors = Colors[theme];
  const storageKey = `${tripId}::${cityName}`;

  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<CityDiyItem[]>([]);
  const [newIdea, setNewIdea] = useState('');
  const [activeTab, setActiveTab] = useState<'spots' | 'notes'>('spots');
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible && tripId && cityName) {
      getCityDiyData(storageKey).then((data) => {
        setNotes(data.notes || '');
        setChecklist(data.checklist || []);
      });
    }
  }, [visible, storageKey]);

  useEffect(() => {
    return () => {
      if (notesTimerRef.current) {
        clearTimeout(notesTimerRef.current);
      }
    };
  }, []);

  const persistData = async (updatedNotes: string, updatedList: CityDiyItem[]) => {
    setNotes(updatedNotes);
    setChecklist(updatedList);
    await saveCityDiyData(storageKey, { notes: updatedNotes, checklist: updatedList });
  };

  const handleAddIdea = async () => {
    if (!newIdea.trim()) return;
    const newItem: CityDiyItem = {
      id: Math.random().toString(36).substring(2, 10),
      text: newIdea.trim(),
      done: false,
    };
    const updated = [newItem, ...checklist];
    setNewIdea('');
    await persistData(notes, updated);
  };

  const handleToggleDone = async (id: string) => {
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    await persistData(notes, updated);
  };

  const handleDeleteItem = async (id: string) => {
    const updated = checklist.filter((item) => item.id !== id);
    await persistData(notes, updated);
  };

  const handleNotesChange = (text: string) => {
    setNotes(text);
    if (notesTimerRef.current) {
      clearTimeout(notesTimerRef.current);
    }
    notesTimerRef.current = setTimeout(() => {
      saveCityDiyData(storageKey, { notes: text, checklist });
    }, 500);
  };

  const handleClose = async () => {
    if (notesTimerRef.current) {
      clearTimeout(notesTimerRef.current);
    }
    await saveCityDiyData(storageKey, { notes, checklist });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={[styles.diyIconCircle, { backgroundColor: '#F59E0B' + '20' }]}>
              <Ionicons name="compass" size={20} color="#F59E0B" />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[Typography.h2, { color: colors.text }]} numberOfLines={1}>
                DIY Exploration • {cityName}
              </Text>
              <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                Flexible spots & un-timed ideas to explore
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.inputBg }]}>
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'spots' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab('spots')}
          >
            <Ionicons
              name="list"
              size={16}
              color={activeTab === 'spots' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                Typography.bodySemibold,
                { color: activeTab === 'spots' ? colors.primary : colors.textSecondary, marginLeft: 6 },
              ]}
            >
              Ideas & Spots ({checklist.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'notes' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab('notes')}
          >
            <Ionicons
              name="document-text-outline"
              size={16}
              color={activeTab === 'notes' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                Typography.bodySemibold,
                { color: activeTab === 'notes' ? colors.primary : colors.textSecondary, marginLeft: 6 },
              ]}
            >
              General Notes
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {activeTab === 'spots' ? (
            <View style={{ flex: 1, padding: 16 }}>
              {/* Add Input Bar */}
              <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Add a spot to wander, food to try, or tip..."
                  placeholderTextColor={colors.textMuted}
                  value={newIdea}
                  onChangeText={setNewIdea}
                  onSubmitEditing={handleAddIdea}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: colors.primary }]}
                  onPress={handleAddIdea}
                  disabled={!newIdea.trim()}
                >
                  <Ionicons name="add" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Checklist Scroll */}
              <ScrollView
                style={{ flex: 1, marginTop: 14 }}
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              >
                {checklist.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIconCircle, { backgroundColor: colors.inputBg }]}>
                      <Ionicons name="map-outline" size={40} color={colors.textMuted} />
                    </View>
                    <Text style={[Typography.h3, { color: colors.text, marginTop: 14 }]}>
                      No DIY spots yet
                    </Text>
                    <Text style={[Typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 6, paddingHorizontal: 20 }]}>
                      Jot down spontaneous ideas, cafes, photo spots, or walking trails you might want to explore with no fixed schedule!
                    </Text>
                  </View>
                ) : (
                  checklist.map((item) => (
                    <View
                      key={item.id}
                      style={[
                        styles.itemCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: item.done ? colors.border : colors.inputBorder,
                          opacity: item.done ? 0.65 : 1,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => handleToggleDone(item.id)}
                        style={styles.checkboxTouch}
                      >
                        <Ionicons
                          name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={item.done ? '#10B981' : colors.textMuted}
                        />
                      </TouchableOpacity>

                      <Text
                        style={[
                          Typography.body,
                          {
                            color: colors.text,
                            flex: 1,
                            marginHorizontal: 10,
                            textDecorationLine: item.done ? 'line-through' : 'none',
                          },
                        ]}
                      >
                        {item.text}
                      </Text>

                      <TouchableOpacity
                        onPress={() => handleDeleteItem(item.id)}
                        style={{ padding: 6 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          ) : (
            <View style={{ flex: 1, padding: 16 }}>
              <Text style={[Typography.captionSemibold, { color: colors.textSecondary, marginBottom: 8 }]}>
                Free-form notes, tips, and recommendations:
              </Text>
              <TextInput
                style={[
                  styles.notesArea,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder="Write any tips from locals, un-timed markets, neighborhoods to stroll, public transport quirks, etc..."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
                value={notes}
                onChangeText={handleNotesChange}
              />
            </View>
          )}
        </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  diyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  checkboxTouch: {
    padding: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesArea: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    fontSize: 14,
    lineHeight: 22,
  },
});
