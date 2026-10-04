import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface FABProps {
  onPress: () => void;
  icon?: string;
  theme: 'light' | 'dark';
  style?: ViewStyle;
}

export default function FAB({ onPress, icon = 'add', theme, style }: FABProps) {
  const colors = Colors[theme];

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {
          backgroundColor: colors.fab,
          shadowColor: colors.primary,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon as any} size={28} color={colors.fabText} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
