/**
 * Google Polyline Decoder & Duration Utility for GreenCity AI
 */

/**
 * Decodes an encoded Google Polyline string into an array of [latitude, longitude] pairs.
 * Implementation of Google's Encoded Polyline Algorithm Format.
 */
export function decodeGooglePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

/**
 * Parses Google Routes duration string (e.g., "240s", "3600s") into minutes and human-friendly string.
 */
export function parseGoogleDuration(durationStr: string): { durationMinutes: number; formattedDuration: string } {
  if (!durationStr) {
    return { durationMinutes: 1, formattedDuration: '1 min' };
  }

  const secondsMatch = durationStr.match(/(\d+)s/);
  const totalSeconds = secondsMatch ? parseInt(secondsMatch[1], 10) : parseInt(durationStr, 10) || 60;
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let formatted = '';
  if (hours > 0) {
    formatted = `${hours} hr${hours > 1 ? 's' : ''}${minutes > 0 ? ` ${minutes} min` : ''}`;
  } else {
    formatted = `${totalMinutes} min`;
  }

  return { durationMinutes: totalMinutes, formattedDuration: formatted };
}
