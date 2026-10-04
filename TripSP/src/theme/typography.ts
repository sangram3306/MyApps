import { TextStyle } from 'react-native';

export const Typography: Record<string, TextStyle> = {
  // Headlines
  h1: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
  },
  // Body
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  bodySemibold: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  // Small text
  caption: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  captionMedium: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  // Labels
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  // Large display numbers
  display: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  // Button text
  button: {
    fontSize: 16,
    fontWeight: '600',
  },
};
