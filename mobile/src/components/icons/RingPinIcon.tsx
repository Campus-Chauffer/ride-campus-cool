import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface RingPinIconProps {
  size?: number;
  color?: string;
}

// Ring (hollow-center) location pin with a tapered tail — used for the
// manual pin-drop entry buttons and, at larger size, the draggable map
// marker itself. The outer silhouette (ring + tail, one continuous shape)
// and the hole are two subpaths combined with fillRule="evenodd" so the
// center reads as a true hole showing whatever is behind the icon.
const OUTER =
  'M71.8,71.1 A38,38 0 1,0 28.2,71.1 C27,77 32,84 39,90 C43.5,94 46.5,98.5 48.6,103.5 C49.2,105.2 50.8,105.2 51.4,103.5 C53.5,98.5 56.5,94 61,90 C68,84 73,77 71.8,71.1 Z';
const HOLE = 'M50,68 A28,28 0 1,0 50,12 A28,28 0 1,0 50,68 Z';
const PATH_D = OUTER + ' ' + HOLE;

export default function RingPinIcon({ size = 24, color = '#1A1A2E' }: RingPinIconProps) {
  const height = size * 1.08; // matches the 100x108 viewBox aspect ratio
  return (
    <Svg width={size} height={height} viewBox="0 0 100 108">
      <Path d={PATH_D} fill={color} fillRule="evenodd" />
    </Svg>
  );
}
