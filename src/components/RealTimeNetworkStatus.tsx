import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  Clock,
  ExternalLink,
  LocateFixed,
  Navigation,
  RefreshCw,
  Ticket,
  Train,
  Wrench,
} from 'lucide-react';
import { useTransitData } from '../context/TransitDataContext';
import { LiveTransitVehicle } from '../types/transit';
import { computeWhenToLeave } from '../utils/geoLocation';
import { OpenMapMarker, OpenSourceMap } from './OpenSourceMap';

export interface NetworkAlertItem {
  id: string;
  systemId: string;
  cityId: string;
  cityName: string;
  systemName: string;
  affectedCorridor: string;
  severity: 'Service Disruption' | 'Ongoing Maintenance' | 'Partial Operation' | 'Advisory';
  statusWindow: string;
  summary: string;
  sourceAgency: string;
  sourceUrl: string;
  updatedAt: string;
  coordinates: { lat: number; lng: number };
}

interface LiveSearchVerificationResult {
  cityName: string;
  topic: string;
  summaryMarkdown: string;
  sources: Array<{ title: string; uri: string }>;
  queriedAt: string;
}

interface RealTimeNetworkStatusProps {
  activeCityId: string;
  userCoords: [number, number] | null;
  onRequestLocate: () => void;
  onSelectSystem: (systemId: string) => void;
  onSelectCity: (cityId: string) => void;
  onOpenBooking: (cityId?: string, systemId?: string) => void;
}

const SEVERITY_COLORS: Record<NetworkAlertItem['severity'], string> = {
  'Service Disruption': '#B91C1C',
  'Ongoing Maintenance': '#B45309',
  'Partial Operation': '#1D4ED8',
  Advisory: '#0F766E',
};

