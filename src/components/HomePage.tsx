import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Compass,
  ExternalLink,
  LocateFixed,
  MapPin,
  Search,
  Sparkles,
  Ticket,
  Train,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTransitData } from '../context/TransitDataContext';
import { AtlasPage, ModeId } from '../types/transit';
import { findNearestStations } from '../utils/geoLocation';
import { ImageWithFallback } from './ImageWithFallback';
import { LiveTransitHelper } from './LiveTransitHelper';
import { OpenMapMarker, OpenSourceMap } from './OpenSourceMap';
import { RealTimeNetworkStatus } from './RealTimeNetworkStatus';
import { StatusLabel } from './StatusText';

interface HomePageProps {
  activeCityId: string;
  userCoords: [number, number] | null;
  locationLabel: string;
  onChangeActiveCity: (cityId: string) => void;
  onRequestLocate: () => void;
  onNavigate: (page: AtlasPage) => void;
  onSelectCity: (cityId: string) => void;
  onSelectSystem: (systemId: string) => void;
  onSelectMode: (modeId: ModeId) => void;
  onOpenMapCity: (cityId: string, stationId?: string) => void;
  onOpenBooking: (cityId?: string, systemId?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  activeCityId,
  userCoords,
  locationLabel,
  onChangeActiveCity,
  onRequestLocate,
  onNavigate,
  onSelectCity,
  onSelectSystem,
  onSelectMode,
  onOpenMapCity,
  onOpenBooking,
}) => {
  const {
    modes,
    cities,
    comingSoonCities,
    systems,
    stations,
    milestones,
    nationalMetrics,
    ticketingProfiles,
    indianRailways,
    hotels,
  } = useTransitData();

  const [heroQuery, setHeroQuery] = useState('');
  const [hoveredCityId, setHoveredCityId] = useState<string>(activeCityId);

  const activeCity = useMemo(
    () => cities.find((c) => c.id === activeCityId) ?? cities[0],
    [cities, activeCityId]
  );

  // Sync preview city when active city changes if needed
  const previewCity = useMemo(
    () => cities.find((c) => c.id === hoveredCityId) ?? activeCity,
    [cities, hoveredCityId, activeCity]
  );

  const previewCitySystems = useMemo(
    () => systems.filter((s) => s.cityId === previewCity.id),
    [systems, previewCity]
  );

  const nearestStations = useMemo(() => {
    const refLat = userCoords ? userCoords[0] : activeCity.coordinates[0];
    const refLng = userCoords ? userCoords[1] : activeCity.coordinates[1];
    return findNearestStations(refLat, refLng, stations, 3);
  }, [userCoords, activeCity, stations]);

  const activeCityTickets = useMemo(() => {
    const cityTickets = ticketingProfiles.filter((t) => t.cityId === activeCityId);
    return cityTickets.length > 0 ? cityTickets : ticketingProfiles.slice(0, 4);
  }, [ticketingProfiles, activeCityId]);

  const activeCityHotels = useMemo(() => {
    const cityHotels = hotels.filter((h) => h.cityId === activeCityId);
    return cityHotels.length > 0 ? cityHotels : hotels.slice(0, 3);
  }, [hotels, activeCityId]);

  const quickSearchResults = useMemo(() => {
    const q = heroQuery.trim().toLowerCase();
    if (!q) return [];
    const matchedCities = cities
      .filter((c) => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q))
      .map((c) => ({ type: 'City' as const, id: c.id, label: c.name, sub: c.state }));
    const matchedSystems = systems
      .filter((s) => s.name.toLowerCase().includes(q) || s.operator.toLowerCase().includes(q))
      .map((s) => ({ type: 'System' as const, id: s.id, label: s.name, sub: s.operator }));
    const matchedRail = indianRailways
      .filter(
        (r) =>
          r.trainName.toLowerCase().includes(q) ||
          r.fromStation.toLowerCase().includes(q) ||
          r.toStation.toLowerCase().includes(q)
      )
      .map((r) => ({
        type: 'Rail' as const,
        id: r.fromCityId,
        label: `${r.trainName} (${r.trainNumber})`,
        sub: `${r.fromStation} → ${r.toStation}`,
      }));
    return [...matchedCities, ...matchedSystems, ...matchedRail].slice(0, 6);
  }, [heroQuery, cities, systems, indianRailways]);

  const modeSummary = useMemo(() => {
    return modes.map((mode) => {
      const modeSystems = systems.filter((s) => s.modeId === mode.id);
      const opKm = modeSystems
        .filter((s) => s.status === 'Operational' || s.status === 'Partially Operational')
        .reduce((acc, s) => acc + s.operationalLengthKm, 0);
      return {
        mode,
        systemCount: modeSystems.length,
        opKm: Number(opKm.toFixed(1)),
      };
    });
  }, [modes, systems]);

  const topMetroChartData = useMemo(() => {
    return systems
      .filter((s) => s.modeId === 'metro-rail')
      .sort((a, b) => b.operationalLengthKm - a.operationalLengthKm)
      .slice(0, 7)
      .map((s) => ({
        name: s.shortName.replace('MahaMetro ', '').replace('UPMRC ', ''),
        operational: s.operationalLengthKm,
        underConstruction: s.underConstructionKm,
      }));
  }, [systems]);

  const indiaMapMarkers: OpenMapMarker[] = useMemo(() => {
    const activeMarkers: OpenMapMarker[] = cities.map((c) => ({
      id: `home-city-${c.id}`,
      lat: c.coordinates[0],
      lng: c.coordinates[1],
      title: c.name,
      subtitle: `${c.state} · Active Transit Network`,
      color: c.id === previewCity.id ? '#B45309' : '#1D4ED8',
      radius: c.id === previewCity.id ? 9 : 6.5,
      kind: 'city',
      onClick: () => setHoveredCityId(c.id),
    }));

    const upcomingMarkers: OpenMapMarker[] = comingSoonCities.map((c) => ({
      id: `home-soon-${c.id}`,
      lat: c.coordinates[0],
      lng: c.coordinates[1],
      title: `${c.name} (${c.systemName})`,
      subtitle: `${c.currentStage} · Est. ${c.expectedLaunch} · ${c.estimatedFareRangeInr}`,
      color: '#0F766E',
      radius: 5.5,
      kind: 'coming-soon',
    }));

    return [...activeMarkers, ...upcomingMarkers];
  }, [cities, comingSoonCities, previewCity.id]);

  const featuredNetworks = [
    {
      systemId: 'sys-delhi-metro',
      image: '/src/assets/images/hero_delhi_metro_viaduct_1794759112767.jpg',
    },
    {
      systemId: 'sys-mumbai-suburban',
      image: '/src/assets/images/mumbai_suburban_corridor_1794759111959.jpg',
    },
    {
      systemId: 'sys-kochi-water',
      image: '/src/assets/images/kochi_water_metro_ferry_1794759113304.jpg',
    },
    {
      systemId: 'sys-ahmedabad-brts',
      image: '/src/assets/images/ahmedabad_brts_corridor_1794759113691.jpg',
    },
  ];

  return (
    <div className="space-y-14 pb-20">
      {/* 1. Customer-First Hero + Live Location Strip */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        {/* Location & Hub Switcher Bar */}
        <div className="mb-6 bg-white border border-[#E2E0DA] rounded-lg px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <MapPin className="w-4 h-4 text-[#1D4ED8] shrink-0" aria-hidden="true" />
            <span className="font-semibold text-[#141821]">{locationLabel}</span>
            {nearestStations[0] && (
              <span className="text-[#525866] font-mono">
                · Nearest stop: {nearestStations[0].station.name} ({nearestStations[0].walkMin} min walk)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Select active transit city hub"
              value={activeCityId}
              onChange={(e) => {
                onChangeActiveCity(e.target.value);
                setHoveredCityId(e.target.value);
              }}
              className="min-h-[38px] bg-[#F8F7F4] border border-[#E2E0DA] rounded-md px-2.5 text-xs font-medium text-[#141821]"
            >
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onRequestLocate}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3 text-xs font-semibold text-[#1D4ED8] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] rounded-md transition-colors whitespace-nowrap"
            >
              <LocateFixed className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Locate Me</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Left Column */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-mono uppercase tracking-widest text-[#1D4ED8]">
                Customer-First Mobility & Travel Companion · 2026 Live Fares
              </p>
              <h1 className="text-3xl sm:text-5xl font-serif font-semibold tracking-tight text-[#141821] leading-[1.1] text-balance">
                Plan, Track & Book India’s Metro, Rail & Bus Networks
              </h1>
              <p className="text-sm sm:text-base text-[#525866] leading-relaxed max-w-xl">
                Open-source OpenStreetMap routing, live IST metro & bus estimates with smart “when to leave” timing, real 2026 ticket fares with direct official booking, Indian Railways corridors, and transit-connected hotel trip planning.
              </p>
            </div>

            {/* Unified Search Input */}
            <div className="relative max-w-xl">
              <div className="flex items-center bg-white border border-[#E2E0DA] focus-within:border-[#1D4ED8] rounded-md px-3.5 min-h-[46px] transition-colors">
                <Search className="w-4 h-4 text-[#525866] mr-2.5 shrink-0" aria-hidden="true" />
                <input
                  type="text"
                  value={heroQuery}
                  onChange={(e) => setHeroQuery(e.target.value)}
                  placeholder="Search city, metro, Vande Bharat train, or operator..."
                  className="w-full text-sm text-[#141821] placeholder:text-[#7D8491] bg-transparent focus:outline-none"
                />
              </div>
              {quickSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-[#E2E0DA] rounded-md shadow-lg z-30 divide-y divide-[#E2E0DA]">
                  {quickSearchResults.map((item) => (
                    <button
                      key={`${item.type}-${item.label}`}
                      type="button"
                      onClick={() => {
                        setHeroQuery('');
                        if (item.type === 'City') onSelectCity(item.id);
                        else if (item.type === 'System') onSelectSystem(item.id);
                        else onNavigate('planner');
                      }}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-[#F8F7F4] flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-[11px] font-mono uppercase text-[#1D4ED8] mr-2">{item.type}</span>
                        <span className="text-sm font-semibold text-[#141821]">{item.label}</span>
                        <span className="text-xs text-[#525866] ml-2">{item.sub}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#525866]" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Customer-First Quick Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onOpenBooking(activeCityId)}
                className="min-h-[46px] inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md transition-colors whitespace-nowrap"
              >
                <Ticket className="w-4 h-4" aria-hidden="true" />
                <span>Book Official Ticket</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('planner')}
                className="min-h-[46px] inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#141821] bg-white border border-[#E2E0DA] hover:border-[#141821] rounded-md transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 text-[#B45309]" aria-hidden="true" />
                <span>Trip & Hotel Planner</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('map')}
                className="min-h-[46px] inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#141821] hover:text-[#1D4ED8] underline underline-offset-4 decoration-[#C7C2B6] hover:decoration-[#1D4ED8] transition-colors whitespace-nowrap"
              >
                <Compass className="w-4 h-4" aria-hidden="true" />
                <span>OpenStreetMap Atlas</span>
              </button>
            </div>
          </div>

          {/* Right Column: Hero Documentary Photograph */}
          <div className="lg:col-span-6">
            <ImageWithFallback
              src="/src/assets/images/hero_delhi_metro_viaduct_1794759112767.jpg"
              alt="Elevated Indian metro train crossing urban avenue viaduct in New Delhi"
              caption="Fig. 1 — Grade-separated metro viaduct in New Delhi; 395 km operational across Delhi NCR as of 2026."
              aspectClass="aspect-[16/10] lg:h-full"
              className="h-full"
            />
          </div>
        </div>

        {/* 2. National Overview Strip (Strictly Dynamic from Database) */}
        <div className="mt-10 bg-white border border-[#E2E0DA] rounded-lg grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#E2E0DA]">
          <div className="p-4 sm:p-5">
            <div className="text-xs text-[#525866] font-medium">Operational Metro Network (2026)</div>
            <div className="mt-1.5 text-2xl sm:text-3xl font-mono font-semibold tabular-nums text-[#141821]">
              {nationalMetrics.operationalMetroKm.toLocaleString()} km
            </div>
            <div className="mt-1 text-[11px] font-mono text-[#7D8491]">
              +{nationalMetrics.underConstructionMetroKm.toLocaleString()} km under construction · {nationalMetrics.dataAsOf}
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="text-xs text-[#525866] font-medium">Suburban & Intercity Corridors</div>
            <div className="mt-1.5 text-2xl sm:text-3xl font-mono font-semibold tabular-nums text-[#141821]">
              {nationalMetrics.operationalSuburbanKm.toLocaleString()} km
            </div>
            <div className="mt-1 text-[11px] font-mono text-[#7D8491]">
              Suburban EMUs + {indianRailways.length} Featured IRCTC / RRTS routes
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="text-xs text-[#525866] font-medium">Active & Upcoming Cities</div>
            <div className="mt-1.5 text-2xl sm:text-3xl font-mono font-semibold tabular-nums text-[#141821]">
              {nationalMetrics.citiesCovered} + {comingSoonCities.length} Soon
            </div>
            <div className="mt-1 text-[11px] font-mono text-[#7D8491]">
              {nationalMetrics.operationalSystemsCount} operational systems · 8 modes
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="text-xs text-[#525866] font-medium">Verified Stations & Terminals</div>
            <div className="mt-1.5 text-2xl sm:text-3xl font-mono font-semibold tabular-nums text-[#141821]">
              {nationalMetrics.verifiedStationsCount.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] font-mono text-[#7D8491]">
              {nationalMetrics.verifiedLinesCount} mapped lines · Direct QR/NCMC fares
            </div>
          </div>
        </div>
      </section>

      {/* 2A-0. Live Transit Helper — GPS Time-to-Reach & Time-to-Leave-Now Countdown */}
      <LiveTransitHelper
        activeCityId={activeCityId}
        userCoords={userCoords}
        locationLabel={locationLabel}
        onRequestLocate={onRequestLocate}
        onOpenMapCity={onOpenMapCity}
        onOpenBooking={onOpenBooking}
        onNavigate={onNavigate}
      />

      {/* 2A. Customer-First Direct Ticketing & 2026 Fares for Active City */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2E0DA] pb-4 mb-5">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[#1D4ED8]">
              2026 Official Tariff Guide · {activeCity.name}
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-[#141821] mt-1">
              Direct Ticket Booking & Exact Fares
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenBooking(activeCityId)}
            className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#141821] hover:bg-[#1D4ED8] rounded-md transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Open Fare Calculator & All Modes</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCityTickets.map((ticket) => (
            <div
              key={ticket.systemId}
              className="bg-white border border-[#E2E0DA] rounded-lg p-5 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#525866]">
                  <span className="uppercase">{ticket.modeLabel}</span>
                  <span>{ticket.bookingMethod}</span>
                </div>
                <h3 className="text-base font-serif font-semibold text-[#141821] mt-1">
                  {ticket.systemName}
                </h3>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="text-2xl font-mono font-semibold tabular-nums text-[#141821]">
                    ₹{ticket.minFareInr} – ₹{ticket.maxFareInr}
                  </span>
                  {ticket.dayPassInr && (
                    <span className="text-xs font-mono text-[#0F766E]">
                      · Day Pass ₹{ticket.dayPassInr}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-[#525866] leading-relaxed">
                  {ticket.smartCardDiscountNote}
                </p>
              </div>

              <div className="pt-3 border-t border-[#E2E0DA] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onOpenBooking(ticket.cityId, ticket.systemId)}
                  className="min-h-[40px] flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md transition-colors"
                >
                  <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Calculate & Book</span>
                </button>
                <a
                  href={ticket.secondaryBookUrl || ticket.directBookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[40px] inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-[#141821] bg-[#F8F7F4] hover:bg-[#EBE8E1] border border-[#E2E0DA] rounded-md transition-colors whitespace-nowrap"
                >
                  <span>Portal</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2B. Real-time Network Status, Live Vehicles & When-to-Leave Advisor (OpenStreetMap) */}
      <RealTimeNetworkStatus
        activeCityId={activeCityId}
        userCoords={userCoords}
        onRequestLocate={onRequestLocate}
        onSelectSystem={onSelectSystem}
        onSelectCity={onSelectCity}
        onOpenBooking={onOpenBooking}
      />

      {/* 3. Indian Railways (Vande Bharat / RRTS) & Coming Soon Cities */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Indian Railways */}
          <div className="lg:col-span-6 bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E0DA] pb-3">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[#B45309]">
                  Indian Railways & Namo Bharat RRTS
                </p>
                <h2 className="text-xl font-serif font-semibold text-[#141821] mt-0.5">
                  Intercity Rail Corridors & IRCTC Fares
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('planner')}
                className="text-xs font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap"
              >
                All Trains →
              </button>
            </div>

            <div className="divide-y divide-[#E2E0DA]">
              {indianRailways.slice(0, 4).map((train) => (
                <div key={train.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Train className="w-4 h-4 text-[#B45309] shrink-0" aria-hidden="true" />
                      <span className="text-sm font-semibold text-[#141821] truncate">
                        {train.trainName}
                      </span>
                      <span className="text-[11px] font-mono text-[#525866] shrink-0">
                        #{train.trainNumber}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-[#1D4ED8] tabular-nums shrink-0">
                      From ₹{Math.min(...train.faresInr.map((f) => f.priceInr)).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-[#525866] flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {train.fromStation} ({train.departureTimeIst}) → {train.toStation} ({train.arrivalTimeIst}) · {train.durationLabel}
                    </span>
                    <a
                      href={train.irctcUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-[#1D4ED8] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Book on IRCTC</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {train.faresInr.map((cls) => (
                      <span
                        key={cls.className}
                        className="text-[11px] font-mono text-[#141821] bg-[#F8F7F4] border border-[#E2E0DA] rounded px-2 py-0.5 tabular-nums"
                      >
                        {cls.className}: ₹{cls.priceInr.toLocaleString()}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coming Soon Cities */}
          <div className="lg:col-span-6 bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E0DA] pb-3">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[#0F766E]">
                  2026 – 2027 Network Pipeline
                </p>
                <h2 className="text-xl font-serif font-semibold text-[#141821] mt-0.5">
                  Coming Soon Transit Cities
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('map')}
                className="text-xs font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap"
              >
                View on Atlas →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {comingSoonCities.slice(0, 6).map((city) => (
                <div
                  key={city.id}
                  className="p-3.5 bg-[#F8F7F4] border border-[#E2E0DA] rounded-md space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#141821]">{city.name}</span>
                    <span className="text-[11px] font-mono text-[#0F766E]">{city.expectedLaunch}</span>
                  </div>
                  <div className="text-xs font-medium text-[#525866]">
                    {city.systemName} · {city.phase1Km} km
                  </div>
                  <div className="text-[11px] font-mono text-[#7D8491]">
                    {city.currentStage} · Est. {city.estimatedFareRangeInr}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3B. Transit-Connected Hotels & Mindtrip-Style Travel Planner Preview */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2E0DA] pb-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-wider text-[#1D4ED8]">
                Mindtrip-Style Transit & Stay Planner · {activeCity.name}
              </p>
              <h2 className="text-2xl font-serif font-semibold text-[#141821] mt-1">
                Verified Stays Within Walking Distance of Metro & Rail
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('planner')}
              className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Build Full Multi-Day Trip Plan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeCityHotels.slice(0, 3).map((hotel) => (
              <div
                key={hotel.id}
                className="p-4 bg-[#F8F7F4] border border-[#E2E0DA] rounded-md flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#525866]">
                    <span>{hotel.tier}</span>
                    <span>★ {hotel.rating}</span>
                  </div>
                  <h3 className="text-base font-serif font-semibold text-[#141821] mt-1 flex items-start gap-1.5">
                    <Building2 className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{hotel.name}</span>
                  </h3>
                  <p className="text-xs text-[#525866] mt-1">
                    {hotel.neighborhood} · {hotel.walkMinutes} min walk to {hotel.nearestStation} ({hotel.transitLineLabel})
                  </p>
                </div>
                <div className="pt-3 border-t border-[#E2E0DA] flex items-center justify-between">
                  <span className="text-sm font-mono font-semibold text-[#141821] tabular-nums">
                    ₹{hotel.pricePerNightInr.toLocaleString()}/night
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('planner')}
                    className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                  >
                    Add to Itinerary →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Explore by Transport Mode (All 8 Categories) */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2E0DA] pb-4 mb-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[#525866]">Multi-Modal Classification</p>
            <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-[#141821] mt-1">
              Explore by Transport Mode
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('systems')}
            className="text-sm font-medium text-[#1D4ED8] hover:underline whitespace-nowrap"
          >
            View Complete System Directory →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modeSummary.map(({ mode, systemCount, opKm }) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onSelectMode(mode.id)}
              className="text-left bg-white border border-[#E2E0DA] hover:border-[#1D4ED8] rounded-lg p-5 transition-colors flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-[#525866]">
                  <span>0{mode.order}</span>
                  <span className="tabular-nums">
                    {systemCount} {systemCount === 1 ? 'system' : 'systems'}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-serif font-semibold text-[#141821] group-hover:text-[#1D4ED8] transition-colors">
                  {mode.name}
                </h3>
                <p className="mt-2 text-xs text-[#525866] leading-relaxed line-clamp-3">
                  {mode.definition}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E2E0DA] flex items-center justify-between text-xs">
                <span className="font-mono tabular-nums text-[#141821]">
                  {opKm > 0 ? `${opKm.toLocaleString()} km active` : 'Road / Fleet network'}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#525866] group-hover:text-[#1D4ED8]" aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 5. Explore by City — Interactive OpenStreetMap India Preview */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-[#E2E0DA] rounded-lg p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-2">
              <div className="border border-[#E2E0DA] rounded-md overflow-hidden">
                <OpenSourceMap
                  center={[21.5, 79.0]}
                  zoom={4}
                  markers={indiaMapMarkers}
                  heightClass="h-[340px]"
                  showTileSwitcher={true}
                />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-[#525866]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1D4ED8]" /> Active Cities ({cities.length})
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" /> Coming Soon ({comingSoonCities.length})
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B45309]" /> Selected
                </span>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-5">
              <div className="flex flex-wrap items-center gap-1.5">
                {cities.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setHoveredCityId(c.id)}
                    className={`px-2.5 py-1.5 text-xs rounded border transition-colors ${
                      c.id === previewCity.id
                        ? 'bg-[#141821] text-white border-[#141821] font-semibold'
                        : 'bg-[#F8F7F4] text-[#525866] border-[#E2E0DA] hover:text-[#141821]'
                    }`}
                  >
                    {c.name.replace(' (NCR)', '').replace(' (MMR)', '')}
                  </button>
                ))}
              </div>

              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[#525866]">
                  City-Wise Multi-Modal Profiles · {previewCity.state}
                </p>
                <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-[#141821] mt-1">
                  {previewCity.name}
                </h2>
                <p className="mt-2 text-sm text-[#525866] leading-relaxed">
                  {previewCity.overview}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {previewCitySystems.slice(0, 4).map((sys) => (
                  <button
                    key={sys.id}
                    type="button"
                    onClick={() => onSelectSystem(sys.id)}
                    className="text-left p-3.5 bg-[#F8F7F4] hover:bg-[#EBE8E1] border border-[#E2E0DA] rounded-md transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#141821] truncate">{sys.name}</span>
                      <span className="text-xs font-mono tabular-nums text-[#141821] shrink-0">
                        {sys.operationalLengthKm > 0 ? `${sys.operationalLengthKm} km` : 'Bus/Feeder'}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <StatusLabel status={sys.status} />
                      <span className="text-[11px] font-mono text-[#525866]">{sys.fareRangeInr}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onSelectCity(previewCity.id)}
                  className="min-h-[42px] px-4 py-2 text-xs font-semibold text-white bg-[#141821] hover:bg-[#1D4ED8] rounded-md transition-colors"
                >
                  Open {previewCity.name} 15-Section Profile
                </button>
                <button
                  type="button"
                  onClick={() => onOpenMapCity(previewCity.id)}
                  className="min-h-[42px] px-4 py-2 text-xs font-semibold text-[#141821] bg-white border border-[#E2E0DA] hover:border-[#141821] rounded-md transition-colors"
                >
                  Inspect Corridor Map
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Featured Transit Networks */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2E0DA] pb-4 mb-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[#525866]">Case Studies Across Modes</p>
            <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-[#141821] mt-1">
              Featured Transit Networks
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredNetworks.map((feat) => {
            const sys = systems.find((s) => s.id === feat.systemId);
            if (!sys) return null;
            const city = cities.find((c) => c.id === sys.cityId);
            return (
              <article
                key={sys.id}
                className="bg-white border border-[#E2E0DA] rounded-lg overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <ImageWithFallback
                    src={feat.image}
                    alt={sys.name}
                    aspectClass="aspect-[4/3]"
                  />
                  <div className="p-4 space-y-2">
                    <div className="text-xs text-[#525866] font-mono">
                      {city?.name} · {sys.operationalLengthKm} km · {sys.fareRangeInr}
                    </div>
                    <h3 className="text-lg font-serif font-semibold text-[#141821]">
                      {sys.name}
                    </h3>
                    <p className="text-xs text-[#525866] leading-relaxed line-clamp-3">
                      {sys.summary}
                    </p>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-2 border-t border-[#E2E0DA] flex items-center justify-between">
                  <StatusLabel status={sys.status} />
                  <button
                    type="button"
                    onClick={() => onSelectSystem(sys.id)}
                    className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                  >
                    Read Profile →
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 7. Network Statistics Preview & Latest Milestones */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Chart */}
          <div className="lg:col-span-7 bg-white border border-[#E2E0DA] rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <p className="text-xs font-mono text-[#525866]">Operational vs Under Construction (km)</p>
                <h2 className="text-xl font-serif font-semibold text-[#141821]">
                  Major Metro Rail Networks by Route Length
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('analytics')}
                className="text-xs font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap"
              >
                Full Analytics →
              </button>
            </div>
            <div className="h-[290px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMetroChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EBE8E1" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#525866' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#525866' }} unit=" km" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E0DA',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="operational" name="Operational (km)" fill="#1D4ED8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="underConstruction" name="Under Construction (km)" fill="#B45309" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs text-[#525866]">
              Operational and under-construction lengths are charted as separate series in accordance with India Transit Atlas classification rules.
            </p>
          </div>

          {/* Latest Historical Milestones & Methodology */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif font-semibold text-[#141821]">Recent Transit Milestones</h2>
                <button
                  type="button"
                  onClick={() => onNavigate('research')}
                  className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                >
                  Timeline →
                </button>
              </div>
              <div className="divide-y divide-[#E2E0DA]">
                {milestones.slice(-4).reverse().map((m) => (
                  <div key={m.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="text-xs font-mono text-[#1D4ED8]">{m.dateLabel}</div>
                    <div className="text-sm font-semibold text-[#141821] mt-0.5">{m.title}</div>
                    <p className="text-xs text-[#525866] mt-1 leading-relaxed">{m.summary}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#EBE8E1]/60 border border-[#E2E0DA] rounded-lg p-5 space-y-2">
              <h3 className="text-sm font-semibold text-[#141821]">Research Methodology & Verification</h3>
              <p className="text-xs text-[#525866] leading-relaxed">
                Every statistic and fare table is dated and attributed to official operator reports (DMRC, BMRCL, CMRL, KMRL, MMRDA, Indian Railways IRCTC/UTS) or MoHUA compendiums. Proposed and under-construction corridors are separated from operational totals.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('research')}
                className="text-xs font-semibold text-[#1D4ED8] hover:underline"
              >
                Inspect Sources & Data Registry →
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
