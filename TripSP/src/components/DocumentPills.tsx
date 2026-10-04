import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Image, Platform, Dimensions, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { Typography } from '../theme/typography';
import { Colors } from '../theme/colors';

interface DocumentPillsProps {
  documents?: { id: string; name: string; uri: string; type: string }[];
  theme: 'light' | 'dark';
}

const { width } = Dimensions.get('window');

export default function DocumentPills({ documents, theme }: DocumentPillsProps) {
  const [selectedDoc, setSelectedDoc] = useState<{ id: string; name: string; uri: string; type: string } | null>(null);

  if (!documents || documents.length === 0) return null;

  const colors = Colors[theme];

  return (
    <>
      <View style={styles.container}>
        {documents.map(doc => (
          <TouchableOpacity 
            key={doc.id} 
            style={[styles.pill, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            onPress={async (e) => { 
              e.stopPropagation(); 
              if (doc.type.includes('image')) {
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
            }}
          >
            <Ionicons 
              name={doc.type.includes('pdf') ? 'document-text' : 'image'} 
              size={12} 
              color={colors.primary} 
            />
            <Text 
              style={[Typography.caption, { color: colors.textSecondary, marginLeft: 4, maxWidth: 100 }]} 
              numberOfLines={1}
            >
              {doc.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
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
});
