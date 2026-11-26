// Simplified, geographically faithful boundary coordinates [lat, lng] of India's mainland
// and major island territories for offline/hermetic vector cartography projection.

export const INDIA_MAINLAND_POLYGON: [number, number][] = [
  [35.5, 74.6], [35.9, 76.2], [34.8, 77.8], [34.1, 78.9], [32.7, 78.6],
  [31.5, 78.9], [30.7, 79.8], [29.8, 80.5], [28.9, 80.1], [28.1, 81.2],
  [27.4, 83.2], [27.3, 85.1], [26.6, 87.9], [27.1, 88.2], [27.9, 88.8],
  [27.2, 88.9], [26.8, 89.8], [26.9, 91.6], [27.6, 92.6], [28.6, 94.3],
  [29.1, 96.1], [28.1, 97.3], [27.1, 96.9], [26.2, 95.3], [24.8, 94.6],
  [23.7, 93.4], [22.1, 93.1], [23.6, 92.3], [24.5, 92.2], [25.1, 91.6],
  [25.2, 89.9], [26.2, 89.4], [26.3, 88.3], [25.2, 88.9], [24.2, 88.7],
  [22.9, 88.9], [21.7, 88.8], [21.6, 87.6], [20.7, 86.9], [19.8, 85.9],
  [18.8, 84.5], [17.7, 83.3], [16.6, 82.3], [15.8, 80.9], [14.6, 80.2],
  [13.1, 80.3], [11.8, 79.8], [10.3, 79.9], [9.2, 79.3], [8.1, 77.5],
  [8.4, 76.9], [9.9, 76.2], [11.3, 75.7], [12.9, 74.8], [14.8, 74.1],
  [15.6, 73.7], [17.1, 73.3], [19.0, 72.8], [20.4, 72.8], [21.6, 72.6],
  [21.6, 72.1], [20.7, 70.9], [21.5, 69.6], [22.4, 69.0], [22.9, 70.1],
  [22.8, 69.2], [23.8, 68.2], [24.4, 71.1], [25.4, 70.2], [26.9, 69.5],
  [28.1, 70.5], [29.5, 72.9], [30.9, 74.5], [32.3, 75.1], [33.1, 74.2],
  [34.2, 73.8], [35.1, 74.1], [35.5, 74.6]
];

export const INDIA_REGIONAL_GRATICULE_LATS = [10, 15, 20, 25, 30, 35];
export const INDIA_REGIONAL_GRATICULE_LNGS = [70, 75, 80, 85, 90, 95];

export function projectIndiaLatLng(
  lat: number,
  lng: number,
  width: number,
  height: number,
  padding = 32
): { x: number; y: number } {
  const minLng = 67.5;
  const maxLng = 98.0;
  const minLat = 7.0;
  const maxLat = 36.8;

  // Approximate cosine latitude correction for India's mid-latitude (~22 deg N)
  const cosLat = Math.cos((22 * Math.PI) / 180);
  const dataW = (maxLng - minLng) * cosLat;
  const dataH = maxLat - minLat;

  const availW = width - padding * 2;
  const availH = height - padding * 2;
  const scale = Math.min(availW / dataW, availH / dataH);

  const offsetX = (width - dataW * scale) / 2;
  const offsetY = (height - dataH * scale) / 2;

  const x = offsetX + (lng - minLng) * cosLat * scale;
  const y = offsetY + (maxLat - lat) * scale;
  return { x, y };
}
