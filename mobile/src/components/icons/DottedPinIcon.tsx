import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface DottedPinIconProps {
  size?: number;
  color?: string;
}

const CENTER_X = 50;
const CENTER_Y = 47;
const OUTER = 'M50,2 C25.1,2 5,22.1 5,47 C5,76 50,120 50,120 C50,120 95,76 95,47 C95,22.1 74.9,2 50,2 Z';
const HOLE = 'M50,65 A18,18 0 1,0 50,29 A18,18 0 1,0 50,65 Z';
const DOT_RING_RADIUS = 31;
const DOT_COUNT = 16;
const DOT_RADIUS = 2.4;

// Each dot is wound as its own small circle subpath, same as the center
// hole, so with fillRule="evenodd" every dot punches a real hole through
// the solid pin body instead of sitting drawn on top of it (which would be
// invisible, since it'd be the same color as the body underneath).
function buildDotHoles(): string {
  let d = '';
  for (let i = 0; i < DOT_COUNT; i++) {
    const angle = (i / DOT_COUNT) * Math.PI * 2 - Math.PI / 2;
    const x = CENTER_X + DOT_RING_RADIUS * Math.cos(angle);
    const y = CENTER_Y + DOT_RING_RADIUS * Math.sin(angle);
    d += ` M${(x - DOT_RADIUS).toFixed(2)},${y.toFixed(2)} A${DOT_RADIUS},${DOT_RADIUS} 0 1,0 ${(x + DOT_RADIUS).toFixed(2)},${y.toFixed(2)} A${DOT_RADIUS},${DOT_RADIUS} 0 1,0 ${(x - DOT_RADIUS).toFixed(2)},${y.toFixed(2)} Z`;
  }
  return d;
}

const PATH_D = OUTER + ' ' + HOLE + buildDotHoles();

// Teardrop location pin with a hollow ring center and a dotted border
// inside the outer edge — used for the manual pin-drop entry buttons and
// (at larger size) the draggable map marker itself.
export default function DottedPinIcon({ size = 24, color = '#1A1A2E' }: DottedPinIconProps) {
  const height = size * 1.24; // matches the 100x124 viewBox aspect ratio
  return (
    <Svg width={size} height={height} viewBox="0 0 100 124">
      <Path d={PATH_D} fill={color} fillRule="evenodd" />
    </Svg>
  );
}
