import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  Platform,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { Typography } from '../theme/typography';
import { Colors } from '../theme/colors';
import { useApp } from '../context/AppContext';

import { StyleProp, ViewStyle } from 'react-native';

interface DocumentPillsProps {
  documents?: { id: string; name: string; uri: string; type: string }[];
  theme: 'light' | 'dark';
  isOverlay?: boolean;
  style?: StyleProp<ViewStyle>;
}

const { width } = Dimensions.get('window');

export default function DocumentPills({ documents, theme, isOverlay = false, style }: DocumentPillsProps) {
  const { state } = useApp();
  const [showListModal, setShowListModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ id: string; name: string; uri: string; type: string } | null>(null);

  const showDocumentBadge = state.settings.showDocumentBadge ?? true;
  if (!showDocumentBadge || !documents || documents.length === 0) return null;

  const colors = Colors[theme];

  const handleOpenDoc = async (doc: { id: string; name: string; uri: string; type: string }) => {
    if (doc.type.toLowerCase().includes('image')) {
      setSelectedDoc(doc);
    } else {
      if (Platform.OS === 'android') {
        try {
          const FileSystem = require('expo-file-system/legacy');
          const IntentLauncher = require('expo-intent-launcher');
          const contentUri = await FileSystem.getContentUriAsync(doc.uri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1,
            type: doc.type,
          });
        } catch (e) {
          Sharing.shareAsync(doc.uri);
        }
      } else {
        Sharing.shareAsync(doc.uri);
      }
    }
  };

  const handleShareDoc = async (doc: { id: string; name: string; uri: string; type: string }) => {
    try {
      await Sharing.shareAsync(doc.uri);
    } catch (err) {
      console.warn('Share document error:', err);
    }
  };

  return (
    <>
      {/* Floating notification count badge with paperclip icon and count */}
      <TouchableOpacity
        style={[
          styles.badge,
          {
            backgroundColor: theme === 'dark' ? '#374151' : '#4B5563',
            borderColor: theme === 'dark' ? '#1E1E35' : '#FFFFFF',
          },
          style,
        ]}
        onPress={(e) => {
          e.stopPropagation();
          setShowListModal(true);
        }}
        activeOpacity={0.85}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="attach" size={11} color="#F3F4F6" style={{ marginRight: 2 }} />
        <Text style={styles.badgeText}>{documents.length}</Text>
      </TouchableOpacity>

      {/* Floating list of documents modal */}
      <Modal
        visible={showListModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowListModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={(e) => {
            e.stopPropagation();
            setShowListModal(false);
          }}
        >
          <Pressable
            style={[
              styles.floatingCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: colors.shadow,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={[styles.floatingHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={[styles.headerIconBox, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="folder-open-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[Typography.bodySemibold, { color: colors.text }]} numberOfLines={1}>
                    Attached Documents
                  </Text>
                  <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                    {documents.length} {documents.length === 1 ? 'file available offline' : 'files available offline'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowListModal(false)}
                style={[styles.closeBtn, { backgroundColor: colors.inputBg }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Document Items List */}
            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {documents.map((doc, idx) => {
                const isPdf = doc.type?.toLowerCase().includes('pdf') || doc.name?.toLowerCase().endsWith('.pdf');
                const isImg = doc.type?.toLowerCase().includes('image') || /\.(jpe?g|png|webp|heic|bmp|gif)$/i.test(doc.name || '');
                const iconColor = isPdf ? '#EF4444' : isImg ? '#3B82F6' : colors.primary;
                const iconBg = isPdf
                  ? 'rgba(239, 68, 68, 0.12)'
                  : isImg
                  ? 'rgba(59, 130, 246, 0.12)'
                  : colors.primary + '14';
                const iconName = isPdf ? 'document-text' : isImg ? 'image' : 'document';
                const typeLabel = isPdf ? 'PDF Document' : isImg ? 'Image / Photo' : 'Document';

                return (
                  <TouchableOpacity
                    key={doc.id || idx}
                    style={[
                      styles.docItem,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                        marginBottom: idx === documents.length - 1 ? 0 : 8,
                      },
                    ]}
                    onPress={() => handleOpenDoc(doc)}
                    activeOpacity={0.7}
                  >
                    {isImg ? (
                      <View style={[styles.thumbnailBox, { borderColor: colors.border }]}>
                        <Image source={{ uri: doc.uri }} style={styles.thumbnailImg} resizeMode="cover" />
                      </View>
                    ) : (
                      <View style={[styles.docTypeIconBox, { backgroundColor: iconBg }]}>
                        <Ionicons name={iconName} size={18} color={iconColor} />
                      </View>
                    )}

                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text style={[Typography.bodySemibold, { color: colors.text, fontSize: 13 }]} numberOfLines={2}>
                        {doc.name}
                      </Text>
                      <Text style={[Typography.caption, { color: colors.textSecondary, fontSize: 11, marginTop: 2 }]}>
                        {typeLabel}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.actionIconBtn, { backgroundColor: colors.borderLight || colors.inputBg }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleShareDoc(doc);
                        }}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="share-outline" size={15} color={colors.textSecondary} />
                      </TouchableOpacity>

                      <View style={[styles.actionIconBtn, { backgroundColor: colors.primary + '18' }]}>
                        <Ionicons name="open-outline" size={15} color={colors.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Full Screen Image Viewer Modal */}
      <Modal
        visible={!!selectedDoc}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedDoc(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={styles.imageViewerHeader}>
            <Text style={[Typography.bodySemibold, { color: '#FFF', flex: 1 }]} numberOfLines={1}>
              {selectedDoc?.name}
            </Text>
            {selectedDoc && (
              <TouchableOpacity
                onPress={() => handleShareDoc(selectedDoc)}
                style={{ padding: 8, marginRight: 4 }}
              >
                <Ionicons name="share-outline" size={24} color="#FFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setSelectedDoc(null)} style={{ padding: 8 }}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <FlatList
              data={documents.filter((d) => d.type?.toLowerCase().includes('image'))}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={Math.max(
                0,
                documents
                  .filter((d) => d.type?.toLowerCase().includes('image'))
                  .findIndex((d) => d.id === selectedDoc?.id)
              )}
              getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                const imageDocs = documents.filter((d) => d.type?.toLowerCase().includes('image'));
                if (imageDocs[index]) {
                  setSelectedDoc(imageDocs[index]);
                }
              }}
              renderItem={({ item }) => (
                <View style={{ width, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                  <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                </View>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    height: 20,
    minWidth: 26,
    borderRadius: 10,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.16,
    shadowRadius: 2.5,
    elevation: 4,
  },
  badgeText: {
    color: '#F3F4F6',
    fontSize: 10.5,
    fontWeight: '700',
    includeFontPadding: false,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  floatingCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  floatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  docTypeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  actionIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
