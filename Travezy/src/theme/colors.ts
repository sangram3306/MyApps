export const Colors = {
  light: {
    // Primary palette
    primary: '#6C63FF',
    primaryLight: '#9D97FF',
    primaryDark: '#4A42D4',

    // Background
    background: '#F5F7FA',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    card: '#FFFFFF',

    // Text
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',

    // Accent
    accent: '#4ECDC4',
    accentLight: '#7EDDD6',

    // Status
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',

    // Borders
    border: '#E5E7EB',
    borderLight: '#F3F4F6',

    // Tab bar
    tabBar: '#FFFFFF',
    tabBarBorder: '#E5E7EB',
    tabActive: '#6C63FF',
    tabInactive: '#9CA3AF',

    // Timeline
    timelineLine: '#D1D5DB',
    timelineDot: '#6C63FF',

    // Shadows
    shadow: 'rgba(0, 0, 0, 0.08)',

    // Category colors
    flight: '#6C63FF',
    hotel: '#FF6B6B',
    attraction: '#4ECDC4',
    food: '#FFB347',
    transport: '#45B7D1',
    other: '#95A5A6',

    // FAB
    fab: '#6C63FF',
    fabText: '#FFFFFF',

    // Modal overlay
    overlay: 'rgba(0, 0, 0, 0.5)',

    // Input
    inputBg: '#F9FAFB',
    inputBorder: '#D1D5DB',
    inputFocusBorder: '#6C63FF',
  },
  dark: {
    // Primary palette
    primary: '#7C74FF',
    primaryLight: '#A59FFF',
    primaryDark: '#5B52E0',

    // Background
    background: '#0F0F1A',
    surface: '#1A1A2E',
    surfaceElevated: '#222240',
    card: '#1E1E35',

    // Text
    text: '#F0F0F5',
    textSecondary: '#A0A0B8',
    textMuted: '#6B6B80',

    // Accent
    accent: '#4ECDC4',
    accentLight: '#7EDDD6',

    // Status
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',

    // Borders
    border: '#2D2D45',
    borderLight: '#252540',

    // Tab bar
    tabBar: '#141425',
    tabBarBorder: '#2D2D45',
    tabActive: '#7C74FF',
    tabInactive: '#6B6B80',

    // Timeline
    timelineLine: '#3D3D5C',
    timelineDot: '#7C74FF',

    // Shadows
    shadow: 'rgba(0, 0, 0, 0.3)',

    // Category colors
    flight: '#7C74FF',
    hotel: '#FF7B7B',
    attraction: '#5EDDD4',
    food: '#FFC05A',
    transport: '#55C7E1',
    other: '#A5B5B6',

    // FAB
    fab: '#7C74FF',
    fabText: '#FFFFFF',

    // Modal overlay
    overlay: 'rgba(0, 0, 0, 0.7)',

    // Input
    inputBg: '#1A1A2E',
    inputBorder: '#3D3D5C',
    inputFocusBorder: '#7C74FF',
  },
};

export type ThemeColors = typeof Colors.light;
