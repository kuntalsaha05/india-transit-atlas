import { City, Station } from '../types/transit';

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestCity(lat: number, lng: number, cities: City[]): { city: City; distanceKm: number } {
  let best = cities[0];
  let minD = Infinity;
  for (const c of cities) {
    const d = haversineKm(lat, lng, c.coordinates[0], c.coordinates[1]);
    if (d < minD) {
      minD = d;
      best = c;
    }
  }
  return { city: best, distanceKm: Number(minD.toFixed(1)) };
}

export function findNearestStations(
  lat: number,
  lng: number,
  stations: Station[],
  limit = 4
): Array<{ station: Station; distanceKm: number; walkMin: number }> {
  return stations
    .map((station) => {
      const distanceKm = haversineKm(lat, lng, station.latitude, station.longitude);
      const walkMin = Math.max(2, Math.round((distanceKm / 4.5) * 60));
      return { station, distanceKm: Number(distanceKm.toFixed(2)), walkMin };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

export function formatIstTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function computeWhenToLeave(params: {
  walkMinutes: number;
  securityBufferMin?: number;
  headwayMin: number;
  tripDurationMin: number;
}): {
  leaveInMin: number;
  leaveAtIst: string;
  boardTrainAtIst: string;
  arriveAtIst: string;
  adviceText: string;
} {
  const now = new Date();
  const buffer = params.securityBufferMin ?? 3;
  const accessTotal = params.walkMinutes + buffer;
  // Next headway slot that gives comfortable boarding (at least accessTotal min away)
  const cyclesNeeded = Math.max(1, Math.ceil((accessTotal + 1) / Math.max(2, params.headwayMin)));
  const boardOffsetMin = cyclesNeeded * Math.max(2, params.headwayMin);
  const leaveInMin = Math.max(0, boardOffsetMin - accessTotal);

  const leaveDate = new Date(now.getTime() + leaveInMin * 60000);
  const boardDate = new Date(now.getTime() + boardOffsetMin * 60000);
  const arriveDate = new Date(boardDate.getTime() + params.tripDurationMin * 60000);

  const leaveAtIst = formatIstTime(leaveDate);
  const boardTrainAtIst = formatIstTime(boardDate);
  const arriveAtIst = formatIstTime(arriveDate);

  const adviceText =
    leaveInMin <= 1
      ? `Leave now (${leaveAtIst} IST) — ${params.walkMinutes} min walk + ${buffer} min gate check gets you on the ${boardTrainAtIst} IST departure.`
      : `Leave in ${leaveInMin} min (at ${leaveAtIst} IST) to comfortably catch the ${boardTrainAtIst} IST departure and arrive by ${arriveAtIst} IST.`;

  return { leaveInMin, leaveAtIst, boardTrainAtIst, arriveAtIst, adviceText };
}
