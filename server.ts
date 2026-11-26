import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface NetworkAlertItem {
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

const KNOWN_NETWORK_ALERTS: NetworkAlertItem[] = [
  {
    id: 'alert-mum-sub-megablock',
    systemId: 'sys-mumbai-suburban',
    cityId: 'mumbai',
    cityName: 'Mumbai (MMR)',
    systemName: 'Mumbai Suburban Railway',
    affectedCorridor: 'Central Main & Harbour Lines (CSMT – Thane / Vashi)',
    severity: 'Ongoing Maintenance',
    statusWindow: 'Scheduled Sunday Engineering Mega Blocks (10:30 – 15:30 IST)',
    summary:
      'Daytime engineering, overhead equipment (OHE), and track-renewal mega blocks divert fast-line suburban services onto slow tracks between Matunga–Mulund and Mankhurd–Nerul.',
    sourceAgency: 'Central Railway / Western Railway Bulletins',
    sourceUrl: 'https://mrvc.indianrailways.gov.in',
    updatedAt: '2026-11-15',
    coordinates: { lat: 19.0178, lng: 72.8432 },
  },
  {
    id: 'alert-del-p4-interface',
    systemId: 'sys-delhi-metro',
    cityId: 'delhi',
    cityName: 'Delhi (NCR)',
    systemName: 'Delhi Metro & Namo Bharat',
    affectedCorridor: 'Magenta & Pink Line Phase-IV Integration Works',
    severity: 'Ongoing Maintenance',
    statusWindow: 'Planned Night & Off-Peak Signalling Windows',
    summary:
      'Temporary speed restrictions and brief off-peak headway adjustments occur near Janakpuri West and Majlis Park–Maujpur Phase-IV turnout tie-ins during CBTC signalling integration.',
    sourceAgency: 'DMRC Service Advisories',
    sourceUrl: 'https://www.delhimetrorail.com',
    updatedAt: '2026-11-15',
    coordinates: { lat: 28.6289, lng: 77.0778 },
  },
  {
    id: 'alert-kol-green-partial',
    systemId: 'sys-kolkata-metro',
    cityId: 'kolkata',
    cityName: 'Kolkata',
    systemName: 'Kolkata Metro',
    affectedCorridor: 'Green Line (Esplanade – Sealdah Bowbazar Link) & Tram Routes',
    severity: 'Partial Operation',
    statusWindow: 'Active Corridor Trials / Heritage Tram Diversions',
    summary:
      'Bowbazar crossover safety upgrades and Yellow/Orange Line airport extension commissioning cause periodic off-peak headway variations; select streetcar tram corridors remain suspended.',
    sourceAgency: 'Metro Railway, Kolkata & WBTC',
    sourceUrl: 'https://mtp.indianrailways.gov.in',
    updatedAt: '2026-11-15',
    coordinates: { lat: 22.5646, lng: 88.3516 },
  },
  {
    id: 'alert-blr-purple-yellow',
    systemId: 'sys-bengaluru-metro',
    cityId: 'bengaluru',
    cityName: 'Bengaluru',
    systemName: 'Namma Metro',
    affectedCorridor: 'RV Road – Electronic City Yellow Line & Pink Line Interface',
    severity: 'Advisory',
    statusWindow: 'Weekend CBTC Headway Optimization & Airport Line Pier Works',
    summary:
      'Outer Ring Road / Silk Board Blue Line viaduct launching restricts arterial bus lanes overnight while Yellow Line (RV Road–Bommasandra) continues rolling-stock headway ramp-up.',
    sourceAgency: 'BMRCL Operations Notices',
    sourceUrl: 'https://english.bmrc.co.in',
    updatedAt: '2026-11-15',
    coordinates: { lat: 12.9177, lng: 77.6238 },
  },
  {
    id: 'alert-chn-phase2-diversions',
    systemId: 'sys-chennai-metro',
    cityId: 'chennai',
    cityName: 'Chennai',
    systemName: 'Chennai Metro & MRTS',
    affectedCorridor: 'Velachery – St. Thomas Mount MRTS & OMR Phase-II',
    severity: 'Service Disruption',
    statusWindow: 'Ongoing Civil Viaduct & Arterial Traffic Diversions',
    summary:
      'Surface MTC bus route diversions remain active along OMR/Arcot Road Phase-II viaduct zones; Poonamallee–Porur priority test runs operate on intermittent daytime blocks.',
    sourceAgency: 'CMRL & Southern Railway',
    sourceUrl: 'https://chennaimetrorail.org',
    updatedAt: '2026-11-15',
    coordinates: { lat: 13.0042, lng: 80.2015 },
  },
  {
    id: 'alert-koc-water-tidal',
    systemId: 'sys-kochi-water',
    cityId: 'kochi',
    cityName: 'Kochi',
    systemName: 'Kochi Water Metro',
    affectedCorridor: 'High Court – Vypin – Fort Kochi & Vyttila Backwater Channels',
    severity: 'Advisory',
    statusWindow: 'Tidal & Backwater Channel Speed Advisories',
    summary:
      'Occasional 5–10 minute headway adjustments along Vyttila–Kakkanad and Fort Kochi channels during peak tidal currents and floating water-hyacinth clearance operations.',
    sourceAgency: 'Kochi Water Metro Ltd. (KWML)',
    sourceUrl: 'https://kochimetro.org',
    updatedAt: '2026-11-15',
    coordinates: { lat: 9.9772, lng: 76.2747 },
  },
  {
    id: 'alert-ir-fog-winter',
    systemId: 'sys-delhi-metro',
    cityId: 'delhi',
    cityName: 'North India Rail Grid',
    systemName: 'Indian Railways (Northern / NCR Zone)',
    affectedCorridor: 'Delhi – Agra – Kanpur – Lucknow – Varanasi Mainline',
    severity: 'Advisory',
    statusWindow: 'Winter Fog Safety Speed Regulation (Nov–Feb)',
    summary:
      'Fog-safety devices deployed on Vande Bharat, Rajdhani, and Shatabdi rakes; overnight express arrivals into New Delhi / Anand Vihar may carry 15–45 min buffer delays.',
    sourceAgency: 'Indian Railways NTES / IRCTC',
    sourceUrl: 'https://enquiry.indianrail.gov.in',
    updatedAt: '2026-11-15',
    coordinates: { lat: 28.6419, lng: 77.2194 },
  },
];

interface CorridorSeed {
  id: string;
  cityId: string;
  systemId: string;
  systemName: string;
  mode: 'metro' | 'bus' | 'rail';
  routeLabel: string;
  lineColor: string;
  headsignA: string;
  headsignB: string;
  headwayMin: number;
  speedKmh: number;
  stops: { name: string; lat: number; lng: number }[];
}

const LIVE_CORRIDOR_SEEDS: CorridorSeed[] = [
  {
    id: 'del-yellow',
    cityId: 'delhi',
    systemId: 'sys-delhi-metro',
    systemName: 'Delhi Metro Yellow Line',
    mode: 'metro',
    routeLabel: 'Yellow Line (Line 2)',
    lineColor: '#EAB308',
    headsignA: 'Millennium City Centre Gurugram',
    headsignB: 'Samaypur Badli',
    headwayMin: 3,
    speedKmh: 38,
    stops: [
      { name: 'Kashmere Gate', lat: 28.6675, lng: 77.2282 },
      { name: 'New Delhi', lat: 28.6419, lng: 77.2194 },
      { name: 'Rajiv Chowk', lat: 28.6328, lng: 77.2197 },
      { name: 'Hauz Khas', lat: 28.5434, lng: 77.2067 },
      { name: 'Millennium City Centre', lat: 28.4595, lng: 77.0724 },
    ],
  },
  {
    id: 'del-blue',
    cityId: 'delhi',
    systemId: 'sys-delhi-metro',
    systemName: 'Delhi Metro Blue Line',
    mode: 'metro',
    routeLabel: 'Blue Line (Line 3)',
    lineColor: '#2563EB',
    headsignA: 'Noida Electronic City',
    headsignB: 'Dwarka Sec-21',
    headwayMin: 4,
    speedKmh: 36,
    stops: [
      { name: 'Dwarka Sec-21', lat: 28.5522, lng: 77.0583 },
      { name: 'Janakpuri West', lat: 28.6295, lng: 77.0777 },
      { name: 'Rajiv Chowk', lat: 28.6328, lng: 77.2197 },
      { name: 'Mandi House', lat: 28.6259, lng: 77.2341 },
      { name: 'Noida Electronic City', lat: 28.6288, lng: 77.3725 },
    ],
  },
  {
    id: 'del-dtc-e44',
    cityId: 'delhi',
    systemId: 'sys-delhi-dtc',
    systemName: 'DTC Electric Route E-44',
    mode: 'bus',
    routeLabel: 'DTC AC Electric Ring Shuttle',
    lineColor: '#0F766E',
    headsignA: 'ISBT Kashmere Gate',
    headsignB: 'AIIMS / Nehru Place',
    headwayMin: 9,
    speedKmh: 22,
    stops: [
      { name: 'Kashmere Gate ISBT', lat: 28.6675, lng: 77.2282 },
      { name: 'ITO Metro', lat: 28.6284, lng: 77.241 },
      { name: 'India Gate', lat: 28.6129, lng: 77.2295 },
      { name: 'AIIMS Ring Road', lat: 28.5672, lng: 77.21 },
    ],
  },
  {
    id: 'mum-aqua3',
    cityId: 'mumbai',
    systemId: 'sys-mumbai-metro',
    systemName: 'Mumbai Metro Aqua Line 3',
    mode: 'metro',
    routeLabel: 'Aqua Line 3',
    lineColor: '#0284C7',
    headsignA: 'Cuffe Parade / CSMT',
    headsignB: 'Aarey JVLR',
    headwayMin: 5,
    speedKmh: 40,
    stops: [
      { name: 'Aarey JVLR', lat: 19.1436, lng: 72.8788 },
      { name: 'CSMIA T2 Airport', lat: 19.0994, lng: 72.8744 },
      { name: 'BKC Metro', lat: 19.0653, lng: 72.8624 },
      { name: 'Dadar Metro', lat: 19.0178, lng: 72.8432 },
      { name: 'CSMT / Cuffe Parade', lat: 18.9398, lng: 72.8355 },
    ],
  },
  {
    id: 'mum-wr-local',
    cityId: 'mumbai',
    systemId: 'sys-mumbai-suburban',
    systemName: 'Mumbai Western Suburban AC/Fast',
    mode: 'rail',
    routeLabel: 'Western Fast EMU',
    lineColor: '#B91C1C',
    headsignA: 'Churchgate',
    headsignB: 'Borivali / Virar',
    headwayMin: 4,
    speedKmh: 46,
    stops: [
      { name: 'Churchgate', lat: 18.9322, lng: 72.8264 },
      { name: 'Dadar Western', lat: 19.0185, lng: 72.8431 },
      { name: 'Bandra', lat: 19.0544, lng: 72.8402 },
      { name: 'Andheri', lat: 19.1197, lng: 72.8464 },
      { name: 'Borivali', lat: 19.2291, lng: 72.8573 },
    ],
  },
  {
    id: 'mum-best-a1',
    cityId: 'mumbai',
    systemId: 'sys-mumbai-best',
    systemName: 'BEST Electric Double-Decker A-1',
    mode: 'bus',
    routeLabel: 'BEST A-1 Electric',
    lineColor: '#DC2626',
    headsignA: 'Colaba Electric House',
    headsignB: 'Bandra Reclamation',
    headwayMin: 10,
    speedKmh: 20,
    stops: [
      { name: 'Colaba', lat: 18.9217, lng: 72.8332 },
      { name: 'CSMT Bus Bay', lat: 18.9401, lng: 72.8354 },
      { name: 'Worli Sea Face', lat: 19.0098, lng: 72.8156 },
      { name: 'Bandra West', lat: 19.0544, lng: 72.8335 },
    ],
  },
  {
    id: 'blr-purple',
    cityId: 'bengaluru',
    systemId: 'sys-bengaluru-metro',
    systemName: 'Namma Metro Purple Line',
    mode: 'metro',
    routeLabel: 'Purple Line',
    lineColor: '#7E22CE',
    headsignA: 'Whitefield (Kadugodi)',
    headsignB: 'Challaghatta',
    headwayMin: 5,
    speedKmh: 38,
    stops: [
      { name: 'Whitefield (Kadugodi)', lat: 12.9958, lng: 77.7575 },
      { name: 'KR Pura', lat: 13.0001, lng: 77.6776 },
      { name: 'MG Road', lat: 12.9756, lng: 77.6066 },
      { name: 'Majestic', lat: 12.9756, lng: 77.5728 },
      { name: 'Kengeri / Challaghatta', lat: 12.9078, lng: 77.4823 },
    ],
  },
  {
    id: 'blr-yellow',
    cityId: 'bengaluru',
    systemId: 'sys-bengaluru-metro',
    systemName: 'Namma Metro Yellow Line',
    mode: 'metro',
    routeLabel: 'Yellow Line',
    lineColor: '#CA8A04',
    headsignA: 'Bommasandra',
    headsignB: 'RV Road Interchange',
    headwayMin: 10,
    speedKmh: 36,
    stops: [
      { name: 'RV Road', lat: 12.9214, lng: 77.5801 },
      { name: 'Jayadeva Hospital', lat: 12.917, lng: 77.6001 },
      { name: 'Central Silk Board', lat: 12.9177, lng: 77.6238 },
      { name: 'Electronic City', lat: 12.8452, lng: 77.6602 },
      { name: 'Bommasandra', lat: 12.8169, lng: 77.6941 },
    ],
  },
  {
    id: 'blr-bmtc-kia7',
    cityId: 'bengaluru',
    systemId: 'sys-bengaluru-bmtc',
    systemName: 'BMTC Vayu Vajra KIA-7A / 500CA',
    mode: 'bus',
    routeLabel: 'BMTC AC Electric / KIA',
    lineColor: '#0D9488',
    headsignA: 'Kempegowda Int’l Airport',
    headsignB: 'HSR / Majestic',
    headwayMin: 12,
    speedKmh: 26,
    stops: [
      { name: 'Majestic BMTC Bay', lat: 12.9776, lng: 77.5718 },
      { name: 'Hebbal Flyover', lat: 13.0358, lng: 77.597 },
      { name: 'Yelahanka', lat: 13.1007, lng: 77.5963 },
      { name: 'KIA Terminal 1/2', lat: 13.1986, lng: 77.7066 },
    ],
  },
  {
    id: 'kol-green',
    cityId: 'kolkata',
    systemId: 'sys-kolkata-metro',
    systemName: 'Kolkata Metro Green Line',
    mode: 'metro',
    routeLabel: 'Green Line Underwater',
    lineColor: '#15803D',
    headsignA: 'Salt Lake Sector V',
    headsignB: 'Howrah Maidan',
    headwayMin: 8,
    speedKmh: 35,
    stops: [
      { name: 'Howrah Maidan', lat: 22.583, lng: 88.3328 },
      { name: 'Howrah Rail', lat: 22.5839, lng: 88.3426 },
      { name: 'Esplanade', lat: 22.5646, lng: 88.3516 },
      { name: 'Sealdah', lat: 22.5673, lng: 88.3705 },
      { name: 'Salt Lake Sector V', lat: 22.5797, lng: 88.4319 },
    ],
  },
  {
    id: 'chn-blue',
    cityId: 'chennai',
    systemId: 'sys-chennai-metro',
    systemName: 'Chennai Metro Blue Line',
    mode: 'metro',
    routeLabel: 'Blue Line (Airport – Wimco Nagar)',
    lineColor: '#1D4ED8',
    headsignA: 'Chennai Int’l Airport',
    headsignB: 'Wimco Nagar',
    headwayMin: 5,
    speedKmh: 37,
    stops: [
      { name: 'Chennai Airport', lat: 12.9809, lng: 80.1636 },
      { name: 'Guindy', lat: 13.0089, lng: 80.2128 },
      { name: 'Thousand Lights', lat: 13.0583, lng: 80.2581 },
      { name: 'Chennai Central', lat: 13.0818, lng: 80.2755 },
    ],
  },
  {
    id: 'hyd-blue',
    cityId: 'hyderabad',
    systemId: 'sys-hyderabad-metro',
    systemName: 'Hyderabad Metro Blue Line',
    mode: 'metro',
    routeLabel: 'Blue Line (Nagole – Raidurg)',
    lineColor: '#2563EB',
    headsignA: 'Raidurg (HITEC)',
    headsignB: 'Nagole',
    headwayMin: 4,
    speedKmh: 36,
    stops: [
      { name: 'Raidurg', lat: 17.4422, lng: 78.3772 },
      { name: 'Ameerpet', lat: 17.4357, lng: 78.4446 },
      { name: 'Secunderabad East', lat: 17.4359, lng: 78.5015 },
      { name: 'Nagole', lat: 17.3908, lng: 78.5587 },
    ],
  },
  {
    id: 'koc-water',
    cityId: 'kochi',
    systemId: 'sys-kochi-water',
    systemName: 'Kochi Water Metro & Metro L1',
    mode: 'metro',
    routeLabel: 'Aluva – Thrippunithura & Ferry',
    lineColor: '#0F766E',
    headsignA: 'Thrippunithura / Fort Kochi',
    headsignB: 'Aluva / High Court',
    headwayMin: 8,
    speedKmh: 34,
    stops: [
      { name: 'Aluva', lat: 10.1098, lng: 76.3496 },
      { name: 'Edappally', lat: 10.0252, lng: 76.3084 },
      { name: 'MG Road', lat: 9.9838, lng: 76.2821 },
      { name: 'Vyttila Mobility Hub', lat: 9.9675, lng: 76.3186 },
    ],
  },
  {
    id: 'adi-brts',
    cityId: 'ahmedabad',
    systemId: 'sys-ahmedabad-brts',
    systemName: 'Ahmedabad Janmarg Electric BRTS',
    mode: 'bus',
    routeLabel: 'Janmarg Trunk 101',
    lineColor: '#EA580C',
    headsignA: 'RTO Circle / Sabarmati',
    headsignB: 'Nehrunagar / Maninagar',
    headwayMin: 5,
    speedKmh: 26,
    stops: [
      { name: 'RTO Circle', lat: 23.0631, lng: 72.573 },
      { name: 'Shivranjani', lat: 23.0241, lng: 72.532 },
      { name: 'Kalupur Rail', lat: 23.0268, lng: 72.6012 },
      { name: 'Maninagar', lat: 22.9964, lng: 72.6032 },
    ],
  },
  {
    id: 'pun-aqua',
    cityId: 'pune',
    systemId: 'sys-pune-metro',
    systemName: 'Pune Metro Aqua Line',
    mode: 'metro',
    routeLabel: 'Aqua Line (Vanaz – Ramwadi)',
    lineColor: '#0284C7',
    headsignA: 'Ramwadi',
    headsignB: 'Vanaz',
    headwayMin: 8,
    speedKmh: 35,
    stops: [
      { name: 'Vanaz', lat: 18.5106, lng: 73.8065 },
      { name: 'Civil Court', lat: 18.5305, lng: 73.8543 },
      { name: 'Pune Railway Station', lat: 18.5289, lng: 73.8745 },
      { name: 'Ramwadi', lat: 18.5535, lng: 73.9135 },
    ],
  },
];

function computeLiveVehiclesForCity(cityId?: string) {
  const nowSec = Math.floor(Date.now() / 1000);
  const istHour = Number(
    new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false })
  );
  const isNightWindow = istHour >= 0 && istHour < 5;

  const seeds = cityId
    ? LIVE_CORRIDOR_SEEDS.filter((s) => s.cityId === cityId)
    : LIVE_CORRIDOR_SEEDS;

  const targetSeeds = seeds.length > 0 ? seeds : LIVE_CORRIDOR_SEEDS.slice(0, 6);
  const vehicles = [];

  for (const seed of targetSeeds) {
    // Emit two opposing vehicles per corridor smoothly progressing along stops
    for (let dirIdx = 0; dirIdx < 2; dirIdx++) {
      const forward = dirIdx === 0;
      const orderedStops = forward ? seed.stops : [...seed.stops].reverse();
      const segCount = orderedStops.length - 1;
      if (segCount < 1) continue;

      const cycleDurationSec = seed.headwayMin * 60 * segCount;
      const offset = (nowSec + dirIdx * Math.floor(cycleDurationSec / 2) + seed.id.length * 37) % cycleDurationSec;
      const progressTotal = (offset / cycleDurationSec) * segCount;
      const segIndex = Math.min(segCount - 1, Math.floor(progressTotal));
      const t = progressTotal - segIndex;

      const a = orderedStops[segIndex];
      const b = orderedStops[segIndex + 1];
      const lat = a.lat + (b.lat - a.lat) * t;
      const lng = a.lng + (b.lng - a.lng) * t;
      const etaNextStopMin = Math.max(1, Math.round((1 - t) * seed.headwayMin + 1));

      const occupancyCycle = (istHour >= 8 && istHour <= 11) || (istHour >= 17 && istHour <= 20)
        ? 'High'
        : dirIdx === 0
        ? 'Moderate'
        : 'Low';

      vehicles.push({
        id: `${seed.id}-veh-${dirIdx}`,
        cityId: seed.cityId,
        systemId: seed.systemId,
        systemName: seed.systemName,
        mode: seed.mode,
        routeLabel: seed.routeLabel,
        lineColor: seed.lineColor,
        headsign: forward ? seed.headsignA : seed.headsignB,
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
        nextStopName: b.name,
        etaNextStopMin: isNightWindow ? 25 : etaNextStopMin,
        headwayMin: seed.headwayMin,
        occupancy: occupancyCycle as 'Low' | 'Moderate' | 'High',
        speedKmh: isNightWindow ? 0 : seed.speedKmh,
        statusText: isNightWindow
          ? 'Night maintenance window · First morning departure at 05:30 IST'
          : `On Time · ${etaNextStopMin} min to ${b.name}`,
      });
    }
  }

  return vehicles;
}

