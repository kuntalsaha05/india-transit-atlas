import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  CITY_HOTELS,
  COMING_SOON_CITIES,
  INDIAN_RAILWAY_CORRIDORS,
  SYSTEM_TICKETING_INFO,
} from '../data/consumerTravelData';
import {
  CITIES,
  EXPANSION_PROJECTS,
  HISTORICAL_MILESTONES,
  RIDERSHIP_SNAPSHOTS,
  SOURCES,
  STATIONS,
  TRANSIT_LINES,
  TRANSIT_MODES,
  TRANSIT_SYSTEMS,
} from '../data/transitDatabase';
import {
  City,
  ComingSoonCity,
  ExpansionProject,
  HistoricalMilestone,
  HotelStay,
  IndianRailwayCorridor,
  ModeId,
  RidershipSnapshot,
  SourceRecord,
  Station,
  SystemTicketingProfile,
  TransitLine,
  TransitModeInfo,
  TransitSystem,
} from '../types/transit';

interface StoredRegistryState {
  cities: City[];
  comingSoonCities?: ComingSoonCity[];
  systems: TransitSystem[];
  lines: TransitLine[];
  stations: Station[];
  projects: ExpansionProject[];
  sources: SourceRecord[];
}

const STORAGE_KEY = 'india_transit_atlas_registry_v2';

interface TransitDataContextValue {
  modes: TransitModeInfo[];
  cities: City[];
  comingSoonCities: ComingSoonCity[];
  systems: TransitSystem[];
  lines: TransitLine[];
  stations: Station[];
  projects: ExpansionProject[];
  milestones: HistoricalMilestone[];
  ridershipSnapshots: RidershipSnapshot[];
  sources: SourceRecord[];
  ticketingProfiles: SystemTicketingProfile[];
  indianRailways: IndianRailwayCorridor[];
  hotels: HotelStay[];
  nationalMetrics: {
    operationalMetroKm: number;
    underConstructionMetroKm: number;
    operationalSuburbanKm: number;
    operationalBrtsKm: number;
    operationalWaterKm: number;
    operationalTramKm: number;
    operationalMonorailKm: number;
    operationalSystemsCount: number;
    citiesCovered: number;
    verifiedStationsCount: number;
    verifiedLinesCount: number;
    dataAsOf: string;
  };
  getCityById: (id: string) => City | undefined;
  getSystemById: (id: string) => TransitSystem | undefined;
  getModeById: (id: ModeId) => TransitModeInfo | undefined;
  getSourcesByIds: (ids: string[]) => SourceRecord[];
  getTicketingForSystem: (systemId: string) => SystemTicketingProfile | undefined;
  addSystem: (system: TransitSystem) => void;
  addLine: (line: TransitLine) => void;
  addStation: (station: Station) => void;
  addSource: (source: SourceRecord) => void;
  resetRegistry: () => void;
  hasCustomEntries: boolean;
}

const TransitDataContext = createContext<TransitDataContextValue | null>(null);

