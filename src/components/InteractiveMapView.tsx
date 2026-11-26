import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bus,
  Compass,
  Hotel,
  Layers,
  LocateFixed,
  MapPin,
  Ticket,
  Train,
} from 'lucide-react';
import { useTransitData } from '../context/TransitDataContext';
import { LiveTransitVehicle, ModeId, Station, TransitLine } from '../types/transit';
import { findNearestCity, findNearestStations } from '../utils/geoLocation';
import { OpenMapMarker, OpenMapPolyline, OpenSourceMap } from './OpenSourceMap';
import { StatusLabel } from './StatusText';

interface InteractiveMapViewProps {
  initialCityId?: string | null;
  initialStationId?: string | null;
  userCoords: [number, number] | null;
  onRequestLocate: () => void;
  onSelectCityProfile: (cityId: string) => void;
  onSelectSystemProfile: (systemId: string) => void;
  onOpenBooking: (cityId?: string, systemId?: string) => void;
}

export const InteractiveMapView: React.FC<InteractiveMapViewProps> = ({
  initialCityId = null,
  initialStationId = null,
  userCoords,
  onRequestLocate,
  onSelectCityProfile,
  onSelectSystemProfile,
  onOpenBooking,
}) => {
  const {
    cities,
    comingSoonCities,
    systems,
    lines,
    stations,
    modes,
    hotels,
    indianRailways,
  } = useTransitData();

  const [selectedCityId, setSelectedCityId] = useState<string | null>(initialCityId);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(initialStationId);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState<ModeId | 'all'>('all');

  const [showOperational, setShowOperational] = useState(true);
  const [showConstruction, setShowConstruction] = useState(true);
  const [showComingSoon, setShowComingSoon] = useState(true);
  const [showLiveVehicles, setShowLiveVehicles] = useState(true);
  const [showHotels, setShowHotels] = useState(true);
  const [showIndianRailways, setShowIndianRailways] = useState(true);

  const [liveVehicles, setLiveVehicles] = useState<LiveTransitVehicle[]>([]);

  const selectedCity = useMemo(
    () => (selectedCityId ? cities.find((c) => c.id === selectedCityId) ?? null : null),
    [cities, selectedCityId]
  );

  // Fetch live vehicles for selected city or national preview
  useEffect(() => {
    const query = selectedCityId ? `?cityId=${encodeURIComponent(selectedCityId)}` : '';
    const load = () => {
      fetch(`/api/live-transit${query}`)
        .then((r) => (r.ok ? r.json() : { vehicles: [] }))
        .then((d: { vehicles?: LiveTransitVehicle[] }) => {
          if (Array.isArray(d.vehicles)) setLiveVehicles(d.vehicles);
        })
        .catch(() => {
          // ignore
        });
    };
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, [selectedCityId]);

  const nearestToUser = useMemo(() => {
    if (!userCoords) return null;
    const nearestCity = findNearestCity(userCoords[0], userCoords[1], cities);
    const nearestSt = findNearestStations(userCoords[0], userCoords[1], stations, 3);
    return { ...nearestCity, stations: nearestSt };
  }, [userCoords, cities, stations]);

  // City aggregate metrics
  const cityMetrics = useMemo(() => {
    const map = new Map<string, { operationalKm: number; ucKm: number; systemCount: number; hasMode: boolean }>();
    for (const city of cities) {
      const citySystems = systems.filter((s) => s.cityId === city.id);
      const matching = modeFilter === 'all' ? citySystems : citySystems.filter((s) => s.modeId === modeFilter);
      const operationalKm = matching
        .filter((s) => s.status === 'Operational' || s.status === 'Partially Operational')
        .reduce((acc, s) => acc + s.operationalLengthKm, 0);
      const ucKm = matching.reduce((acc, s) => acc + s.underConstructionKm, 0);
      map.set(city.id, { operationalKm, ucKm, systemCount: matching.length, hasMode: matching.length > 0 });
    }
    return map;
  }, [cities, systems, modeFilter]);

  const cityLines = useMemo(() => {
    if (!selectedCity) return [];
    return lines.filter((line) => {
      if (line.cityId !== selectedCity.id) return false;
      const sys = systems.find((s) => s.id === line.systemId);
      if (modeFilter !== 'all' && sys?.modeId !== modeFilter) return false;
      const isOp = line.status === 'Operational' || line.status === 'Partially Operational';
      const isUC = line.status === 'Under Construction' || line.status === 'Approved' || line.status === 'Proposed';
      if (isOp && !showOperational) return false;
      if (isUC && !showConstruction) return false;
      return true;
    });
  }, [selectedCity, lines, systems, modeFilter, showOperational, showConstruction]);

  const cityStations = useMemo(() => {
    if (!selectedCity) return [];
    const visibleLineIds = new Set(cityLines.map((l) => l.id));
    return stations.filter((st) => {
      if (st.cityId !== selectedCity.id) return false;
      if (modeFilter === 'all') return true;
      return st.lineIds.some((id) => visibleLineIds.has(id));
    });
  }, [selectedCity, stations, cityLines, modeFilter]);

  const cityHotels = useMemo(
    () => (selectedCity && showHotels ? hotels.filter((h) => h.cityId === selectedCity.id) : []),
    [selectedCity, hotels, showHotels]
  );

  // Build Open-Source Leaflet Polylines
  const mapPolylines: OpenMapPolyline[] = useMemo(() => {
    if (!selectedCity) {
      // All-India View: plot Indian Railways Vande Bharat / Rajdhani trunk corridors
      if (!showIndianRailways) return [];
      return indianRailways.map((tr) => ({
        id: tr.id,
        coordinates: tr.coordinatesPath,
        color: tr.trainType === 'Vande Bharat' ? '#1D4ED8' : tr.trainType === 'Namo Bharat RRTS' ? '#0F766E' : '#B45309',
        weight: tr.trainType === 'Vande Bharat' ? 3.5 : 2.5,
        dashArray: tr.trainType === 'Rajdhani' || tr.trainType === 'Duronto' ? '6 4' : undefined,
        opacity: 0.78,
        label: `${tr.trainNumber} ${tr.trainName}`,
        sublabel: `${tr.fromStation} → ${tr.toStation} (${tr.durationLabel} · From ₹${tr.faresInr[0]?.priceInr})`,
      }));
    }

    return cityLines.map((line) => {
      const isUC = line.status === 'Under Construction' || line.status === 'Partially Operational';
      return {
        id: line.id,
        coordinates: line.coordinatesPath,
        color: line.colorHex,
        weight: selectedLineId === line.id ? 6 : 4.5,
        dashArray: line.status === 'Under Construction' ? '8 6' : isUC ? '10 4' : undefined,
        label: line.name,
        sublabel: `${line.startStation} → ${line.terminalStation} (${line.lengthKm} km · ${line.status})`,
        onClick: () => setSelectedLineId(line.id),
      };
    });
  }, [selectedCity, showIndianRailways, indianRailways, cityLines, selectedLineId]);

  // Build Open-Source Leaflet Markers
  const mapMarkers: OpenMapMarker[] = useMemo(() => {
    const list: OpenMapMarker[] = [];

    if (userCoords) {
      list.push({
        id: 'user-gps-marker',
        lat: userCoords[0],
        lng: userCoords[1],
        title: 'Your Location',
        subtitle: nearestToUser
          ? `Nearest City: ${nearestToUser.city.name} (${nearestToUser.distanceKm} km)`
          : 'Current GPS Position',
        color: '#1D4ED8',
        kind: 'user',
      });
    }

    if (!selectedCity) {
      for (const city of cities) {
        const m = cityMetrics.get(city.id);
        if (!m || !m.hasMode) continue;
        list.push({
          id: `city-${city.id}`,
          lat: city.coordinates[0],
          lng: city.coordinates[1],
          title: city.name,
          subtitle: `${city.state} · ${m.operationalKm.toFixed(1)} km rail/BRT/water · ${m.systemCount} systems`,
          color: '#1D4ED8',
          radius: Math.min(13, Math.max(7, 6 + Math.sqrt(m.operationalKm) * 0.22)),
          kind: 'city',
          onClick: () => {
            setSelectedCityId(city.id);
            setSelectedStationId(null);
            setSelectedLineId(null);
          },
        });
      }

      if (showComingSoon) {
        for (const cs of comingSoonCities) {
          list.push({
            id: cs.id,
            lat: cs.coordinates[0],
            lng: cs.coordinates[1],
            title: `${cs.name} — Coming Soon`,
            subtitle: `${cs.systemName} · ${cs.phase1Km} km · ${cs.expectedLaunch} (${cs.estimatedFareRangeInr})`,
            color: '#F59E0B',
            radius: 7,
            kind: 'coming-soon',
          });
        }
      }
      return list;
    }

    // Selected City Stations
    for (const st of cityStations) {
      list.push({
        id: st.id,
        lat: st.latitude,
        lng: st.longitude,
        title: st.name,
        subtitle: `${st.stationType} · ${st.interchangeModes.join(' / ')}`,
        color: selectedStationId === st.id ? '#1D4ED8' : st.isInterchange ? '#141821' : '#475569',
        radius: selectedStationId === st.id ? 9 : st.isInterchange ? 7 : 5,
        kind: 'station',
        onClick: () => setSelectedStationId(st.id),
      });
    }

    // Live Moving Metro & Bus Pins
    if (showLiveVehicles) {
      for (const v of liveVehicles) {
        list.push({
          id: v.id,
          lat: v.lat,
          lng: v.lng,
          title: `${v.routeLabel} → ${v.headsign}`,
          subtitle: `${v.statusText} · Crowd: ${v.occupancy} · ${v.speedKmh} km/h`,
          color: v.lineColor,
          kind: v.mode === 'bus' ? 'live-bus' : 'live-metro',
        });
      }
    }

    // Transit-Adjacent Hotels
    for (const h of cityHotels) {
      list.push({
        id: h.id,
        lat: h.coordinates[0],
        lng: h.coordinates[1],
        title: `${h.name} (₹${h.pricePerNightInr.toLocaleString('en-IN')}/night)`,
        subtitle: `${h.walkMinutes} min walk to ${h.nearestStation} · ${h.transitLineLabel}`,
        color: '#7C3AED',
        kind: 'hotel',
      });
    }

    return list;
  }, [
    userCoords,
    nearestToUser,
    selectedCity,
    cities,
    cityMetrics,
    showComingSoon,
    comingSoonCities,
    cityStations,
    selectedStationId,
    showLiveVehicles,
    liveVehicles,
    cityHotels,
  ]);

  const mapCenter: [number, number] = selectedCity
    ? selectedCity.coordinates
    : [22.2, 79.0];
  const mapZoom = selectedCity ? 12 : 5;

  const selectedStation: Station | null = useMemo(
    () => (selectedStationId ? stations.find((s) => s.id === selectedStationId) ?? null : null),
    [stations, selectedStationId]
  );

  const selectedLine: TransitLine | null = useMemo(
    () => (selectedLineId ? lines.find((l) => l.id === selectedLineId) ?? null : null),
    [lines, selectedLineId]
  );

  const activeCitySystems = useMemo(
    () => (selectedCity ? systems.filter((s) => s.cityId === selectedCity.id) : []),
    [selectedCity, systems]
  );

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E2E0DA] pb-5">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#525866]">
            OpenStreetMap + Leaflet Open-Source Cartography · Real-Time Fleet & Rail Overlay
          </p>
          <h1 className="text-2xl sm:text-4xl font-serif font-semibold text-[#141821] mt-1">
            {selectedCity ? `${selectedCity.name} Live Open-Source Atlas` : 'All-India Open-Source Transit Atlas'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRequestLocate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-md transition-colors whitespace-nowrap"
          >
            <LocateFixed className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{userCoords ? 'Refresh My GPS' : 'Locate Me'}</span>
          </button>

          {selectedCity && (
            <button
              type="button"
              onClick={() => {
                setSelectedCityId(null);
                setSelectedStationId(null);
                setSelectedLineId(null);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#E2E0DA] hover:border-[#141821] text-[#141821] rounded-md transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>All-India View</span>
            </button>
          )}

          <select
            aria-label="Filter map by transit mode"
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as ModeId | 'all')}
            className="px-3 py-2 text-xs font-medium bg-white border border-[#E2E0DA] rounded-md text-[#141821]"
          >
            <option value="all">All 8 Transit Modes</option>
            {modes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Jump to city map"
            value={selectedCityId ?? ''}
            onChange={(e) => {
              const val = e.target.value || null;
              setSelectedCityId(val);
              setSelectedStationId(null);
              setSelectedLineId(null);
            }}
            className="px-3 py-2 text-xs font-medium bg-white border border-[#E2E0DA] rounded-md text-[#141821]"
          >
            <option value="">All-India Overview (12 Active + 8 Soon)</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.state})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* OpenStreetMap Leaflet Canvas */}
        <div className="lg:col-span-8 bg-white border border-[#E2E0DA] rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-[#F8F7F4] border-b border-[#E2E0DA] flex flex-wrap items-center gap-4 text-xs text-[#525866]">
            <span className="inline-flex items-center gap-1.5 font-medium text-[#141821]">
              <Layers className="w-3.5 h-3.5 text-[#1D4ED8]" aria-hidden="true" />
              <span>Layers:</span>
            </span>

            {!selectedCity ? (
              <>
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showIndianRailways}
                    onChange={(e) => setShowIndianRailways(e.target.checked)}
                    className="accent-[#1D4ED8]"
                  />
                  <span>Indian Railways (Vande Bharat / Rajdhani)</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showComingSoon}
                    onChange={(e) => setShowComingSoon(e.target.checked)}
                    className="accent-[#B45309]"
                  />
                  <span>Coming Soon Cities ({comingSoonCities.length})</span>
                </label>
              </>
            ) : (
              <>
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showOperational}
                    onChange={(e) => setShowOperational(e.target.checked)}
                    className="accent-[#1D4ED8]"
                  />
                  <span>Operational</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showConstruction}
                    onChange={(e) => setShowConstruction(e.target.checked)}
                    className="accent-[#B45309]"
                  />
                  <span>Under Construction</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showLiveVehicles}
                    onChange={(e) => setShowLiveVehicles(e.target.checked)}
                    className="accent-[#0F766E]"
                  />
                  <span>Live Metro & Bus ({liveVehicles.length})</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showHotels}
                    onChange={(e) => setShowHotels(e.target.checked)}
                    className="accent-[#7C3AED]"
                  />
                  <span>Transit Hotels ({cityHotels.length})</span>
                </label>
              </>
            )}
          </div>

          <OpenSourceMap
            center={mapCenter}
            zoom={mapZoom}
            polylines={mapPolylines}
            markers={mapMarkers}
            heightClass="h-[460px] sm:h-[560px]"
          />

          <div className="px-4 py-3 bg-[#F8F7F4] border-t border-[#E2E0DA] flex flex-wrap items-center justify-between gap-3 text-xs text-[#525866]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#1D4ED8] inline-block" />
                <span>Operational City / Station</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#F59E0B] border border-[#78350F] inline-block" />
                <span>Coming Soon Metro</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#0F766E] inline-block" />
                <span>M / B Live Vehicle</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#7C3AED] inline-block" />
                <span>H Station-Walk Hotel</span>
              </span>
            </div>
            <span className="font-mono text-[11px]">Powered by Leaflet & OpenStreetMap</span>
          </div>
        </div>

        {/* Right Inspector Sidebar */}
        <aside className="lg:col-span-4 space-y-4">
          {nearestToUser && (
            <div className="bg-white border border-[#E2E0DA] rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#1D4ED8] uppercase">Detected Near You</span>
                <button
                  type="button"
                  onClick={() => setSelectedCityId(nearestToUser.city.id)}
                  className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                >
                  Open {nearestToUser.city.name}
                </button>
              </div>
              <div className="text-sm font-semibold text-[#141821]">
                Nearest Hub: {nearestToUser.city.name} ({nearestToUser.distanceKm} km away)
              </div>
              <div className="space-y-1.5 pt-1 border-t border-[#E2E0DA]">
                {nearestToUser.stations.map((item) => (
                  <button
                    key={item.station.id}
                    type="button"
                    onClick={() => {
                      setSelectedCityId(item.station.cityId);
                      setSelectedStationId(item.station.id);
                    }}
                    className="w-full text-left text-xs flex items-center justify-between py-1 hover:text-[#1D4ED8]"
                  >
                    <span className="truncate font-medium">{item.station.name}</span>
                    <span className="font-mono text-[#525866] shrink-0">
                      {item.distanceKm} km · {item.walkMin}m walk
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!selectedCity ? (
            <div className="bg-white border border-[#E2E0DA] rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#1D4ED8]">
                <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Active & Upcoming Cities</span>
              </div>
              <p className="text-xs text-[#525866] leading-relaxed">
                Click any city pin or Indian Railways corridor on the OpenStreetMap canvas, or choose a city below to inspect live metro/bus pins, fares, and hotels.
              </p>
              <div className="divide-y divide-[#E2E0DA] max-h-[380px] overflow-y-auto">
                {cities.map((c) => {
                  const m = cityMetrics.get(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCityId(c.id)}
                      className="w-full py-2.5 px-1 text-left flex items-center justify-between hover:bg-[#F8F7F4] transition-colors"
                    >
                      <div>
                        <div className="text-sm font-semibold text-[#141821]">{c.name}</div>
                        <div className="text-xs text-[#525866]">{c.state} · {m?.systemCount ?? 0} systems</div>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-[#141821]">
                        {m && m.operationalKm > 0 ? `${m.operationalKm.toFixed(1)} km` : 'Bus'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* City Summary + Book Ticket */}
              <div className="bg-white border border-[#E2E0DA] rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-mono text-[#525866]">{selectedCity.state}</p>
                    <h2 className="text-xl font-serif font-semibold text-[#141821]">{selectedCity.name}</h2>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenBooking(selectedCity.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-[#0F766E] hover:bg-[#0D9488] rounded-md whitespace-nowrap"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>Tickets</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectCityProfile(selectedCity.id)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md whitespace-nowrap"
                    >
                      Profile
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[#525866] leading-relaxed">{selectedCity.overview}</p>

                <div className="pt-2 border-t border-[#E2E0DA] space-y-2">
                  <div className="text-xs font-semibold text-[#141821]">Systems & Fares</div>
                  {activeCitySystems.map((sys) => (
                    <button
                      key={sys.id}
                      type="button"
                      onClick={() => onSelectSystemProfile(sys.id)}
                      className="w-full text-left p-2.5 bg-[#F8F7F4] hover:bg-[#EBE8E1] border border-[#E2E0DA] rounded transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#141821]">{sys.name}</span>
                        <span className="text-xs font-mono tabular-nums text-[#1D4ED8]">
                          {sys.fareRangeInr.split(' ')[0]} {sys.fareRangeInr.split(' ')[2] || ''}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-[#525866]">
                        <StatusLabel status={sys.status} />
                        <span className="font-mono">
                          {sys.operationalLengthKm > 0 ? `${sys.operationalLengthKm} km` : sys.headwayPeakMin}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Vehicles in City */}
              {liveVehicles.length > 0 && (
                <div className="bg-white border border-[#E2E0DA] rounded-xl p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#0F766E]">
                    <Train className="w-3.5 h-3.5" />
                    <span>Live Metro & Bus Positions</span>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {liveVehicles.map((v) => (
                      <div key={v.id} className="p-2.5 bg-[#F8F7F4] border border-[#E2E0DA] rounded text-xs">
                        <div className="flex items-center justify-between font-semibold text-[#141821]">
                          <span className="inline-flex items-center gap-1.5">
                            {v.mode === 'bus' ? <Bus className="w-3.5 h-3.5 text-[#0F766E]" /> : <Train className="w-3.5 h-3.5 text-[#1D4ED8]" />}
                            {v.routeLabel}
                          </span>
                          <span className="font-mono text-[#1D4ED8]">{v.etaNextStopMin} min</span>
                        </div>
                        <div className="text-[11px] text-[#525866] mt-0.5">{v.statusText} · Crowd: {v.occupancy}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nearby Hotels in City */}
              {cityHotels.length > 0 && (
                <div className="bg-white border border-[#E2E0DA] rounded-xl p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#7C3AED]">
                    <Hotel className="w-3.5 h-3.5" />
                    <span>Transit-Adjacent Stays</span>
                  </div>
                  <div className="space-y-2">
                    {cityHotels.map((h) => (
                      <div key={h.id} className="p-2.5 bg-[#F8F7F4] border border-[#E2E0DA] rounded text-xs">
                        <div className="flex items-center justify-between font-semibold text-[#141821]">
                          <span>{h.name}</span>
                          <span className="font-mono text-[#141821]">₹{h.pricePerNightInr.toLocaleString('en-IN')}/nt</span>
                        </div>
                        <div className="text-[11px] text-[#525866] mt-0.5">
                          {h.walkMinutes} min walk to {h.nearestStation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Station Inspector */}
              {selectedStation && (
                <div className="bg-white border border-[#E2E0DA] rounded-xl p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#1D4ED8]">
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Station Record</span>
                  </div>
                  <h3 className="text-lg font-serif font-semibold text-[#141821]">{selectedStation.name}</h3>
                  <div className="text-xs text-[#525866] font-mono tabular-nums">
                    {selectedStation.latitude.toFixed(4)}°N, {selectedStation.longitude.toFixed(4)}°E · {selectedStation.stationType}
                  </div>
                  <p className="text-xs text-[#525866]">
                    Interchanges: {selectedStation.interchangeModes.join(' · ')}
                  </p>
                </div>
              )}

              {/* Selected Line Inspector */}
              {selectedLine && (
                <div className="bg-white border border-[#E2E0DA] rounded-xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#525866]">Corridor Specification</span>
                    <StatusLabel status={selectedLine.status} />
                  </div>
                  <h3 className="text-base font-serif font-semibold text-[#141821]">{selectedLine.name}</h3>
                  <p className="text-xs text-[#525866]">{selectedLine.startStation} → {selectedLine.terminalStation}</p>
                  <div className="text-xs font-mono tabular-nums text-[#525866]">
                    {selectedLine.lengthKm} km · {selectedLine.stationCount} stations · Opened {selectedLine.openingDate}
                  </div>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
};