async function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/network-status/alerts', (_req, res) => {
    res.json({
      alerts: KNOWN_NETWORK_ALERTS,
      generatedAt: new Date().toISOString(),
    });
  });

  app.get('/api/live-transit', (req, res) => {
    const cityId = typeof req.query.cityId === 'string' && req.query.cityId !== 'all' ? req.query.cityId : undefined;
    const vehicles = computeLiveVehiclesForCity(cityId);
    res.json({
      vehicles,
      timestampIst: new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    });
  });

  // Live 2026 transit & fare verification via Gemini + Google Search grounding
  app.post('/api/network-status/verify', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'Live search verification requires GEMINI_API_KEY in server secrets.',
      });
      return;
    }

    const body = (req.body ?? {}) as { cityName?: string; topic?: string };
    const cityName = body.cityName?.trim() || 'Delhi NCR';
    const topic = body.topic?.trim() || 'latest metro rail operational lines, ticket prices, suburban trains, and service updates';

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Check the latest 2026 public transport information for ${cityName}, India, focusing on: ${topic}. Provide exact current INR ticket fare slabs, newly opened lines or Indian Railways trains (like Vande Bharat/Namo Bharat), and any major maintenance or route updates. Keep it concise, factual, and organized with bullet points.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources: Array<{ title: string; uri: string }> = [];
      for (const ch of chunks) {
        const web = (ch as { web?: { title?: string; uri?: string } }).web;
        if (web?.uri) {
          sources.push({ title: web.title || web.uri, uri: web.uri });
        }
      }

      res.json({
        cityName,
        topic,
        summaryMarkdown: response.text || 'No live updates returned.',
        sources: sources.slice(0, 8),
        queriedAt: new Date().toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Live verification request failed.';
      res.status(500).json({ error: message });
    }
  });

  // Mindtrip.ai-style Itinerary, Transit & Hotel Planner with real INR pricing & Search Grounding
  app.post('/api/travel-planner/mindtrip', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const body = (req.body ?? {}) as {
      cityName?: string;
      days?: number;
      budgetTier?: string;
      interests?: string;
      originCity?: string;
    };

    const cityName = body.cityName?.trim() || 'Delhi (NCR)';
    const days = Math.min(5, Math.max(1, Number(body.days) || 2));
    const budgetTier = body.budgetTier || 'Mid-Range';
    const interests = body.interests?.trim() || 'heritage landmarks, local food, metro-connected neighborhoods';
    const originCity = body.originCity?.trim() || '';

    if (!apiKey) {
      res.status(503).json({
        error: 'Live Mindtrip AI planning requires GEMINI_API_KEY; use the curated instant itinerary below.',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const prompt = [
      `Create a detailed ${days}-day transit-first travel & hotel itinerary for ${cityName}, India${originCity ? ` (travelling from ${originCity})` : ''}.`,
      `Budget preference: ${budgetTier}. Focus: ${interests}.`,
      `Use 2026 Indian pricing in INR (₹) for every item: Metro/Bus/Water Metro/Suburban rail ticket fares, Indian Railways Vande Bharat/Express options if intercity applies, transit-adjacent hotel nightly rates, and monument/attraction entry fees.`,
      `Return ONLY valid raw JSON (no markdown fences) matching this shape:`,
      `{`,
      `  "tripTitle": "string",`,
      `  "overview": "string",`,
      `  "estimatedTotalInr": number,`,
      `  "costBreakdown": { "transitInr": number, "stayInr": number, "activitiesAndFoodInr": number },`,
      `  "recommendedHotels": [{ "name": "string", "neighborhood": "string", "pricePerNightInr": number, "nearestStation": "string", "walkMinutes": number, "lat": number, "lng": number }],`,
      `  "days": [{ "dayNumber": number, "theme": "string", "stops": [{ "time": "string", "placeName": "string", "transitMode": "string", "nearestStation": "string", "ticketFareInr": number, "entryOrFoodInr": number, "notes": "string", "lat": number, "lng": number }] }]`,
      `}`,
    ].join('\n');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const rawText = (response.text || '').trim();
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      let parsed: unknown = null;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        }
      }

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources: Array<{ title: string; uri: string }> = [];
      for (const ch of chunks) {
        const web = (ch as { web?: { title?: string; uri?: string } }).web;
        if (web?.uri) {
          sources.push({ title: web.title || web.uri, uri: web.uri });
        }
      }

      res.json({
        plan: parsed,
        rawText: parsed ? undefined : rawText,
        sources: sources.slice(0, 8),
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to generate itinerary.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`India Transit Atlas server listening on port ${PORT}`);
  });
}

createApp();
