import { View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../../theme/theme';
import { AppLogo } from './AppLogo';

export type IconName =
  | 'home'
  | 'explore'
  | 'search'
  | 'collection'
  | 'play'
  | 'pause'
  | 'skip-next'
  | 'skip-previous'
  | 'shuffle'
  | 'repeat'
  | 'queue'
  | 'lyrics'
  | 'more'
  | 'plus'
  | 'check'
  | 'close'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-right'
  | 'chevron-left'
  | 'download'
  | 'download-done'
  | 'cloud-off'
  | 'warning'
  | 'trash'
  | 'drag-handle'
  | 'share'
  | 'moon'
  | 'sliders'
  | 'speaker'
  | 'info'
  | 'timer'
  | 'disc'
  | 'user'
  | 'playlist'
  | 'filter'
  | 'autoplay'
  | 'lock'
  | 'lock-open'
  | 'storage'
  | 'retry'
  | 'album'
  | 'output'
  | 'pin'
  | string;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

interface ShapeDef {
  type: 'path' | 'circle' | 'rect';
  d?: string;
  cx?: number;
  cy?: number;
  r?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rx?: number;
  fill?: boolean;
}

/** 43 bespoke Coda monochrome vector icons from the official design system */
const LUMA_ICON_DEFS: Record<string, ShapeDef[]> = {
  'home': [
    { type: 'path', d: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z' },
  ],
  'explore': [
    { type: 'circle', cx: 12, cy: 12, r: 8.25 },
    { type: 'path', d: 'm15.25 8.75-1.9 4.6-4.6 1.9 1.9-4.6z' },
  ],
  'search': [
    { type: 'circle', cx: 11, cy: 11, r: 6.25 },
    { type: 'path', d: 'm20 20-4.5-4.5' },
  ],
  'collection': [
    { type: 'path', d: 'M5 4v16M9.5 4v16' },
    { type: 'path', d: 'm14 4.6 4.6 15' },
  ],
  'play': [
    { type: 'path', d: 'M8 5.5v13l10.5-6.5z' },
  ],
  'pause': [
    { type: 'path', d: 'M8.5 5.5v13M15.5 5.5v13' },
  ],
  'skip-next': [
    { type: 'path', d: 'M6 6v12l8.5-6z' },
    { type: 'path', d: 'M18 6v12' },
  ],
  'skip-previous': [
    { type: 'path', d: 'M18 6v12L9.5 12z' },
    { type: 'path', d: 'M6 6v12' },
  ],
  'shuffle': [
    { type: 'path', d: 'M4 7h3.2a4 4 0 0 1 3.3 1.8l3 4.4a4 4 0 0 0 3.3 1.8H20' },
    { type: 'path', d: 'M4 17h3.2a4 4 0 0 0 3.3-1.8l.4-.6' },
    { type: 'path', d: 'm13.1 9.4.4-.6A4 4 0 0 1 16.8 7H20' },
    { type: 'path', d: 'm17.5 4.5 2.5 2.5-2.5 2.5M17.5 14.5l2.5 2.5-2.5 2.5' },
  ],
  'repeat': [
    { type: 'path', d: 'M4 11V9.5A2.5 2.5 0 0 1 6.5 7H19' },
    { type: 'path', d: 'm16 4 3 3-3 3' },
    { type: 'path', d: 'M20 13v1.5a2.5 2.5 0 0 1-2.5 2.5H5' },
    { type: 'path', d: 'm8 20-3-3 3-3' },
  ],
  'queue': [
    { type: 'path', d: 'M4 6h16M4 11h16M4 16h8' },
    { type: 'path', d: 'M15.5 14v6l5-3z' },
  ],
  'lyrics': [
    { type: 'path', d: 'M4 6h16M4 10.5h11M4 15h16M4 19.5h7' },
  ],
  'more': [
    { type: 'circle', cx: 5.5, cy: 12, r: 1, fill: true },
    { type: 'circle', cx: 12, cy: 12, r: 1, fill: true },
    { type: 'circle', cx: 18.5, cy: 12, r: 1, fill: true },
  ],
  'plus': [
    { type: 'path', d: 'M12 5v14M5 12h14' },
  ],
  'check': [
    { type: 'path', d: 'm5 12.5 4.5 4.5L19 7.5' },
  ],
  'close': [
    { type: 'path', d: 'M6 6l12 12M18 6 6 18' },
  ],
  'chevron-down': [
    { type: 'path', d: 'm6 9 6 6 6-6' },
  ],
  'chevron-up': [
    { type: 'path', d: 'm6 15 6-6 6 6' },
  ],
  'chevron-right': [
    { type: 'path', d: 'm9 6 6 6-6 6' },
  ],
  'chevron-left': [
    { type: 'path', d: 'm15 6-6 6 6 6' },
  ],
  'download': [
    { type: 'path', d: 'M12 4v11' },
    { type: 'path', d: 'm7.5 10.5 4.5 4.5 4.5-4.5' },
    { type: 'path', d: 'M5 19.5h14' },
  ],
  'download-done': [
    { type: 'circle', cx: 12, cy: 12, r: 8.25 },
    { type: 'path', d: 'm8.5 12.25 2.5 2.5 4.5-5' },
  ],
  'cloud-off': [
    { type: 'path', d: 'M8 18h9.5a3.5 3.5 0 0 0 1.9-6.45' },
    { type: 'path', d: 'M16.9 8.4A6 6 0 0 0 7.3 7.4' },
    { type: 'path', d: 'M6.1 10.2A3.9 3.9 0 0 0 7 18h1' },
    { type: 'path', d: 'M4 4l16 16' },
  ],
  'warning': [
    { type: 'path', d: 'M12 4.5 3.5 19h17z' },
    { type: 'path', d: 'M12 10v4' },
    { type: 'circle', cx: 12, cy: 16.6, r: 0.6, fill: true },
  ],
  'trash': [
    { type: 'path', d: 'M4.5 7h15' },
    { type: 'path', d: 'M9.5 7V5h5v2' },
    { type: 'path', d: 'm6.5 7 .8 12a1 1 0 0 0 1 1h7.4a1 1 0 0 0 1-1l.8-12' },
    { type: 'path', d: 'M10 11v5M14 11v5' },
  ],
  'drag-handle': [
    { type: 'path', d: 'M5 9h14M5 15h14' },
  ],
  'share': [
    { type: 'path', d: 'M12 4v11' },
    { type: 'path', d: 'm7.5 8.5 4.5-4.5 4.5 4.5' },
    { type: 'path', d: 'M6 12v6.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V12' },
  ],
  'moon': [
    { type: 'path', d: 'M19.5 14.5a7.5 7.5 0 0 1-10-10 7.5 7.5 0 1 0 10 10z' },
  ],
  'sliders': [
    { type: 'path', d: 'M6 4v16M12 4v16M18 4v16' },
    { type: 'path', d: 'M4 15h4M10 8h4M16 13h4' },
  ],
  'speaker': [
    { type: 'path', d: 'M5 9.5h3l4.5-4v13l-4.5-4H5z' },
    { type: 'path', d: 'M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11' },
  ],
  'info': [
    { type: 'circle', cx: 12, cy: 12, r: 8.25 },
    { type: 'path', d: 'M12 11v5' },
    { type: 'circle', cx: 12, cy: 8, r: 0.6, fill: true },
  ],
  'timer': [
    { type: 'circle', cx: 12, cy: 13, r: 7.25 },
    { type: 'path', d: 'M12 9.5V13l2.5 1.5' },
    { type: 'path', d: 'M9.5 3.5h5' },
  ],
  'disc': [
    { type: 'circle', cx: 12, cy: 12, r: 8.25 },
    { type: 'circle', cx: 12, cy: 12, r: 2.25 },
  ],
  'user': [
    { type: 'circle', cx: 12, cy: 8.5, r: 3.75 },
    { type: 'path', d: 'M4.75 20a7.25 7.25 0 0 1 14.5 0' },
  ],
  'playlist': [
    { type: 'path', d: 'M4 6h11M4 11h11M4 16h6' },
    { type: 'circle', cx: 16.5, cy: 17, r: 2.5 },
    { type: 'path', d: 'M19 17V7.5h2' },
  ],
  'filter': [
    { type: 'path', d: 'M4 7h16M7 12h10M10 17h4' },
  ],
  'autoplay': [
    { type: 'path', d: 'M12 12c-1.5-2-2.6-3.5-4.5-3.5a3.5 3.5 0 0 0 0 7c1.9 0 3-1.5 4.5-3.5s2.6-3.5 4.5-3.5a3.5 3.5 0 0 1 0 7c-1.9 0-3-1.5-4.5-3.5z' },
  ],
  'lock': [
    { type: 'rect', x: 5, y: 10.5, width: 14, height: 9.5, rx: 2 },
    { type: 'path', d: 'M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5' },
  ],
  'lock-open': [
    { type: 'rect', x: 5, y: 10.5, width: 14, height: 9.5, rx: 2 },
    { type: 'path', d: 'M8.5 10.5V8a3.5 3.5 0 0 1 7 0' },
  ],
  'storage': [
    { type: 'rect', x: 4, y: 5, width: 16, height: 14, rx: 2 },
    { type: 'path', d: 'M4 14h16' },
    { type: 'circle', cx: 7.75, cy: 16.5, r: 0.6, fill: true },
  ],
  'retry': [
    { type: 'path', d: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3' },
    { type: 'path', d: 'M19.5 4.5v4h-4' },
  ],
  'album': [
    { type: 'rect', x: 4, y: 4, width: 16, height: 16, rx: 2 },
    { type: 'circle', cx: 12, cy: 12, r: 3.5 },
  ],
  'output': [
    { type: 'rect', x: 6, y: 3.5, width: 12, height: 17, rx: 2 },
    { type: 'circle', cx: 12, cy: 14, r: 3 },
    { type: 'circle', cx: 12, cy: 7.5, r: 0.6, fill: true },
  ],
  'pin': [
    { type: 'path', d: 'M12 20.5s6-5.4 6-10.5a6 6 0 0 0-12 0c0 5.1 6 10.5 6 10.5z' },
    { type: 'circle', cx: 12, cy: 10, r: 2 },
  ],
  'heart': [
    { type: 'path', d: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z', fill: true },
  ],
  'heart-outline': [
    { type: 'path', d: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' },
  ],
  'copy': [
    { type: 'rect', x: 8, y: 8, width: 12, height: 12, rx: 2 },
    { type: 'path', d: 'M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3' },
  ],
  'pencil': [
    { type: 'path', d: 'M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z' },
  ],
};

/** Normalize icon names from legacy Expo vector names to Coda design system names */
function normalizeIconName(name: string): string {
  const n = name.toLowerCase();
  if (LUMA_ICON_DEFS[n]) return n;

  // Navigation & tabs
  if (n === 'grid' || n === 'grid-outline' || n.includes('home')) return 'home';
  if (n === 'compass' || n === 'compass-outline' || n.includes('explore')) return 'explore';
  if (n === 'albums' || n === 'albums-outline' || n.includes('library') || n.includes('collection')) return 'collection';
  if (n === 'search' || n === 'search-outline') return 'search';

  // Playback & transport
  if (n === 'play' || n === 'play-outline' || n === 'play-circle') return 'play';
  if (n === 'pause' || n === 'pause-outline' || n === 'pause-circle') return 'pause';
  if (n === 'play-skip-forward' || n === 'play-skip-forward-outline' || n === 'skip-forward' || n === 'play-forward') return 'skip-next';
  if (n === 'play-skip-back' || n === 'play-skip-back-outline' || n === 'skip-back' || n === 'play-back') return 'skip-previous';
  if (n === 'shuffle' || n === 'shuffle-outline') return 'shuffle';
  if (n === 'repeat' || n === 'repeat-outline') return 'repeat';
  if (n === 'list' || n === 'list-outline' || n === 'queue-music') return 'queue';
  if (n === 'musical-notes' || n === 'musical-note' || n.includes('lyric')) return 'lyrics';

  // Actions & chrome
  if (n === 'ellipsis-horizontal' || n === 'ellipsis-vertical' || n === 'more-horiz' || n === 'more-vert') return 'more';
  if (n === 'add' || n === 'add-circle' || n === 'add-outline') return 'plus';
  if (n === 'checkmark' || n === 'check') return 'check';
  if (n === 'close' || n === 'close-outline' || n === 'close-circle' || n === 'close-circle-outline') return 'close';
  if (n === 'chevron-down' || n === 'arrow-down') return 'chevron-down';
  if (n === 'chevron-up' || n === 'arrow-up') return 'chevron-up';
  if (n === 'chevron-forward' || n === 'chevron-right' || n === 'arrow-forward') return 'chevron-right';
  if (n === 'chevron-back' || n === 'chevron-left' || n === 'arrow-back') return 'chevron-left';
  if (
    n === 'checkmark-circle' ||
    n === 'checkmark-circle-outline' ||
    n === 'download-done' ||
    n === 'download-done-outline'
  ) return 'download-done';
  if (
    n === 'download' ||
    n === 'download-outline' ||
    n === 'arrow-down-circle' ||
    n === 'arrow-down-circle-outline' ||
    n === 'cloud-download' ||
    n === 'cloud-download-outline'
  ) return 'download';
  if (n === 'cloud-offline-outline' || n === 'cloud-offline') return 'cloud-off';
  if (n === 'warning' || n === 'alert-circle' || n === 'warning-outline') return 'warning';
  if (n === 'trash' || n === 'trash-outline') return 'trash';
  if (n === 'reorder-two' || n === 'reorder-three') return 'drag-handle';
  if (n === 'share-social' || n === 'share-outline') return 'share';
  if (n === 'options' || n === 'options-outline' || n === 'settings' || n === 'settings-outline' || n === 'equalizer') return 'sliders';
  if (n === 'volume-high' || n === 'volume-medium' || n === 'volume-low') return 'speaker';
  if (n === 'information-circle' || n === 'information-circle-outline') return 'info';
  if (n === 'time' || n === 'time-outline') return 'timer';
  if (n === 'disc' || n === 'disc-outline') return 'disc';
  if (n === 'person' || n === 'person-outline') return 'user';
  if (n === 'heart' || n === 'heart-fill' || n === 'heart-filled' || n === 'favorite') return 'heart';
  if (n === 'heart-outline' || n === 'favorite-outline') return 'heart-outline';
  if (n === 'refresh' || n === 'reload') return 'retry';
  if (n === 'pencil' || n === 'edit' || n === 'create') return 'pencil';
  if (n === 'copy' || n === 'duplicate') return 'copy';

  return n;
}

export default function Icon({
  name,
  size = 24,
  color = colors.textPrimary,
  style,
}: IconProps) {
  if (name === 'tidal') {
    return <AppLogo size={size} color={color} style={style as any} />;
  }

  const normalized = normalizeIconName(name);
  const shapes = LUMA_ICON_DEFS[normalized];

  if (!shapes) {
    // Fallback disc
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={7} stroke={color} strokeWidth={1.75} fill="none" />
        </Svg>
      </View>
    );
  }

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
      >
        {shapes.map((s, idx) => {
          if (s.type === 'path' && s.d) {
            return (
              <Path
                key={idx}
                d={s.d}
                stroke={color}
                strokeWidth={s.fill ? 0.5 : 1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={s.fill ? color : 'none'}
              />
            );
          }
          if (s.type === 'circle' && s.cx !== undefined && s.cy !== undefined && s.r !== undefined) {
            return (
              <Circle
                key={idx}
                cx={s.cx}
                cy={s.cy}
                r={s.r}
                stroke={s.fill ? 'none' : color}
                strokeWidth={s.fill ? 0 : 1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={s.fill ? color : 'none'}
              />
            );
          }
          if (s.type === 'rect' && s.x !== undefined && s.y !== undefined && s.width !== undefined && s.height !== undefined) {
            return (
              <Rect
                key={idx}
                x={s.x}
                y={s.y}
                width={s.width}
                height={s.height}
                rx={s.rx ?? 0}
                stroke={color}
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            );
          }
          return null;
        })}
      </Svg>
    </View>
  );
}
