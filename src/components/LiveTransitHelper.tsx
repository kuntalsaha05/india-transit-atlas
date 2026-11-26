import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Compass,
  LocateFixed,
  Navigation,
  Sparkles,
  Ticket,
  Train,
} from 'lucide-react';
import { useTransitData } from '../context/TransitDataContext';
import { AtlasPage, LiveTransitVehicle } from '../types/transit';
import { formatIstTime, haversineKm } from '../utils/geoLocation';

type AccessMode = 'walk' | 'cycle' | 'auto';

const ACCESS_SPEED_KMH: Record<AccessMode, { label: string; speedKmh: number; costNote: string }> = {
  walk: { label: 'Walk', speedKmh: 4.5, costNote: '₹0' },
  cycle: { label: 'Cycle / E-Rickshaw', speedKmh: 14.0, costNote: '₹10–₹20' },
  auto: { label: 'Auto / Cab', speedKmh: 22.0, costNote: '₹30–₹80' },
};

interface LiveTransitHelperProps {
  activeCityId: string;
  userCoords: [number, number] | null;
  locationLabel: string;
  onRequestLocate: () => void;
  onOpenMapCity: (cityId: string, stationId?: string) => void;
  onOpenBooking: (cityId?: string, systemId?: string) => void;
  onNavigate: (page: AtlasPage) => void;
}

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const LiveTransitHelper: React.FC<LiveTransitHelperProps> = ({
  activeCityId,
  userCoords,
  locationLabel,
  onRequestLocate,
  onOpenMapCity,
  onOpenBooking,
  onNavigate,
}) => {
  const { cities, stations, systems } = useTransitData();

  const activeCity = useMemo(
    () => cities.find((c) => c.id === activeCityId) ?? cities[0],
    [cities, activeCityId]
  );

  // Use real GPS coords if granted, otherwise fall back to active city center
  const referenceCoords: [number, number] = useMemo(
    () => userCoords ?? activeCity.coordinates,
    [userCoords, activeCity]
  );

  // Rank stations in active city (or nearest overall if GPS puts user in another city)
  const rankedStations = useMemo(() => {
    const cityStations = stations.filter((s) => s.cityId === activeCityId);
    const pool = cityStations.length > 0 ? cityStations : stations;
    return pool
      .map((station) => {
        const distanceKm = haversineKm(
          referenceCoords[0],
          referenceCoords[1],
          station.latitude,
          station.longitude
        );
        return {
          station,
          distanceKm: Number(distanceKm.toFixed(2)),
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [stations, activeCityId, referenceCoords]);

  const [isPlanningTrip, setIsPlanningTrip] = useState<boolean>(true);
  const [accessMode, setAccessMode] = useState<AccessMode>('walk');
  const [selectedStationId, setSelectedStationId] = useState<string>('');
  const [destinationStationId, setDestinationStationId] = useState<string>('');
  const [selectedSlotOffsetMin, setSelectedSlotOffsetMin] = useState<number>(12);
  const [gateBufferMin, setGateBufferMin] = useState<number>(3);
  const [liveVehicles, setLiveVehicles] = useState<LiveTransitVehicle[]>([]);

  // 1-second ticking clock for real-time countdown
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [anchorMs, setAnchorMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Reset selected stations when city or GPS changes
  useEffect(() => {
    if (rankedStations.length > 0) {
      setSelectedStationId(rankedStations[0].station.id);
      const fallbackDest = rankedStations[1] ?? rankedStations[0];
      setDestinationStationId(fallbackDest.station.id);
    }
  }, [activeCityId, rankedStations]);

  // Fetch live vehicles for active city to anchor departure slots cleanly
  useEffect(() => {
    let active = true;
    fetch(`/api/live-transit?cityId=${encodeURIComponent(activeCityId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { vehicles?: LiveTransitVehicle[] } | null) => {
        if (!active || !data?.vehicles) return;
        setLiveVehicles(data.vehicles);
      })
      .catch(() => {
        // non-blocking fallback to headway slots
      });
    return () => {
      active = false;
    };
  }, [activeCityId]);

  const originEntry = useMemo(() => {
    return (
      rankedStations.find((r) => r.station.id === selectedStationId) ??
      rankedStations[0] ??
      null
    );
  }, [rankedStations, selectedStationId]);

  const destinationEntry = useMemo(() => {
    return (
      rankedStations.find((r) => r.station.id === destinationStationId) ??
      rankedStations[1] ??
      rankedStations[0] ??
      null
    );
  }, [rankedStations, destinationStationId]);

  const originSystem = useMemo(
    () => (originEntry ? systems.find((s) => s.id === originEntry.station.systemId) : undefined),
    [originEntry, systems]
  );

  // Calculate "time to reach" station in minutes from current GPS / reference coordinates
  const timeToReachMetrics = useMemo(() => {
    if (!originEntry) {
      return {
        distanceKm: 0.8,
        travelMin: 10,
        totalAccessMin: 13,
      };
    }
    const speed = ACCESS_SPEED_KMH[accessMode].speedKmh;
    // Apply urban street grid factor (~1.22x straight-line distance) for realistic Indian road travel
    const streetKm = originEntry.distanceKm * 1.22;
    const rawMin = Math.round((streetKm / speed) * 60);
    const travelMin = Math.max(2, Math.min(90, rawMin));
    return {
      distanceKm: originEntry.distanceKm,
      travelMin,
      totalAccessMin: travelMin + gateBufferMin,
    };
  }, [originEntry, accessMode, gateBufferMin]);

  // Keep departure slots anchored when origin or access mode changes
  const departureSlots = useMemo(() => {
    const firstVehicleEta = liveVehicles[0]?.etaNextStopMin ?? 4;
    const headway = liveVehicles[0]?.headwayMin ?? 6;
    const accessTotal = timeToReachMetrics.totalAccessMin;

    // Provide 3 actionable IST train/bus departure slots:
    // Slot 1: Tight / Immediate departure (triggers "Time to leave now" alert when planning a trip)
    const tightMin = Math.max(accessTotal + 1, firstVehicleEta + headway);
    // Slot 2: Comfortable next train (+headway)
    const nextMin = tightMin + headway;
    // Slot 3: Later buffer train (+2 * headway)
    const laterMin = nextMin + headway;

    return [
      { id: 'immediate', label: `Next Service (+${tightMin} min)`, offsetMin: tightMin },
      { id: 'comfortable', label: `Following Service (+${nextMin} min)`, offsetMin: nextMin },
      { id: 'relaxed', label: `Relaxed Buffer (+${laterMin} min)`, offsetMin: laterMin },
    ];
  }, [liveVehicles, timeToReachMetrics.totalAccessMin]);

  // Synchronize default selected slot to Slot 1 when city/origin changes
  useEffect(() => {
    if (departureSlots[0]) {
      setSelectedSlotOffsetMin(departureSlots[0].offsetMin);
      setAnchorMs(Date.now());
    }
  }, [activeCityId, originEntry?.station.id, accessMode]);

  const targetBoardMs = anchorMs + selectedSlotOffsetMin * 60_000;
  const targetLeaveMs = targetBoardMs - timeToReachMetrics.totalAccessMin * 60_000;
  const leaveRemainingSec = Math.round((targetLeaveMs - nowMs) / 1000);
  const boardRemainingSec = Math.max(0, Math.round((targetBoardMs - nowMs) / 1000));

  const leaveAtIst = formatIstTime(new Date(targetLeaveMs));
  const reachStationAtIst = formatIstTime(
    new Date(Math.max(nowMs, targetLeaveMs) + timeToReachMetrics.travelMin * 60_000)
  );
  const boardAtIst = formatIstTime(new Date(targetBoardMs));

  const isLeaveNowAlert = leaveRemainingSec <= 180; // <= 3 minutes until must-leave time

  const estimatedRideMin = useMemo(() => {
    if (!originEntry || !destinationEntry || originEntry.station.id === destinationEntry.station.id) {
      return 18;
    }
    const legKm = haversineKm(
      originEntry.station.latitude,
      originEntry.station.longitude,
      destinationEntry.station.latitude,
      destinationEntry.station.longitude
    );
    return Math.max(6, Math.round((legKm / 32) * 60) + 4);
  }, [originEntry, destinationEntry]);

  return (
    <section
      aria-label="Live Transit Helper"
      className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="bg-white border border-[#E2E0DA] rounded-lg p-5 sm:p-6 space-y-5">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E0DA] pb-4">
          <div className="space-y-1">
            <p className="text-xs font-mono uppercase tracking-wider text-[#1D4ED8]">
              Live Transit Helper · GPS Time-to-Reach & Departure Countdown
            </p>
            <h2 className="text-xl sm:text-2xl font-serif font-semibold text-[#141821]">
              Station Access Time & Live Leave Alert
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onRequestLocate}
              className="min-h-[42px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1D4ED8] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <LocateFixed className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{userCoords ? 'Refresh GPS' : 'Use Current GPS'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const next = !isPlanningTrip;
                setIsPlanningTrip(next);
                if (next) setAnchorMs(Date.now());
              }}
              className={`min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                isPlanningTrip
                  ? 'bg-[#141821] text-white hover:bg-[#1D4ED8]'
                  : 'bg-[#F8F7F4] text-[#141821] border border-[#E2E0DA] hover:border-[#141821]'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isPlanningTrip ? 'Planning Trip Active' : 'Start Planning a Trip'}</span>
            </button>
          </div>
        </div>

        {/* GPS Location + Time-to-Reach Summary Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left: Station & Mode Controls */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="helper-origin-station"
                  className="block text-[11px] font-mono uppercase tracking-wider text-[#525866] mb-1.5"
                >
                  Origin Station ({userCoords ? 'GPS Nearest' : `${activeCity.name} Hub`})
                </label>
                <select
                  id="helper-origin-station"
                  value={originEntry?.station.id ?? ''}
                  onChange={(e) => {
                    setSelectedStationId(e.target.value);
                    setAnchorMs(Date.now());
                  }}
                  className="w-full min-h-[44px] px-3 py-2 text-xs font-medium text-[#141821] bg-[#F8F7F4] border border-[#E2E0DA] rounded-md focus:outline-none focus:border-[#1D4ED8]"
                >
                  {rankedStations.map((entry) => (
                    <option key={entry.station.id} value={entry.station.id}>
                      {entry.station.name} ({entry.distanceKm} km away)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="helper-dest-station"
                  className="block text-[11px] font-mono uppercase tracking-wider text-[#525866] mb-1.5"
                >
                  Destination Station
                </label>
                <select
                  id="helper-dest-station"
                  value={destinationEntry?.station.id ?? ''}
                  onChange={(e) => setDestinationStationId(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 text-xs font-medium text-[#141821] bg-[#F8F7F4] border border-[#E2E0DA] rounded-md focus:outline-none focus:border-[#1D4ED8]"
                >
                  {rankedStations.map((entry) => (
                    <option key={entry.station.id} value={entry.station.id}>
                      {entry.station.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Access Mode Selector + Gate Buffer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['walk', 'cycle', 'auto'] as AccessMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setAccessMode(mode);
                      setAnchorMs(Date.now());
                    }}
                    className={`min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                      accessMode === mode
                        ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                        : 'bg-[#F8F7F4] text-[#525866] border-[#E2E0DA] hover:text-[#141821]'
                    }`}
                  >
                    {ACCESS_SPEED_KMH[mode].label} ({ACCESS_SPEED_KMH[mode].costNote})
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-[#525866]">
                <label htmlFor="helper-buffer" className="whitespace-nowrap">
                  Security/Gate buffer:
                </label>
                <select
                  id="helper-buffer"
                  value={gateBufferMin}
                  onChange={(e) => {
                    setGateBufferMin(Number(e.target.value));
                    setAnchorMs(Date.now());
                  }}
                  className="min-h-[38px] px-2 py-1 text-xs font-mono text-[#141821] bg-[#F8F7F4] border border-[#E2E0DA] rounded-md"
                >
                  {[2, 3, 5, 8].map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#E2E0DA] font-mono tabular-nums">
              <div>
                <div className="text-[11px] font-sans text-[#525866]">Distance to Station</div>
                <div className="text-lg sm:text-xl font-semibold text-[#141821] mt-0.5">
                  {timeToReachMetrics.distanceKm} km
                </div>
                <div className="text-[11px] font-sans text-[#7D8491] truncate">
                  {userCoords ? 'From live GPS fix' : locationLabel}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-sans text-[#525866]">Time to Reach Station</div>
                <div className="text-lg sm:text-xl font-semibold text-[#1D4ED8] mt-0.5">
                  {timeToReachMetrics.travelMin} min
                </div>
                <div className="text-[11px] font-sans text-[#7D8491]">
                  +{gateBufferMin} min security gate
                </div>
              </div>
              <div>
                <div className="text-[11px] font-sans text-[#525866]">Est. Transit Ride</div>
                <div className="text-lg sm:text-xl font-semibold text-[#141821] mt-0.5">
                  {estimatedRideMin} min
                </div>
                <div className="text-[11px] font-sans text-[#7D8491] truncate">
                  {originSystem?.shortName || activeCity.name}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Live Countdown Alert Panel */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-[#F8F7F4] border border-[#E2E0DA] rounded-lg p-5 space-y-4">
            {isPlanningTrip ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#525866]">
                      Select Target Departure
                    </span>
                    <span className="text-[11px] font-mono text-[#1D4ED8]">
                      Board at {boardAtIst} IST
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {departureSlots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => {
                          setSelectedSlotOffsetMin(slot.offsetMin);
                          setAnchorMs(Date.now());
                        }}
                        className={`min-h-[38px] px-2 py-1.5 text-[11px] font-medium rounded border transition-colors truncate ${
                          selectedSlotOffsetMin === slot.offsetMin
                            ? 'bg-[#141821] text-white border-[#141821]'
                            : 'bg-white text-[#525866] border-[#E2E0DA] hover:text-[#141821]'
                        }`}
                      >
                        {slot.label.replace(' Service', '')}
                      </button>
                    ))}
                  </div>

                  {/* Countdown Alert Box */}
                  <div
                    role="status"
                    aria-live="polite"
                    className={`rounded-md border p-4 space-y-2 ${
                      isLeaveNowAlert
                        ? 'bg-[#FEF3C7] border-[#D97706] text-[#141821]'
                        : 'bg-white border-[#E2E0DA] text-[#141821]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {isLeaveNowAlert ? (
                          <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" aria-hidden="true" />
                        ) : (
                          <Clock className="w-4 h-4 text-[#1D4ED8] shrink-0" aria-hidden="true" />
                        )}
                        <span className="text-sm font-semibold">
                          {isLeaveNowAlert ? 'Time to leave now' : 'Upcoming departure countdown'}
                        </span>
                      </div>
                      <span
                        className={`text-xl font-mono font-bold tabular-nums ${
                          isLeaveNowAlert ? 'text-[#B45309]' : 'text-[#1D4ED8]'
                        }`}
                      >
                        {leaveRemainingSec > 0 ? formatCountdown(leaveRemainingSec) : '00:00'}
                      </span>
                    </div>

                    <p className="text-xs text-[#525866] leading-relaxed">
                      {isLeaveNowAlert ? (
                        <>
                          Step out now to reach{' '}
                          <strong className="text-[#141821]">{originEntry?.station.name}</strong> by{' '}
                          <strong className="text-[#141821]">{reachStationAtIst} IST</strong> (
                          {timeToReachMetrics.travelMin} min {ACCESS_SPEED_KMH[accessMode].label.toLowerCase()} +{' '}
                          {gateBufferMin} min check) and board the{' '}
                          <strong className="text-[#141821]">{boardAtIst} IST</strong> service (departs in{' '}
                          <span className="font-mono">{formatCountdown(boardRemainingSec)}</span>).
                        </>
                      ) : (
                        <>
                          Leave at <strong className="text-[#141821]">{leaveAtIst} IST</strong> to reach{' '}
                          <strong className="text-[#141821]">{originEntry?.station.name}</strong> by{' '}
                          <strong className="text-[#141821]">{reachStationAtIst} IST</strong> and catch the{' '}
                          <strong className="text-[#141821]">{boardAtIst} IST</strong> service.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenBooking(activeCityId, originEntry?.station.systemId)}
                    className="min-h-[42px] flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md transition-colors whitespace-nowrap"
                  >
                    <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Book Ticket</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenMapCity(activeCityId, originEntry?.station.id)}
                    className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#141821] bg-white border border-[#E2E0DA] hover:border-[#141821] rounded-md transition-colors whitespace-nowrap"
                  >
                    <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>View Station</span>
                  </button>
                  {originEntry && (
                    <a
                      href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_${
                        accessMode === 'walk' ? 'foot' : accessMode === 'cycle' ? 'bike' : 'car'
                      }&route=${referenceCoords[0]}%2C${referenceCoords[1]}%3B${originEntry.station.latitude}%2C${originEntry.station.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0F766E] bg-white border border-[#E2E0DA] hover:border-[#0F766E] rounded-md transition-colors whitespace-nowrap"
                    >
                      <span>OSM Route ↗</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigate('planner')}
                    className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#141821] bg-white border border-[#E2E0DA] hover:border-[#141821] rounded-md transition-colors whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#B45309]" aria-hidden="true" />
                    <span>Full Planner</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col justify-center items-start space-y-3 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#141821]">
                  <Train className="w-4 h-4 text-[#1D4ED8]" aria-hidden="true" />
                  <span>Trip Countdown Paused</span>
                </div>
                <p className="text-xs text-[#525866] leading-relaxed">
                  Enable trip planning mode to activate live departure countdown alerts based on your GPS distance to{' '}
                  <strong className="text-[#141821]">{originEntry?.station.name}</strong> ({timeToReachMetrics.travelMin} min away).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlanningTrip(true);
                    setAnchorMs(Date.now());
                  }}
                  className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md transition-colors whitespace-nowrap"
                >
                  <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Activate Leave Countdown</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
