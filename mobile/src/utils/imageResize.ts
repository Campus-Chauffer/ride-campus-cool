import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// Driver/vehicle document photos are stored directly as base64 data URIs
// (no file storage backend), so without this every capture kept its full
// camera-sensor resolution — several megabytes of pixel data that React
// Native's Image component has to decode on every render, even when
// displayed as a 40-50px avatar. That decode cost landing right as
// DriverFoundScreen mounts (alongside a live Directions fetch and the
// marker's heading watcher starting up) is the most likely single stutter
// a passenger notices during a normal ride. Resizing once here means every
// later render decodes a genuinely small image instead of a multi-megapixel
// one squeezed into a tiny box.
const MAX_DIMENSION = 900;

// `width` is the original asset's width if known (from ImagePicker's result),
// used to skip resizing an already-small image. `fallbackBase64` is the
// picker's own (unresized) base64 output — if manipulation fails for any
// reason, this returns exactly what the app produced before this existed,
// rather than risking a broken upload over a smoothness optimization.
export async function resizeForUpload(uri: string, width: number | undefined, fallbackBase64: string | undefined): Promise<string> {
  try {
    const actions = width && width > MAX_DIMENSION ? [{ resize: { width: MAX_DIMENSION } }] : [];
    const result = await manipulateAsync(uri, actions, { compress: 0.6, format: SaveFormat.JPEG, base64: true });
    if (result.base64) return `data:image/jpeg;base64,${result.base64}`;
  } catch (err) {
    console.log('Image resize error, falling back to original:', err);
  }
  return fallbackBase64 ? `data:image/jpeg;base64,${fallbackBase64}` : uri;
}
