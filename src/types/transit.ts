export type OperationalStatus =
  | 'Operational'
  | 'Partially Operational'
  | 'Under Construction'
  | 'Approved'
  | 'Proposed'
  | 'Suspended / Dismantled';

export type VerificationStatus =
  | 'Primary Government'
  | 'Operator Report'
  | 'Verified Research'
  | 'Provisional';

export type ModeId =
  | 'metro-rail'
  | 'suburban-rail'
  | 'city-bus'
  | 'brts'
  | 'tramways'
  | 'monorail-light-rail'
  | 'water-transit'
  | 'feeder-intermediate';

export interface SourceRecord {
  id: string;
  title: string;
  publisher: string;
  documentType: string;
  publicationDate: string;
  accessedAt: string;
  reportingPeriod: string;
  url: string;
  verificationStatus: VerificationStatus;
}

export interface TransitModeInfo {
  id: ModeId;
  order: number;
  name: string;
  shortName: string;
  definition: string;
  scopeBoundary: string;
  nationalContext: string;
  keyCharacteristics: string[];
  imagePath?: string;
}

export interface City {
  id: string;
  name: string;
  state: string;
  region: 'North' | 'West' | 'South' | 'East' | 'Central';
  urbanAgglomerationPopM: number;
  urbanAreaSqKm: number;
  coordinates: [number, number]; // [lat, lng]
  overview: string;
  historicalBackground: string;
  connectivityNotes: string;
  challenges: string[];
  futureOutlook: string;
  dataAsOf: string;
  sourceIds: string[];
}

export interface TransitSystem {
  id: string;
  cityId: string;
  modeId: ModeId;
  name: string;
  shortName: string;
  operator: string;
  ownershipModel: string;
  operationalSince: string;
  status: OperationalStatus;
  operationalLengthKm: number;
  underConstructionKm: number;
  approvedKm: number;
  proposedKm: number;
  totalStations: number;
  elevatedKm: number;
  undergroundKm: number;
  atGradeKm: number;
  trackGauge: string;
  electrification: string;
  signallingSystem: string;
  atoLevel: string;
  rollingStockSummary: string;
  fleetCountLabel: string;
  operatingHours: string;
  headwayPeakMin: string;
  fareRangeInr: string;
  ticketingSystems: string[];
  dailyRidershipAvg: number | null;
  ridershipDate: string;
  annualRidershipNote: string;
  projectCostNote: string;
  environmentalNotes: string;
  safetySystems: string;
  accessibilityNotes: string;
  intermodalIntegration: string;
  summary: string;
  dataAsOf: string;
  verificationStatus: VerificationStatus;
  sourceIds: string[];
}

export interface TransitLine {
  id: string;
  systemId: string;
  cityId: string;
  name: string;
  lineCode: string;
  colorHex: string;
  startStation: string;
  terminalStation: string;
  lengthKm: number;
  stationCount: number;
  openingDate: string;
  status: OperationalStatus;
  trackGauge: string;
  electrification: string;
  rollingStock: string;
  signalling: string;
  interchanges: string[];
  coordinatesPath: [number, number][]; // [lat, lng][]
  notes: string;
}

export interface Station {
  id: string;
  name: string;
  cityId: string;
  systemId: string;
  lineIds: string[];
  latitude: number;
  longitude: number;
  stationType: 'Elevated' | 'Underground' | 'At-Grade' | 'Ferry Terminal' | 'Median BRT' | 'Suburban Terminal';
  isInterchange: boolean;
  interchangeModes: string[];
  accessibilityFeatures: string[];
  facilities: string[];
  openedYear: number;
  status: OperationalStatus;
}

export interface ExpansionProject {
  id: string;
  title: string;
  cityId: string;
  modeId: ModeId;
  systemId?: string;
  corridorDetails: string;
  lengthKm: number;
  stationsPlanned: number | null;
  status: 'Under Construction' | 'Approved' | 'Proposed';
  expectedTimeline: string;
  estimatedCostCr: string;
  implementingAgency: string;
  dataAsOf: string;
  sourceId: string;
}

export interface HistoricalMilestone {
  id: string;
  year: number;
  dateLabel: string;
  title: string;
  cityId: string;
  modeId: ModeId;
  summary: string;
  significance: string;
  sourceId: string;
}

export interface RidershipSnapshot {
  id: string;
  systemId: string;
  cityId: string;
  periodLabel: string;
  recordedDate: string;
  dailyAvgPassengers: number;
  annualPassengersNote: string;
  sourceId: string;
}

export interface FareSlab {
  distanceLabel: string;
  standardInr: number;
  smartCardOrNcmcInr: number;
  acOrPremiumInr?: number;
}

export interface SystemTicketingProfile {
  systemId: string;
  cityId: string;
  systemName: string;
  modeLabel: string;
  minFareInr: number;
  maxFareInr: number;
  dayPassInr?: number;
  smartCardDiscountNote: string;
  bookingChannelName: string;
  bookingMethod: 'Official Web Portal' | 'WhatsApp QR' | 'UTS Mobile / IRCTC' | 'City Bus App / UPI';
  directBookUrl: string;
  secondaryBookUrl?: string;
  whatsappNumber?: string;
  fareSlabs: FareSlab[];
}

export interface IndianRailwayCorridor {
  id: string;
  trainNumber: string;
  trainName: string;
  trainType: 'Vande Bharat' | 'Rajdhani' | 'Shatabdi' | 'Intercity Express' | 'Namo Bharat RRTS' | 'Duronto';
  fromCityId: string;
  toCityId: string;
  fromStation: string;
  toStation: string;
  distanceKm: number;
  durationLabel: string;
  departureTimeIst: string;
  arrivalTimeIst: string;
  frequency: string;
  faresInr: {
    className: string;
    priceInr: number;
  }[];
  irctcUrl: string;
  utsAvailable?: boolean;
  coordinatesPath: [number, number][];
}

export interface ComingSoonCity {
  id: string;
  name: string;
  state: string;
  systemName: string;
  operator: string;
  coordinates: [number, number];
  phase1Km: number;
  stationsPlanned: number;
  expectedLaunch: string;
  currentStage: 'Trial Runs Active' | 'Systems & Viaduct Finishing' | 'Civil Construction' | 'Approved / DPR';
  estimatedFareRangeInr: string;
  summary: string;
  corridors: string;
  relatedCityId?: string;
  projectCategory?: 'New City Network' | 'Phase 2 / Major Extension';
}

export interface HotelStay {
  id: string;
  cityId: string;
  name: string;
  neighborhood: string;
  tier: 'Budget' | 'Mid-Range' | 'Premium';
  pricePerNightInr: number;
  nearestStation: string;
  walkMinutes: number;
  transitLineLabel: string;
  coordinates: [number, number];
  rating: number;
  highlights: string;
  bookingUrl: string;
}

export interface LiveTransitVehicle {
  id: string;
  cityId: string;
  systemId: string;
  systemName: string;
  mode: 'metro' | 'bus' | 'rail';
  routeLabel: string;
  lineColor: string;
  headsign: string;
  lat: number;
  lng: number;
  nextStopName: string;
  etaNextStopMin: number;
  headwayMin: number;
  occupancy: 'Low' | 'Moderate' | 'High';
  speedKmh: number;
  statusText: string;
}

export type AtlasPage =
  | 'home'
  | 'planner'
  | 'map'
  | 'systems'
  | 'cities'
  | 'analytics'
  | 'research';
