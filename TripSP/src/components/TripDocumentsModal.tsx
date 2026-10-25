import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Platform,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { Trip, TripDocument, TripDocumentCategory } from '../types';

interface TripDocumentsModalProps {
  visible: boolean;
  onClose: () => void;
  trip: Trip;
  onUpdateDocuments: (docs: TripDocument[]) => Promise<void>;
  theme: 'light' | 'dark';
}

const { width } = Dimensions.get('window');

const CATEGORIES: { id: TripDocumentCategory; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'PASSPORT', label: 'Passport', icon: 'book-outline', color: '#3B82F6' },
  { id: 'VISA', label: 'Visa', icon: 'card-outline', color: '#8B5CF6' },
  { id: 'ID_CARD', label: 'ID Card', icon: 'person-circle-outline', color: '#10B981' },
  { id: 'INSURANCE', label: 'Insurance', icon: 'shield-checkmark-outline', color: '#F59E0B' },
  { id: 'OTHER', label: 'Other', icon: 'document-text-outline', color: '#6B7280' },
];

const isImageDoc = (doc: { type?: string; name?: string; uri?: string }) => {
  return (
    Boolean(doc.type?.toLowerCase().includes('image')) ||
    /\.(jpe?g|png|webp|heic|bmp|gif)$/i.test(doc.name || '') ||
    /\.(jpe?g|png|webp|heic|bmp|gif)$/i.test(doc.uri || '')
  );
};

const isPdfDoc = (doc: { type?: string; name?: string; uri?: string }) => {
  return (
    Boolean(doc.type?.toLowerCase().includes('pdf')) ||
    Boolean(doc.name?.toLowerCase().endsWith('.pdf')) ||
    Boolean(doc.uri?.toLowerCase().endsWith('.pdf'))
  );
};

function DocumentThumbnail({
  uri,
  isImg,
  isPdf,
  categoryColor,
  categoryIcon,
  theme,
  borderColor,
  inputBgColor,
}: {
  uri: string;
  isImg: boolean;
  isPdf: boolean;
  categoryColor: string;
  categoryIcon: keyof typeof Ionicons.glyphMap;
  theme: 'light' | 'dark';
  borderColor: string;
  inputBgColor: string;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <View style={[styles.thumbnailContainer, { backgroundColor: inputBgColor, borderColor }]}>
      {isImg && !imgError ? (
        <>
          <Image
            source={{ uri }}
            style={styles.thumbnailImage}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
          <View style={styles.thumbnailOverlayBadge}>
            <Ionicons name="expand" size={9} color="#FFF" />
          </View>
        </>
      ) : (
        <View style={[styles.pdfDocSheet, { backgroundColor: theme === 'dark' ? '#1E2230' : '#FFFFFF' }]}>
          <View style={[styles.pdfTopBanner, { backgroundColor: isPdf ? '#EF4444' : categoryColor }]}>
            <Text style={styles.pdfBannerText}>{isPdf ? 'PDF' : 'DOC'}</Text>
          </View>
          <View style={styles.pdfSheetBody}>
            <Ionicons
              name={isPdf ? 'document-text' : categoryIcon}
              size={18}
              color={isPdf ? '#EF4444' : categoryColor}
            />
            <View style={[styles.skeletonLine, { width: '70%', backgroundColor: borderColor }]} />
            <View style={[styles.skeletonLine, { width: '50%', backgroundColor: borderColor }]} />
          </View>
        </View>
      )}
    </View>
  );
}

