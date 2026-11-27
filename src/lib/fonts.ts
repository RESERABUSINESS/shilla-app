import Constants from 'expo-constants';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

/**
 * True only in store builds that embed the Thmanyah font (see app.config.js).
 * In Expo Go and on the web the app uses the system font.
 */
export const hasThmanyah = Boolean(Constants.expoConfig?.extra?.thmanyahFont);

const FAMILY: Record<string, string> = {
  '300': 'thmanyahsans-Light',
  '400': 'thmanyahsans-Regular',
  '500': 'thmanyahsans-Medium',
  '600': 'thmanyahsans-Bold',
  '700': 'thmanyahsans-Bold',
  '800': 'thmanyahsans-Black',
  '900': 'thmanyahsans-Black',
};

/**
 * Swaps fontWeight for the matching Thmanyah face when the font is embedded.
 * Custom font files carry their own weight, so fontWeight is dropped.
 */
export function withAppFont(style: StyleProp<TextStyle>): StyleProp<TextStyle> {
  if (!hasThmanyah) return style;
  const flat = StyleSheet.flatten(style) ?? {};
  const weight = String(flat.fontWeight ?? '400').replace('normal', '400').replace('bold', '700');
  const { fontWeight: _ignored, ...rest } = flat;
  return { ...rest, fontFamily: FAMILY[weight] ?? FAMILY['400'] };
}
