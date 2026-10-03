import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Modal, Dimensions, TextInput, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Colors } from '../theme/colors';
import { Typography } from '../theme/typography';

interface DocumentInfo {
  id: string;
  name: string;
  uri: string;
  type: string;
}

interface DocumentManagerProps {
  documents: DocumentInfo[];
  onChange: (docs: DocumentInfo[]) => void;
  theme: 'light' | 'dark';
}

const { width } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (width - 40 - 20) / 3; // 3 columns, 40 horizontal padding, 20 gap

export default function DocumentManager({ documents, onChange, theme }: DocumentManagerProps) {
  const colors = Colors[theme];
  const [selectedDoc, setSelectedDoc] = useState<DocumentInfo | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentInfo | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const handleAddDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.name || `doc_${Date.now()}`;
        const newUri = FileSystem.documentDirectory + encodeURIComponent(fileName);

        await FileSystem.copyAsync({
          from: asset.uri,
          to: newUri,
        });

        const newDoc: DocumentInfo = {
          id: Math.random().toString(36).substr(2, 9),
          name: fileName,
          uri: newUri,
          type: asset.mimeType || 'application/octet-stream',
        };

        onChange([...documents, newDoc]);
      }
    } catch (error) {
      console.error('Error picking document', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleRemoveDocument = (id: string) => {
    Alert.alert('Remove Document', 'Are you sure you want to remove this document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          onChange(documents.filter((doc) => doc.id !== id));
        },
      },
    ]);
  };

  const handleSaveLabel = () => {
    if (editingDoc) {
      onChange(documents.map((doc) => 
        doc.id === editingDoc.id ? { ...doc, name: editLabel.trim() || doc.name } : doc
      ));
      setEditingDoc(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={[Typography.label, { color: colors.textMuted }]}>
          Documents & Attachments
        </Text>
        <TouchableOpacity onPress={handleAddDocument}>
          <Text style={[Typography.captionSemibold, { color: colors.primary }]}>+ Add Document</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.grid}>
        {documents.map((doc) => {
          const isImage = doc.type.includes('image');
          return (
            <TouchableOpacity 
              key={doc.id} 
              style={styles.gridItem}
              onPress={async () => {
                if (isImage) {
                  setSelectedDoc(doc);
                } else {
                  if (Platform.OS === 'android') {
                    try {
                      const contentUri = await FileSystem.getContentUriAsync(doc.uri);
                      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                        data: contentUri,
                        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
                        type: doc.type,
                      });
                    } catch (e) {
                      Sharing.shareAsync(doc.uri);
                    }
                  } else {
                    Sharing.shareAsync(doc.uri);
                  }
                }
              }}
            >
              <View style={[StyleSheet.absoluteFill, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg, borderWidth: 1, borderRadius: 12, overflow: 'hidden' }]}>
                {isImage ? (
                  <Image source={{ uri: doc.uri }} style={styles.previewImage} />
                ) : (
                  <View style={styles.iconContainer}>
                    <Ionicons name="document-text" size={32} color={colors.primary} />
                  </View>
                )}
                
                <TouchableOpacity 
                  style={styles.docLabelContainer}
                  onPress={(e) => {
                    e.stopPropagation();
                    setEditingDoc(doc);
                    setEditLabel(doc.name);
                  }}
                >
                  <Text style={[Typography.caption, { color: colors.text, fontSize: 10, flex: 1 }]} numberOfLines={1}>
                    {doc.name}
                  </Text>
                  <Ionicons name="pencil" size={10} color={colors.textMuted} style={{ marginLeft: 2 }} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.deleteBadge}
                onPress={() => handleRemoveDocument(doc.id)}
              >
                <Ionicons name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Full Screen Viewer */}
      <Modal visible={!!selectedDoc} animationType="slide" transparent={false} onRequestClose={() => setSelectedDoc(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={styles.modalHeader}>
            <Text style={[Typography.bodySemibold, { color: '#FFF', flex: 1 }]} numberOfLines={1}>
              {selectedDoc?.name}
            </Text>
            <TouchableOpacity onPress={() => setSelectedDoc(null)} style={{ padding: 8 }}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <View style={{ flex: 1 }}>
            <FlatList 
              data={documents.filter(d => d.type.includes('image'))}
              keyExtractor={item => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={Math.max(0, documents.filter(d => d.type.includes('image')).findIndex(d => d.id === selectedDoc?.id))}
              getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                const imageDocs = documents.filter(d => d.type.includes('image'));
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

      {/* Rename Modal */}
      <Modal visible={!!editingDoc} animationType="fade" transparent={true} onRequestClose={() => setEditingDoc(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.renameModal, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[Typography.h3, { color: colors.text, marginBottom: 12 }]}>Rename Document</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
              value={editLabel}
              onChangeText={setEditLabel}
              autoFocus
              selectTextOnFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 }}>
              <TouchableOpacity onPress={() => setEditingDoc(null)} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
                <Text style={[Typography.button, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveLabel} style={{ backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 }}>
                <Text style={[Typography.button, { color: '#FFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_WIDTH * 1.2,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '75%',
    resizeMode: 'cover',
  },
  iconContainer: {
    width: '100%',
    height: '75%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  docLabelContainer: {
    height: '25%',
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  deleteBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  renameModal: {
    width: '80%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