export const RealTimeNetworkStatus: React.FC<RealTimeNetworkStatusProps> = ({
  activeCityId,
  userCoords,
  onRequestLocate,
  onSelectSystem,
  onSelectCity,
  onOpenBooking,
}) => {
  const { cities } = useTransitData();
  const [alerts, setAlerts] = useState<NetworkAlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<'all' | NetworkAlertItem['severity']>('all');
  const [selectedAlert, setSelectedAlert] = useState<NetworkAlertItem | null>(null);

  // Live Metro & Bus Vehicle Telemetry
  const [liveVehicles, setLiveVehicles] = useState<LiveTransitVehicle[]>([]);
  const [liveTimestampIst, setLiveTimestampIst] = useState<string>('');
  const [vehicleModeFilter, setVehicleModeFilter] = useState<'all' | 'metro' | 'bus'>('all');
  const [showLiveOnMap, setShowLiveOnMap] = useState(true);

  // "When to Leave" Smart Commute Advisor
  const [walkMinutes, setWalkMinutes] = useState<number>(7);
  const [tripDurationMin, setTripDurationMin] = useState<number>(22);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  // Map camera state
  const activeCity = useMemo(
    () => cities.find((c) => c.id === activeCityId) ?? cities[0],
    [cities, activeCityId]
  );
  const [mapCenter, setMapCenter] = useState<[number, number]>(activeCity.coordinates);
  const [mapZoom, setMapZoom] = useState<number>(11);

  // Live 2026 Web Search Grounding Verification
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<LiveSearchVerificationResult | null>(null);

  useEffect(() => {
    setMapCenter(activeCity.coordinates);
    setMapZoom(11);
  }, [activeCity.id, activeCity.coordinates]);

  const fetchAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    setAlertsError(null);
    try {
      const res = await fetch('/api/network-status/alerts');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { alerts?: NetworkAlertItem[] };
      const list = data.alerts ?? [];
      setAlerts(list);
      if (list.length > 0) {
        const cityMatch = list.find((a) => a.cityId === activeCityId) ?? list[0];
        setSelectedAlert((prev) => prev ?? cityMatch);
      }
    } catch (err) {
      setAlertsError(err instanceof Error ? err.message : 'Unable to fetch network advisories.');
    } finally {
      setLoadingAlerts(false);
    }
  }, [activeCityId]);

  const fetchLiveVehicles = useCallback(async () => {
    try {
      const res = await fetch(`/api/live-transit?cityId=${encodeURIComponent(activeCityId)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { vehicles?: LiveTransitVehicle[]; timestampIst?: string };
      if (Array.isArray(data.vehicles)) {
        setLiveVehicles(data.vehicles);
        if (data.timestampIst) setLiveTimestampIst(data.timestampIst);
        if (data.vehicles.length > 0) {
          setSelectedVehicleId((prev) =>
            data.vehicles!.some((v) => v.id === prev) ? prev : data.vehicles![0].id
          );
        }
      }
    } catch {
      // silent retry on next poll
    }
  }, [activeCityId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    fetchLiveVehicles();
    const timer = window.setInterval(fetchLiveVehicles, 15000);
    return () => window.clearInterval(timer);
  }, [fetchLiveVehicles]);

  const filteredAlerts = useMemo(() => {
    if (severityFilter === 'all') return alerts;
    return alerts.filter((a) => a.severity === severityFilter);
  }, [alerts, severityFilter]);

  const filteredVehicles = useMemo(() => {
    if (vehicleModeFilter === 'all') return liveVehicles;
    return liveVehicles.filter((v) =>
      vehicleModeFilter === 'metro' ? v.mode === 'metro' || v.mode === 'rail' : v.mode === 'bus'
    );
  }, [liveVehicles, vehicleModeFilter]);

  const activeDepartureVehicle = useMemo(
    () =>
      filteredVehicles.find((v) => v.id === selectedVehicleId) ||
      filteredVehicles[0] ||
      liveVehicles[0],
    [filteredVehicles, liveVehicles, selectedVehicleId]
  );

  const departureRecommendation = useMemo(() => {
    const headway = activeDepartureVehicle?.headwayMin ?? 5;
    return computeWhenToLeave({
      walkMinutes,
      securityBufferMin: activeDepartureVehicle?.mode === 'bus' ? 1 : 3,
      headwayMin: headway,
      tripDurationMin,
    });
  }, [activeDepartureVehicle, walkMinutes, tripDurationMin]);

  const mapMarkers: OpenMapMarker[] = useMemo(() => {
    const markers: OpenMapMarker[] = [];

    if (userCoords) {
      markers.push({
        id: 'user-gps',
        lat: userCoords[0],
        lng: userCoords[1],
        title: 'Your Current Location',
        subtitle: `${userCoords[0].toFixed(4)}°N, ${userCoords[1].toFixed(4)}°E`,
        color: '#1D4ED8',
        kind: 'user',
      });
    }

    for (const alert of filteredAlerts) {
      markers.push({
        id: alert.id,
        lat: alert.coordinates.lat,
        lng: alert.coordinates.lng,
        title: `${alert.systemName} (${alert.severity})`,
        subtitle: `${alert.affectedCorridor} · ${alert.statusWindow}`,
        color: SEVERITY_COLORS[alert.severity],
        radius: selectedAlert?.id === alert.id ? 10 : 7,
        kind: 'alert',
        onClick: () => {
          setSelectedAlert(alert);
          setMapCenter([alert.coordinates.lat, alert.coordinates.lng]);
          setMapZoom(12);
        },
      });
    }

    if (showLiveOnMap) {
      for (const v of filteredVehicles) {
        markers.push({
          id: v.id,
          lat: v.lat,
          lng: v.lng,
          title: `${v.routeLabel} → ${v.headsign}`,
          subtitle: `${v.statusText} · Headway ~${v.headwayMin} min · Crowd: ${v.occupancy} · ${v.speedKmh} km/h`,
          color: v.lineColor,
          kind: v.mode === 'bus' ? 'live-bus' : 'live-metro',
          onClick: () => setSelectedVehicleId(v.id),
        });
      }
    }

    return markers;
  }, [userCoords, filteredAlerts, selectedAlert, showLiveOnMap, filteredVehicles]);

  const handleVerifyLiveWeb = async () => {
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      const res = await fetch('/api/network-status/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityName: activeCity.name,
          topic: 'current 2026 metro ticket prices, new lines, live delays, and Indian Railways connectivity',
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<LiveSearchVerificationResult> & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.summaryMarkdown) {
        setVerifyResult(data as LiveSearchVerificationResult);
      }
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Unable to fetch live 2026 updates.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const renderSeverityLabel = (severity: NetworkAlertItem['severity']) => {
    switch (severity) {
      case 'Service Disruption':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B91C1C]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Service Disruption</span>
          </span>
        );
      case 'Ongoing Maintenance':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B45309]">
            <Wrench className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Ongoing Maintenance</span>
          </span>
        );
      case 'Partial Operation':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8]">
            <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Partial Operation</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E]">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Operational Advisory</span>
          </span>
        );
    }
  };

  return (
    <section
      aria-labelledby="realtime-network-status-heading"
      className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8"
    >
      {/* Header & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E2E0DA] pb-4 mb-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#B45309]">
            Live Metro & Bus Locations · OpenStreetMap · {liveTimestampIst ? `${liveTimestampIst} IST` : 'Updated 15 Nov 2026'}
          </p>
          <h2
            id="realtime-network-status-heading"
            className="text-2xl sm:text-3xl font-serif font-semibold text-[#141821] mt-1"
          >
            Real-time Network Status & When to Leave
          </h2>
          <p className="text-sm text-[#525866] mt-1 max-w-2xl">
            Track live service disruptions, active metro trains and electric city buses on OpenStreetMap, and calculate the exact minute to leave home.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-[#EBE8E1]/60 p-1 rounded-lg border border-[#E2E0DA] self-start lg:self-auto">
          {(
            [
              { id: 'all', label: `All (${alerts.length})` },
              { id: 'Service Disruption', label: 'Disruptions' },
              { id: 'Ongoing Maintenance', label: 'Maintenance' },
              { id: 'Partial Operation', label: 'Partial Ops' },
              { id: 'Advisory', label: 'Advisories' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSeverityFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                severityFilter === tab.id
                  ? 'bg-white text-[#141821] shadow-xs'
                  : 'text-[#525866] hover:text-[#141821]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Left Alert Feed & "When to Leave" | Right Open-Source Live Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Service Bulletins + Smart Departure Advisor */}
        <div className="lg:col-span-6 space-y-5">
          {/* "When to Leave" Smart Commute Advisor Card */}
          <div className="bg-white border border-[#E2E0DA] rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-mono text-[#1D4ED8]">
                  Commute Timing Advisor · {activeCity.name}
                </div>
                <h3 className="text-lg font-serif font-semibold text-[#141821]">
                  When Should You Leave?
                </h3>
              </div>
              <button
                type="button"
                onClick={onRequestLocate}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#F8F7F4] hover:bg-[#EBE8E1] border border-[#E2E0DA] rounded-md text-[#141821]"
              >
                <LocateFixed className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span>{userCoords ? 'GPS Locked' : 'Detect My Stop'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-medium text-[#525866] mb-1">
                  Live Corridor
                </label>
                <select
                  value={activeDepartureVehicle?.id || ''}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded-md text-[#141821]"
                >
                  {liveVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.routeLabel} → {v.headsign.split(' ')[0]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#525866] mb-1">
                  Walk to Station (min)
                </label>
                <input
                  type="number"
                  min={1}
                  max={45}
                  value={walkMinutes}
                  onChange={(e) => setWalkMinutes(Math.max(1, Number(e.target.value) || 5))}
                  className="w-full px-2.5 py-2 text-xs font-mono bg-[#F8F7F4] border border-[#E2E0DA] rounded-md text-[#141821]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#525866] mb-1">
                  Ride Time (min)
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={tripDurationMin}
                  onChange={(e) => setTripDurationMin(Math.max(5, Number(e.target.value) || 15))}
                  className="w-full px-2.5 py-2 text-xs font-mono bg-[#F8F7F4] border border-[#E2E0DA] rounded-md text-[#141821]"
                />
              </div>
            </div>

            <div className="bg-[#141821] text-white rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-[#93C5FD]">
                  <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    Leave at {departureRecommendation.leaveAtIst} IST (in {departureRecommendation.leaveInMin} min)
                  </span>
                </div>
                <p className="text-xs text-[#E5E7EB] leading-relaxed">
                  {departureRecommendation.adviceText}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenBooking(activeCity.id, activeDepartureVehicle?.systemId)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold bg-[#1D4ED8] hover:bg-[#2563EB] text-white rounded-md whitespace-nowrap shrink-0"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Book Ticket</span>
              </button>
            </div>
          </div>

          {/* Alerts Feed */}
          <div className="bg-white border border-[#E2E0DA] rounded-xl divide-y divide-[#E2E0DA]">
            {loadingAlerts ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="animate-pulse space-y-2">
                    <div className="h-3 bg-[#EBE8E1] rounded w-1/3" />
                    <div className="h-4 bg-[#EBE8E1] rounded w-2/3" />
                    <div className="h-3 bg-[#EBE8E1] rounded w-full" />
                  </div>
                ))}
              </div>
            ) : alertsError ? (
              <div className="p-6 text-sm text-[#B91C1C] space-y-2">
                <p>Unable to load network alerts: {alertsError}</p>
                <button
                  type="button"
                  onClick={fetchAlerts}
                  className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                >
                  Retry loading advisories
                </button>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-sm font-medium text-[#141821]">No active advisories in this category</p>
                <button
                  type="button"
                  onClick={() => setSeverityFilter('all')}
                  className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                >
                  Show all network advisories
                </button>
              </div>
            ) : (
              filteredAlerts.slice(0, 5).map((alert) => {
                const isSelected = selectedAlert?.id === alert.id;
                return (
                  <article
                    key={alert.id}
                    className={`p-4 sm:p-5 transition-colors ${isSelected ? 'bg-[#F8F7F4]' : 'hover:bg-[#F8F7F4]/60'}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {renderSeverityLabel(alert.severity)}
                      <span className="text-[11px] font-mono text-[#7D8491] tabular-nums">
                        {alert.cityName} · {alert.updatedAt}
                      </span>
                    </div>

                    <h3 className="mt-1.5 text-base font-serif font-semibold text-[#141821]">
                      {alert.systemName} — {alert.affectedCorridor}
                    </h3>
                    <p className="mt-1 text-xs font-mono text-[#525866]">{alert.statusWindow}</p>
                    <p className="mt-1.5 text-xs text-[#525866] leading-relaxed">{alert.summary}</p>

                    <div className="mt-3 pt-2.5 border-t border-[#E2E0DA] flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAlert(alert);
                            setMapCenter([alert.coordinates.lat, alert.coordinates.lng]);
                            setMapZoom(12);
                          }}
                          className="font-semibold text-[#1D4ED8] hover:underline"
                        >
                          Focus on Map
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectSystem(alert.systemId)}
                          className="font-medium text-[#141821] hover:text-[#1D4ED8] hover:underline"
                        >
                          System
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectCity(alert.cityId)}
                          className="font-medium text-[#525866] hover:text-[#141821] hover:underline"
                        >
                          City
                        </button>
                      </div>
                      <a
                        href={alert.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#525866] hover:text-[#1D4ED8]"
                      >
                        <span>{alert.sourceAgency}</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Open-Source Leaflet Live Metro/Bus & Alert Map + Live 2026 Search Verification */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-white border border-[#E2E0DA] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#F8F7F4] border-b border-[#E2E0DA] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium text-[#141821]">
                <span>OpenStreetMap Live View ({filteredVehicles.length} vehicles in {activeCity.name})</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-white border border-[#E2E0DA] rounded-md p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setVehicleModeFilter('all')}
                    className={`px-2 py-1 rounded ${vehicleModeFilter === 'all' ? 'bg-[#141821] text-white' : 'text-[#525866]'}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehicleModeFilter('metro')}
                    className={`px-2 py-1 rounded ${vehicleModeFilter === 'metro' ? 'bg-[#141821] text-white' : 'text-[#525866]'}`}
                  >
                    Metro/Rail
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehicleModeFilter('bus')}
                    className={`px-2 py-1 rounded ${vehicleModeFilter === 'bus' ? 'bg-[#141821] text-white' : 'text-[#525866]'}`}
                  >
                    Buses
                  </button>
                </div>

                <label className="inline-flex items-center gap-1.5 text-xs text-[#525866] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLiveOnMap}
                    onChange={(e) => setShowLiveOnMap(e.target.checked)}
                    className="accent-[#1D4ED8]"
                  />
                  <span>Live Pins</span>
                </label>
              </div>
            </div>

            <OpenSourceMap
              center={mapCenter}
              zoom={mapZoom}
              markers={mapMarkers}
              heightClass="h-[360px]"
            />

            {/* Compact Live Fleet Strip */}
            <div className="p-3.5 bg-[#F8F7F4] border-t border-[#E2E0DA] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredVehicles.slice(0, 4).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setSelectedVehicleId(v.id);
                    setMapCenter([v.lat, v.lng]);
                    setMapZoom(13);
                  }}
                  className={`p-2.5 text-left bg-white border rounded-lg transition-colors ${
                    activeDepartureVehicle?.id === v.id
                      ? 'border-[#1D4ED8]'
                      : 'border-[#E2E0DA] hover:border-[#141821]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#141821] truncate">
                      {v.mode === 'bus' ? (
                        <Bus className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                      ) : (
                        <Train className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
                      )}
                      <span className="truncate">{v.routeLabel}</span>
                    </span>
                    <span className="text-[11px] font-mono text-[#1D4ED8] shrink-0">
                      {v.etaNextStopMin}m
                    </span>
                  </div>
                  <div className="text-[11px] text-[#525866] truncate mt-0.5">
                    To {v.headsign} · Next: {v.nextStopName}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Live 2026 Web Search Verification Panel */}
          <div className="bg-white border border-[#E2E0DA] rounded-xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-mono text-[#1D4ED8]">
                  Live 2026 Web Search Sync · Grounded Operator Check
                </div>
                <h3 className="text-base font-serif font-semibold text-[#141821] mt-0.5">
                  Verify Current 2026 Fares & Line Openings ({activeCity.name})
                </h3>
              </div>
              <button
                type="button"
                disabled={verifyLoading}
                onClick={handleVerifyLiveWeb}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#141821] hover:bg-[#1D4ED8] disabled:opacity-60 rounded-md transition-colors whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${verifyLoading ? 'animate-spin' : ''}`} />
                <span>{verifyLoading ? 'Checking 2026 Sources...' : 'Check Latest 2026 Data'}</span>
              </button>
            </div>

            {verifyError && (
              <p className="text-xs text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded p-3">
                {verifyError}
              </p>
            )}

            {verifyResult && (
              <div className="pt-2 border-t border-[#E2E0DA] space-y-2.5">
                <div className="text-xs text-[#141821] leading-relaxed whitespace-pre-line bg-[#F8F7F4] border border-[#E2E0DA] rounded p-3.5 max-h-[200px] overflow-y-auto">
                  {verifyResult.summaryMarkdown}
                </div>
                {verifyResult.sources.length > 0 && (
                  <div className="flex flex-wrap gap-3 text-xs">
                    {verifyResult.sources.map((s) => (
                      <a
                        key={s.uri}
                        href={s.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#1D4ED8] hover:underline"
                      >
                        <span className="truncate max-w-[220px]">{s.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
