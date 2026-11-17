import { Linking } from 'react-native';

// Google's own documented "universal" navigation URL — unlike a custom
// scheme (comgooglemaps:// / google.navigation:q=), this same URL works
// identically on both platforms: iOS and Android each resolve
// maps.google.com links to the installed Google Maps app via universal/app
// links when it's present, and fall back to the web directions view in the
// browser when it isn't. No Platform.select or scheme-availability probing
// needed. Destination only (no origin) makes Maps use the driver's current
// GPS location as the starting point, which is what driving to a pickup or
// dropoff point actually needs.
export function openNavigation(lat: number, lng: number) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  Linking.openURL(url).catch(() => {});
}