export const TransitDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [registry, setRegistry] = useState<StoredRegistryState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredRegistryState;
        if (parsed && Array.isArray(parsed.cities) && Array.isArray(parsed.systems)) {
          return {
            ...parsed,
            comingSoonCities:
              Array.isArray(parsed.comingSoonCities) && parsed.comingSoonCities.length >= COMING_SOON_CITIES.length
                ? parsed.comingSoonCities
                : COMING_SOON_CITIES,
          };
        }
      }
    } catch {
      // ignore storage errors
    }
    return {
      cities: CITIES,
      comingSoonCities: COMING_SOON_CITIES,
      systems: TRANSIT_SYSTEMS,
      lines: TRANSIT_LINES,
      stations: STATIONS,
      projects: EXPANSION_PROJECTS,
      sources: SOURCES,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
    } catch {
      // ignore storage quota errors
    }
  }, [registry]);

  const hasCustomEntries = useMemo(() => {
    return (
      registry.systems.length !== TRANSIT_SYSTEMS.length ||
      registry.lines.length !== TRANSIT_LINES.length ||
      registry.stations.length !== STATIONS.length ||
      registry.sources.length !== SOURCES.length
    );
  }, [registry]);

  const nationalMetrics = useMemo(() => {
    const isOperationalLike = (status: string) =>
      status === 'Operational' || status === 'Partially Operational';

    const sumOperationalByMode = (modeId: ModeId) =>
      registry.systems
        .filter((s) => s.modeId === modeId && isOperationalLike(s.status))
        .reduce((acc, s) => acc + s.operationalLengthKm, 0);

    const operationalMetroKm = sumOperationalByMode('metro-rail');
    const underConstructionMetroKm = registry.systems
      .filter((s) => s.modeId === 'metro-rail')
      .reduce((acc, s) => acc + s.underConstructionKm, 0);

    const operationalSuburbanKm = sumOperationalByMode('suburban-rail');
    const operationalBrtsKm = sumOperationalByMode('brts');
    const operationalWaterKm = sumOperationalByMode('water-transit');
    const operationalTramKm = sumOperationalByMode('tramways');
    const operationalMonorailKm = sumOperationalByMode('monorail-light-rail');

    const operationalSystemsCount = registry.systems.filter((s) => isOperationalLike(s.status)).length;
    const verifiedStationsCount = registry.systems.reduce((acc, s) => acc + (s.modeId === 'city-bus' ? 0 : s.totalStations), 0);

    return {
      operationalMetroKm: Number(operationalMetroKm.toFixed(1)),
      underConstructionMetroKm: Number(underConstructionMetroKm.toFixed(1)),
      operationalSuburbanKm: Number(operationalSuburbanKm.toFixed(1)),
      operationalBrtsKm: Number(operationalBrtsKm.toFixed(1)),
      operationalWaterKm: Number(operationalWaterKm.toFixed(1)),
      operationalTramKm: Number(operationalTramKm.toFixed(1)),
      operationalMonorailKm: Number(operationalMonorailKm.toFixed(1)),
      operationalSystemsCount,
      citiesCovered: registry.cities.length,
      verifiedStationsCount,
      verifiedLinesCount: registry.lines.length,
      dataAsOf: '15 Nov 2026',
    };
  }, [registry]);

  const getCityById = (id: string) => registry.cities.find((c) => c.id === id);
  const getSystemById = (id: string) => registry.systems.find((s) => s.id === id);
  const getModeById = (id: ModeId) => TRANSIT_MODES.find((m) => m.id === id);
  const getSourcesByIds = (ids: string[]) =>
    registry.sources.filter((src) => ids.includes(src.id));
  const getTicketingForSystem = (systemId: string) =>
    SYSTEM_TICKETING_INFO.find((t) => t.systemId === systemId);

  const addSystem = (system: TransitSystem) => {
    setRegistry((prev) => ({
      ...prev,
      systems: [system, ...prev.systems],
    }));
  };

  const addLine = (line: TransitLine) => {
    setRegistry((prev) => ({
      ...prev,
      lines: [line, ...prev.lines],
      systems: prev.systems.map((sys) =>
        sys.id === line.systemId && (line.status === 'Operational' || line.status === 'Partially Operational')
          ? {
              ...sys,
              operationalLengthKm: Number((sys.operationalLengthKm + line.lengthKm).toFixed(2)),
              totalStations: sys.totalStations + line.stationCount,
            }
          : sys
      ),
    }));
  };

  const addStation = (station: Station) => {
    setRegistry((prev) => ({
      ...prev,
      stations: [station, ...prev.stations],
    }));
  };

  const addSource = (source: SourceRecord) => {
    setRegistry((prev) => ({
      ...prev,
      sources: [source, ...prev.sources],
    }));
  };

  const resetRegistry = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRegistry({
      cities: CITIES,
      comingSoonCities: COMING_SOON_CITIES,
      systems: TRANSIT_SYSTEMS,
      lines: TRANSIT_LINES,
      stations: STATIONS,
      projects: EXPANSION_PROJECTS,
      sources: SOURCES,
    });
  };

  return (
    <TransitDataContext.Provider
      value={{
        modes: TRANSIT_MODES,
        cities: registry.cities,
        comingSoonCities: registry.comingSoonCities ?? COMING_SOON_CITIES,
        systems: registry.systems,
        lines: registry.lines,
        stations: registry.stations,
        projects: registry.projects,
        milestones: HISTORICAL_MILESTONES,
        ridershipSnapshots: RIDERSHIP_SNAPSHOTS,
        sources: registry.sources,
        ticketingProfiles: SYSTEM_TICKETING_INFO,
        indianRailways: INDIAN_RAILWAY_CORRIDORS,
        hotels: CITY_HOTELS,
        nationalMetrics,
        getCityById,
        getSystemById,
        getModeById,
        getSourcesByIds,
        getTicketingForSystem,
        addSystem,
        addLine,
        addStation,
        addSource,
        resetRegistry,
        hasCustomEntries,
      }}
    >
      {children}
    </TransitDataContext.Provider>
  );
};

export function useTransitData() {
  const ctx = useContext(TransitDataContext);
  if (!ctx) {
    throw new Error('useTransitData must be used inside TransitDataProvider');
  }
  return ctx;
}