export default function TripDocumentsModal({
  visible,
  onClose,
  trip,
  onUpdateDocuments,
  theme,
}: TripDocumentsModalProps) {
  const colors = Colors[theme];
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImageDoc, setSelectedImageDoc] = useState<TripDocument | null>(null);

  // Edit mode state (only allow add/delete/rename in edit mode)
  const [isEditing, setIsEditing] = useState(false);

  // Rename state
  const [editingDoc, setEditingDoc] = useState<TripDocument | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editCategory, setEditCategory] = useState<TripDocumentCategory>('OTHER');
  const renameInputRef = useRef<any>(null);

  useEffect(() => {
    if (!visible) {
      setIsEditing(false);
      setEditingDoc(null);
      setSearchQuery('');
    }
  }, [visible]);

  useEffect(() => {
    if (editingDoc) {
      const t1 = setTimeout(() => {
        renameInputRef.current?.focus();
      }, 50);
      const t2 = setTimeout(() => {
        renameInputRef.current?.focus();
      }, 150);
      const t3 = setTimeout(() => {
        renameInputRef.current?.focus();
      }, 300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [editingDoc]);

  const documents: TripDocument[] = trip.documents || [];

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesCategory =
        selectedFilter === 'ALL' || (doc.category || 'OTHER') === selectedFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        doc.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesCategory && matchesSearch;
    });
  }, [documents, selectedFilter, searchQuery]);

  const handlePickDocument = async (categoryPreset?: TripDocumentCategory) => {
    if (!isEditing) return;
    try {
      Alert.alert(
        'Add Travel Document',
        'Choose how you want to add your document:',
        [
          {
            text: 'Choose PDF / File',
            onPress: async () => {
              const res = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
              });

              if (!res.canceled && res.assets && res.assets.length > 0) {
                const asset = res.assets[0];
                await saveNewDoc(asset.uri, asset.name, asset.mimeType || 'application/octet-stream', categoryPreset);
              }
            },
          },
          {
            text: 'Choose from Photos',
            onPress: async () => {
              const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.9,
              });

              if (!res.canceled && res.assets && res.assets.length > 0) {
                const asset = res.assets[0];
                const fileName = asset.fileName || `Photo_${Date.now()}.jpg`;
                await saveNewDoc(asset.uri, fileName, asset.mimeType || 'image/jpeg', categoryPreset);
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (e) {
      console.error('Error adding document:', e);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const saveNewDoc = async (
    uri: string,
    name: string,
    mimeType: string,
    categoryPreset?: TripDocumentCategory
  ) => {
    try {
      const docsDir = `${FileSystem.documentDirectory}trip_docs/`;
      const dirInfo = await FileSystem.getInfoAsync(docsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(docsDir, { intermediates: true });
      }

      const fileExt = name.split('.').pop() || (mimeType.includes('pdf') ? 'pdf' : 'jpg');
      const uniqueName = `trip_${trip.id}_${Date.now()}.${fileExt}`;
      const newUri = `${docsDir}${uniqueName}`;

      await FileSystem.copyAsync({ from: uri, to: newUri });

      let finalMimeType = mimeType;
      const lowerExt = fileExt.toLowerCase();
      if (!finalMimeType || finalMimeType === 'application/octet-stream') {
        if (['jpg', 'jpeg'].includes(lowerExt)) finalMimeType = 'image/jpeg';
        else if (lowerExt === 'png') finalMimeType = 'image/png';
        else if (lowerExt === 'webp') finalMimeType = 'image/webp';
        else if (lowerExt === 'heic') finalMimeType = 'image/heic';
        else if (lowerExt === 'pdf') finalMimeType = 'application/pdf';
      }

      const newDoc: TripDocument = {
        id: Math.random().toString(36).substring(2, 11),
        name: name,
        uri: newUri,
        type: finalMimeType,
        category: categoryPreset || (selectedFilter !== 'ALL' ? (selectedFilter as TripDocumentCategory) : 'OTHER'),
        createdAt: new Date().toISOString(),
      };

      const updated = [...documents, newDoc];
      await onUpdateDocuments(updated);
    } catch (err) {
      console.error('Error saving document to storage:', err);
      Alert.alert('Error', 'Failed to save document offline');
    }
  };

  const handleOpenDoc = async (doc: TripDocument) => {
    if (isImageDoc(doc)) {
      setSelectedImageDoc(doc);
    } else {
      if (Platform.OS === 'android') {
        try {
          const contentUri = await FileSystem.getContentUriAsync(doc.uri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1,
            type: doc.type || (isPdfDoc(doc) ? 'application/pdf' : 'application/octet-stream'),
          });
        } catch {
          Sharing.shareAsync(doc.uri);
        }
      } else {
        Sharing.shareAsync(doc.uri);
      }
    }
  };

  const handleShareDoc = async (doc: TripDocument) => {
    try {
      await Sharing.shareAsync(doc.uri);
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const handleDeleteDoc = (docId: string) => {
    if (!isEditing) return;
    Alert.alert('Delete Document', 'Are you sure you want to remove this document from the vault?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = documents.filter((d) => d.id !== docId);
          await onUpdateDocuments(updated);
        },
      },
    ]);
  };

  const handleSaveRename = async () => {
    if (!isEditing || !editingDoc) return;
    const updated = documents.map((d) =>
      d.id === editingDoc.id
        ? { ...d, name: editLabel.trim() || d.name, category: editCategory }
        : d
    );
    await onUpdateDocuments(updated);
    setEditingDoc(null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={[styles.vaultIconCircle, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="briefcase" size={20} color={colors.primary} />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[Typography.h2, { color: colors.text }]} numberOfLines={1}>
                Documents Vault
              </Text>
              <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                {documents.length} {documents.length === 1 ? 'credential' : 'credentials'} for {trip.name}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setIsEditing(!isEditing)}
              style={[
                styles.editModeBtn,
                { backgroundColor: isEditing ? colors.primary : colors.inputBg },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[Typography.captionSemibold, { color: isEditing ? '#FFF' : colors.primary, fontSize: 13 }]}>
                {isEditing ? 'Done' : 'Edit'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.inputBg }]}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Add Bar & Search */}
        <View style={styles.topBar}>
          <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search documents..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {isEditing && (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => handlePickDocument()}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={[Typography.button, { color: '#FFF', marginLeft: 4 }]}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category Pills Filter */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedFilter === 'ALL' ? colors.primary : colors.inputBg,
                  borderColor: selectedFilter === 'ALL' ? colors.primary : colors.inputBorder,
                },
              ]}
              onPress={() => setSelectedFilter('ALL')}
            >
              <Text
                style={[
                  Typography.captionSemibold,
                  { color: selectedFilter === 'ALL' ? '#FFF' : colors.text },
                ]}
              >
                All ({documents.length})
              </Text>
            </TouchableOpacity>

            {CATEGORIES.map((cat) => {
              const count = documents.filter((d) => (d.category || 'OTHER') === cat.id).length;
              const isSelected = selectedFilter === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected ? cat.color : colors.inputBg,
                      borderColor: isSelected ? cat.color : colors.inputBorder,
                    },
                  ]}
                  onPress={() => setSelectedFilter(cat.id)}
                >
                  <Ionicons
                    name={cat.icon}
                    size={13}
                    color={isSelected ? '#FFF' : cat.color}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      Typography.captionSemibold,
                      { color: isSelected ? '#FFF' : colors.text },
                    ]}
                  >
                    {cat.label} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Documents List */}
        <ScrollView contentContainerStyle={styles.listContent}>
          {filteredDocuments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.inputBg }]}>
                <Ionicons name="document-text-outline" size={44} color={colors.textMuted} />
              </View>
              <Text style={[Typography.h3, { color: colors.text, marginTop: 16 }]}>
                {searchQuery ? 'No matching documents' : 'No documents in vault'}
              </Text>
              <Text style={[Typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: 6, paddingHorizontal: 24 }]}>
                {searchQuery
                  ? 'Try searching with a different name or category.'
                  : 'Add your passports, visas, insurance policies, or national ID cards so you can access them anywhere completely offline.'}
              </Text>

              {isEditing ? (
                <TouchableOpacity
                  style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    handlePickDocument(selectedFilter !== 'ALL' ? (selectedFilter as TripDocumentCategory) : undefined);
                  }}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={[Typography.button, { color: '#FFF' }]}>
                    Upload {selectedFilter !== 'ALL' ? CATEGORIES.find((c) => c.id === selectedFilter)?.label || 'Document' : 'Document'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ marginTop: 24, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.inputBg }}>
                  <Text style={[Typography.caption, { color: colors.textMuted }]}>
                    Tap 'Edit' in the top right to add documents
                  </Text>
                </View>
              )}
            </View>
          ) : (
            filteredDocuments.map((doc) => {
              const categoryDef = CATEGORIES.find((c) => c.id === (doc.category || 'OTHER')) || CATEGORIES[4];
              const isPdf = isPdfDoc(doc);
              const isImg = isImageDoc(doc);

              return (
                <TouchableOpacity
                  key={doc.id}
                  style={[styles.docCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleOpenDoc(doc)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardContentRow}>
                    {/* Thumbnail / Preview Box */}
                    <DocumentThumbnail
                      uri={doc.uri}
                      isImg={isImg}
                      isPdf={isPdf}
                      categoryColor={categoryDef.color}
                      categoryIcon={categoryDef.icon}
                      theme={theme}
                      borderColor={colors.border}
                      inputBgColor={colors.inputBg}
                    />

                    {/* Middle Info */}
                    <View style={styles.docInfo}>
                      <View style={[styles.categoryTag, { backgroundColor: categoryDef.color + '18' }]}>
                        <Ionicons name={categoryDef.icon} size={11} color={categoryDef.color} />
                        <Text style={[Typography.captionSemibold, { color: categoryDef.color, marginLeft: 4, fontSize: 10.5 }]}>
                          {categoryDef.label}
                        </Text>
                      </View>

                      <Text style={[Typography.bodySemibold, { color: colors.text, fontSize: 14 }]} numberOfLines={2}>
                        {doc.name}
                      </Text>
                      <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 4, fontSize: 11 }]}>
                        {isPdf ? 'PDF Document' : isImg ? 'Photo / Image' : 'File'} • Offline ready
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsColumn}>
                      {isEditing && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.inputBg }]}
                          onPress={() => {
                            setEditingDoc(doc);
                            setEditLabel(doc.name);
                            setEditCategory(doc.category || 'OTHER');
                          }}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="pencil" size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.inputBg }]}
                        onPress={() => handleShareDoc(doc)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="share-outline" size={15} color={colors.textSecondary} />
                      </TouchableOpacity>

                      {isEditing && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: colors.error + '14' }]}
                          onPress={() => handleDeleteDoc(doc.id)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="trash-outline" size={15} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Rename & Category In-Modal Overlay */}
        {!!editingDoc && (
          <View style={[StyleSheet.absoluteFill, styles.modalOverlay, { zIndex: 9999 }]}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={[styles.renameCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[Typography.h3, { color: colors.text, marginBottom: 12 }]}>
                  Edit Document
                </Text>

                <Text style={[Typography.captionSemibold, { color: colors.textSecondary, marginBottom: 6 }]}>
                  Document Name
                </Text>
                <TextInput
                  ref={renameInputRef}
                  style={[
                    styles.renameInput,
                    {
                      borderColor: colors.inputBorder,
                      color: colors.text,
                      backgroundColor: colors.inputBg,
                    },
                  ]}
                  value={editLabel}
                  onChangeText={setEditLabel}
                  autoFocus={true}
                  selectTextOnFocus={true}
                  showSoftInputOnFocus={true}
                />

              <Text style={[Typography.captionSemibold, { color: colors.textSecondary, marginTop: 14, marginBottom: 8 }]}>
                Document Category
              </Text>
              <View style={styles.categoryPicker}>
                {CATEGORIES.map((cat) => {
                  const isSelected = editCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.catOption,
                        {
                          backgroundColor: isSelected ? cat.color : colors.inputBg,
                          borderColor: isSelected ? cat.color : colors.inputBorder,
                        },
                      ]}
                      onPress={() => setEditCategory(cat.id)}
                    >
                      <Ionicons
                        name={cat.icon}
                        size={12}
                        color={isSelected ? '#FFF' : cat.color}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          Typography.captionSemibold,
                          { color: isSelected ? '#FFF' : colors.text, fontSize: 11 },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setEditingDoc(null)}
                  style={{ paddingVertical: 8, paddingHorizontal: 14 }}
                >
                  <Text style={[Typography.button, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveRename}
                  style={{
                    backgroundColor: colors.primary,
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                  }}
                >
                  <Text style={[Typography.button, { color: '#FFF' }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

        {/* Full Screen Image Viewer Modal */}
        <Modal
          visible={!!selectedImageDoc}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedImageDoc(null)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
            <View style={styles.imageViewerHeader}>
              <Text style={[Typography.bodySemibold, { color: '#FFF', flex: 1 }]} numberOfLines={1}>
                {selectedImageDoc?.name}
              </Text>
              {selectedImageDoc && (
                <TouchableOpacity
                  onPress={() => handleShareDoc(selectedImageDoc)}
                  style={{ padding: 8, marginRight: 6 }}
                >
                  <Ionicons name="share-outline" size={24} color="#FFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setSelectedImageDoc(null)} style={{ padding: 8 }}>
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              {selectedImageDoc && (
                <Image
                  source={{ uri: selectedImageDoc.uri }}
                  style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                />
              )}
            </View>
          </SafeAreaView>
        </Modal>
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
  vaultIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
  },
  filterRow: {
    paddingVertical: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  docCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 58,
    height: 74,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlayBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    padding: 3,
  },
  pdfDocSheet: {
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
  },
  pdfTopBanner: {
    height: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfBannerText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pdfSheetBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  skeletonLine: {
    height: 2.5,
    borderRadius: 1.5,
  },
  docInfo: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  categoryTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginBottom: 6,
  },
  actionsColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  renameCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  renameInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  imageViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
});
