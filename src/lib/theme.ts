import { useColorScheme } from 'react-native';

import type { Gender } from './types';

const palette = {
  light: {
    background: '#F3F7F5',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF3F0',
    border: '#D9E2DD',
    text: '#13201B',
    muted: '#5B6C65',
    accentMen: '#17624F',
    accentWomen: '#8A3F7A',
    onAccent: '#FFFFFF',
    ball: '#E2EE4A',
    onBall: '#1A2410',
    success: '#1E7F47',
  },
  dark: {
    background: '#0B1210',
    surface: '#15201C',
    surfaceAlt: '#1B2823',
    border: '#26342F',
    text: '#E4EDE9',
    muted: '#8FA29A',
    accentMen: '#46B898',
    accentWomen: '#D481C2',
    onAccent: '#0B1210',
    ball: '#E2EE4A',
    onBall: '#1A2410',
    success: '#55C486',
  },
};

export type Colors = typeof palette.light & { accent: string };

/**
 * Theme colors for the current color scheme. The accent follows the viewer's
 * gender, so the women's and men's sides of the app read as separate spaces.
 */
export function useColors(gender: Gender = 'm'): Colors {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const p = palette[scheme];
  return { ...p, accent: gender === 'f' ? p.accentWomen : p.accentMen };
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
