import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Compass,
  ExternalLink,
  Hotel,
  MapPin,
  Navigation,
  RefreshCw,
  Ticket,
  Train,
} from 'lucide-react';
import { useTransitData } from '../context/TransitDataContext';
import { computeWhenToLeave, haversineKm } from '../utils/geoLocation';
import { OpenMapMarker, OpenMapPolyline, OpenSourceMap } from './OpenSourceMap';

interface TripPlannerViewProps {
  activeCityId: string;
  userCoords: [number, number] | null;
  onChangeCity: (cityId: string) => void;
  onOpenBooking: (cityId?: string, systemId?: string) => void;
}

interface AiItineraryStop {
  time: string;
  placeName: string;
  transitMode: string;
  nearestStation: string;
  ticketFareInr: number;
  entryOrFoodInr: number;
  notes: string;
  lat: number;
  lng: number;
}

interface AiItineraryPlan {
  tripTitle: string;
  overview: string;
  estimatedTotalInr: number;
  costBreakdown: {
    transitInr: number;
    stayInr: number;
    activitiesAndFoodInr: number;
  };
  recommendedHotels: Array<{
    name: string;
    neighborhood: string;
    pricePerNightInr: number;
    nearestStation: string;
    walkMinutes: number;
    lat: number;
    lng: number;
  }>;
  days: Array<{
    dayNumber: number;
    theme: string;
    stops: AiItineraryStop[];
  }>;
}

export const TripPlannerView: React.FC<TripPlannerViewProps> = ({
  activeCityId,
  userCoords,
  onChangeCity,
  onOpenBooking,
}) => {
  const {
    cities,
    stations,
    lines,
    hotels,
    ticketingProfiles,
    indianRailways,
    comingSoonCities,
  } = useTransitData();

  const [plannerTab, setPlannerTab] = useState<'mindtrip' | 'commute' | 'railways'>('mindtrip');
  const [mobileSplit, setMobileSplit] = useState<'list' | 'map'>('list');

  // Mindtrip-style Travel & Hotel State
  const [originCityId, setOriginCityId] = useState<string>('');
  const [days, setDays] = useState<number>(2);
  const [budgetTier, setBudgetTier] = useState<'Budget' | 'Mid-Range' | 'Premium'>('Mid-Range');
  const [interests, setInterests] = useState<string>('heritage architecture, local markets, river/lakefront, street food');

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPlan, setAiPlan] = useState<AiItineraryPlan | null>(null);
  const [aiRawText, setAiRawText] = useState<string | null>(null);
  const [aiSources, setAiSources] = useState<Array<{ title: string; uri: string }>>([]);

  // Point-to-Point Commute & Fare Calculator State
  const activeCity = useMemo(
    () => cities.find((c) => c.id === activeCityId) ?? cities[0],
    [cities, activeCityId]
  );

  const cityStations = useMemo(
    () => stations.filter((s) => s.cityId === activeCity.id),
    [stations, activeCity.id]
  );

  const [fromStationId, setFromStationId] = useState<string>('');
  const [toStationId, setToStationId] = useState<string>('');
  const [walkMin, setWalkMin] = useState<number>(8);

  const fromStation = useMemo(
    () => cityStations.find((s) => s.id === fromStationId) || cityStations[0],
    [cityStations, fromStationId]
  );
  const toStation = useMemo(
    () =>
      cityStations.find((s) => s.id === toStationId) ||
      cityStations[Math.min(1, Math.max(0, cityStations.length - 1))],
    [cityStations, toStationId]
  );

  const cityHotels = useMemo(
    () => hotels.filter((h) => h.cityId === activeCity.id),
    [hotels, activeCity.id]
  );

  const matchingTrains = useMemo(() => {
    if (!originCityId || originCityId === activeCity.id) {
      return indianRailways.filter((t) => t.fromCityId === activeCity.id || t.toCityId === activeCity.id);
    }
    const direct = indianRailways.filter(
      (t) =>
        (t.fromCityId === originCityId && t.toCityId === activeCity.id) ||
        (t.toCityId === originCityId && t.fromCityId === activeCity.id)
    );
    return direct.length > 0
      ? direct
      : indianRailways.filter((t) => t.fromCityId === activeCity.id || t.toCityId === activeCity.id);
  }, [indianRailways, originCityId, activeCity.id]);

  // Curated instant Mindtrip-style plan built from real stations + hotels + ticketing slabs
  const curatedPlan: AiItineraryPlan = useMemo(() => {
    const cityTicketing = ticketingProfiles.filter((t) => t.cityId === activeCity.id);
    const metroTicket = cityTicketing.find((t) => t.modeLabel.includes('Metro')) || cityTicketing[0];
    const dayPassCost = metroTicket?.dayPassInr || (metroTicket ? metroTicket.maxFareInr * 2 : 120);

    const tierHotels = cityHotels.filter((h) => h.tier === budgetTier);
    const pickedHotels = tierHotels.length > 0 ? tierHotels : cityHotels;
    const avgNightRate = pickedHotels[0]?.pricePerNightInr ?? (budgetTier === 'Budget' ? 1600 : budgetTier === 'Premium' ? 14500 : 4800);

    const activitiesPerDay = budgetTier === 'Budget' ? 950 : budgetTier === 'Premium' ? 3800 : 1850;
    const transitTotal = dayPassCost * days;
    const stayTotal = avgNightRate * Math.max(1, days - 1);
    const actTotal = activitiesPerDay * days;

    const dayList = Array.from({ length: days }, (_, idx) => {
      const dayNum = idx + 1;
      const stA = cityStations[idx % Math.max(1, cityStations.length)];
      const stB = cityStations[(idx + 1) % Math.max(1, cityStations.length)];
      const stC = cityStations[(idx + 2) % Math.max(1, cityStations.length)];

      const stops: AiItineraryStop[] = [
        {
          time: '09:00 IST',
          placeName: stA ? `${stA.name} Heritage & Civic Core` : `${activeCity.name} Central District`,
          transitMode: metroTicket?.modeLabel || 'Metro Rail',
          nearestStation: stA?.name || `${activeCity.name} Central`,
          ticketFareInr: metroTicket?.minFareInr ?? 20,
          entryOrFoodInr: budgetTier === 'Budget' ? 250 : 650,
          notes: `Start via ${metroTicket?.systemName || 'local metro'} (${metroTicket?.bookingChannelName || 'QR / NCMC'}).`,
          lat: stA?.latitude ?? activeCity.coordinates[0] + 0.01,
          lng: stA?.longitude ?? activeCity.coordinates[1] - 0.01,
        },
        {
          time: '13:15 IST',
          placeName: stB ? `${stB.name} Cultural & Dining Quarter` : `${activeCity.name} Waterfront / Old Town`,
          transitMode: 'City Bus / Metro Link',
          nearestStation: stB?.name || `${activeCity.name} Interchange`,
          ticketFareInr: Math.round(((metroTicket?.minFareInr ?? 10) + (metroTicket?.maxFareInr ?? 50)) / 2),
          entryOrFoodInr: budgetTier === 'Budget' ? 350 : budgetTier === 'Premium' ? 1800 : 750,
          notes: stB ? `Interchange available with ${stB.interchangeModes.slice(0, 2).join(' & ')}.` : 'Connect via electric feeder shuttle.',
          lat: stB?.latitude ?? activeCity.coordinates[0] - 0.01,
          lng: stB?.longitude ?? activeCity.coordinates[1] + 0.015,
        },
        {
          time: '17:30 IST',
          placeName: stC ? `${stC.name} Evening Promenade` : `${activeCity.name} Sunset Precinct`,
          transitMode: metroTicket?.modeLabel || 'Metro / Feeder',
          nearestStation: stC?.name || `${activeCity.name} Hub`,
          ticketFareInr: metroTicket?.minFareInr ?? 20,
          entryOrFoodInr: budgetTier === 'Budget' ? 350 : budgetTier === 'Premium' ? 1350 : 450,
          notes: 'Off-peak NCMC / Smart Card fare discount applies after 21:00.',
          lat: stC?.latitude ?? activeCity.coordinates[0] + 0.015,
          lng: stC?.longitude ?? activeCity.coordinates[1] + 0.012,
        },
      ];

      return {
        dayNumber: dayNum,
        theme:
          dayNum === 1
            ? `Core Metro Spine & ${activeCity.name} Landmarks`
            : dayNum === 2
            ? 'Interchange Hubs, Local Markets & Evening Corridor'
            : `Outer Corridors & Feeder Discovery — Day ${dayNum}`,
        stops,
      };
    });

    return {
      tripTitle: `${days}-Day Transit-First ${activeCity.name} Itinerary`,
      overview: `Car-free urban exploration across ${activeCity.name} anchored by rapid transit passes (${metroTicket?.systemName || 'Metro & Bus'}) and walkable station-adjacent stays.`,
      estimatedTotalInr: transitTotal + stayTotal + actTotal,
      costBreakdown: {
        transitInr: transitTotal,
        stayInr: stayTotal,
        activitiesAndFoodInr: actTotal,
      },
      recommendedHotels: pickedHotels.map((h) => ({
        name: h.name,
        neighborhood: h.neighborhood,
        pricePerNightInr: h.pricePerNightInr,
        nearestStation: h.nearestStation,
        walkMinutes: h.walkMinutes,
        lat: h.coordinates[0],
        lng: h.coordinates[1],
      })),
      days: dayList,
    };
  }, [activeCity, days, budgetTier, ticketingProfiles, cityHotels, cityStations]);

  const displayedPlan = aiPlan ?? curatedPlan;

  const handleGenerateMindtripAi = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiRawText(null);
    const originName = originCityId ? cities.find((c) => c.id === originCityId)?.name || '' : '';

    try {
      const res = await fetch('/api/travel-planner/mindtrip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityName: activeCity.name,
          originCity: originName,
          days,
          budgetTier,
          interests,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        plan?: AiItineraryPlan | null;
        rawText?: string;
        sources?: Array<{ title: string; uri: string }>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.plan && Array.isArray(data.plan.days)) {
        setAiPlan(data.plan);
      } else if (data.rawText) {
        setAiRawText(data.rawText);
      }
      setAiSources(data.sources ?? []);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to reach AI itinerary service.');
    } finally {
      setAiLoading(false);
    }
  };

  // Point-to-Point Commute Calculation
  const commuteEstimate = useMemo(() => {
    if (!fromStation || !toStation) return null;
    const straightKm = haversineKm(
      fromStation.latitude,
      fromStation.longitude,
      toStation.latitude,
      toStation.longitude
    );
    const trackKm = Math.max(1.5, Number((straightKm * 1.28).toFixed(1)));
    const metroDurationMin = Math.max(6, Math.round((trackKm / 34) * 60 + 4));
    const busDurationMin = Math.max(12, Math.round((trackKm / 17) * 60 + 8));

    const cityTickets = ticketingProfiles.filter((t) => t.cityId === activeCity.id);
    const metroProfile = cityTickets.find((t) => t.modeLabel.includes('Metro')) || cityTickets[0];
    const busProfile = cityTickets.find((t) => t.modeLabel.includes('Bus') || t.modeLabel.includes('BRTS'));

    const metroFare = metroProfile
      ? Math.min(
          metroProfile.maxFareInr,
          Math.max(metroProfile.minFareInr, Math.round((metroProfile.minFareInr + trackKm * 2.1) / 5) * 5)
        )
      : 30;
    const busFare = busProfile
      ? Math.min(busProfile.maxFareInr, Math.max(busProfile.minFareInr, Math.round((5 + trackKm * 1.1) / 5) * 5))
      : 15;

    const whenToLeave = computeWhenToLeave({
      walkMinutes: walkMin,
      securityBufferMin: 3,
      headwayMin: 5,
      tripDurationMin: metroDurationMin,
    });

    return {
      trackKm,
      metroDurationMin,
      busDurationMin,
      metroFare,
      busFare,
      metroProfile,
      busProfile,
      whenToLeave,
    };
  }, [fromStation, toStation, walkMin, ticketingProfiles, activeCity.id]);

  // Leaflet Map Markers & Polylines for Planner
  const plannerMapData = useMemo(() => {
    const markers: OpenMapMarker[] = [];
    const polylines: OpenMapPolyline[] = [];

    if (userCoords) {
      markers.push({
        id: 'planner-user',
        lat: userCoords[0],
        lng: userCoords[1],
        title: 'Your Location',
        color: '#1D4ED8',
        kind: 'user',
      });
    }

    if (plannerTab === 'mindtrip') {
      const poiCoords: [number, number][] = [];
      displayedPlan.days.forEach((day) => {
        day.stops.forEach((st, idx) => {
          if (Number.isFinite(st.lat) && Number.isFinite(st.lng)) {
            poiCoords.push([st.lat, st.lng]);
            markers.push({
              id: `day-${day.dayNumber}-stop-${idx}`,
              lat: st.lat,
              lng: st.lng,
              title: `Day ${day.dayNumber} · ${st.placeName}`,
              subtitle: `${st.time} · ${st.transitMode} via ${st.nearestStation} (Fare ₹${st.ticketFareInr})`,
              color: '#1D4ED8',
              kind: 'poi',
            });
          }
        });
      });

      displayedPlan.recommendedHotels.forEach((h, idx) => {
        if (Number.isFinite(h.lat) && Number.isFinite(h.lng)) {
          markers.push({
            id: `plan-hotel-${idx}`,
            lat: h.lat,
            lng: h.lng,
            title: `${h.name} (₹${h.pricePerNightInr.toLocaleString('en-IN')}/nt)`,
            subtitle: `${h.walkMinutes} min walk to ${h.nearestStation}`,
            color: '#7C3AED',
            kind: 'hotel',
          });
        }
      });

      if (poiCoords.length >= 2) {
        polylines.push({
          id: 'itinerary-loop',
          coordinates: poiCoords,
          color: '#1D4ED8',
          weight: 3,
          dashArray: '6 5',
          label: `${activeCity.name} Sightseeing Transit Loop`,
        });
      }
    } else if (plannerTab === 'commute' && fromStation && toStation) {
      markers.push({
        id: 'commute-from',
        lat: fromStation.latitude,
        lng: fromStation.longitude,
        title: `Origin: ${fromStation.name}`,
        subtitle: fromStation.interchangeModes.join(' · '),
        color: '#0F766E',
        radius: 9,
        kind: 'station',
      });
      markers.push({
        id: 'commute-to',
        lat: toStation.latitude,
        lng: toStation.longitude,
        title: `Destination: ${toStation.name}`,
        subtitle: toStation.interchangeModes.join(' · '),
        color: '#B91C1C',
        radius: 9,
        kind: 'station',
      });
      polylines.push({
        id: 'commute-arc',
        coordinates: [
          [fromStation.latitude, fromStation.longitude],
          [toStation.latitude, toStation.longitude],
        ],
        color: '#1D4ED8',
        weight: 4,
        dashArray: '6 4',
        label: `${fromStation.name} → ${toStation.name}`,
        sublabel: commuteEstimate ? `Est. ${commuteEstimate.trackKm} km · Metro ₹${commuteEstimate.metroFare}` : '',
      });
    } else if (plannerTab === 'railways') {
      matchingTrains.forEach((tr) => {
        polylines.push({
          id: tr.id,
          coordinates: tr.coordinatesPath,
          color: tr.trainType === 'Vande Bharat' ? '#1D4ED8' : '#B45309',
          weight: 3.5,
          label: `${tr.trainNumber} ${tr.trainName}`,
          sublabel: `${tr.fromStation} → ${tr.toStation} (${tr.durationLabel})`,
        });
      });
    }

    // Add active city's real transit lines subtly underneath
    lines
      .filter((l) => l.cityId === activeCity.id)
      .slice(0, 4)
      .forEach((l) => {
        polylines.push({
          id: `bg-${l.id}`,
          coordinates: l.coordinatesPath,
          color: l.colorHex,
          weight: 2.5,
          opacity: 0.45,
        });
      });

    return { markers, polylines };
  }, [
    userCoords,
    plannerTab,
    displayedPlan,
    activeCity.name,
    activeCity.id,
    fromStation,
    toStation,
    commuteEstimate,
    matchingTrains,
    lines,
  ]);

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E2E0DA] pb-5">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#1D4ED8]">
            Mindtrip-Style Travel, Stay & Commute Planner · Real 2026 INR Pricing
          </p>
          <h1 className="text-2xl sm:text-4xl font-serif font-semibold text-[#141821] mt-1">
            Plan Your Journey, Stay & Tickets
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#EBE8E1]/70 border border-[#E2E0DA] rounded-lg">
            {(
              [
                { id: 'mindtrip', label: 'Travel & Hotels' },
                { id: 'commute', label: 'Metro / Bus Fares' },
                { id: 'railways', label: 'Indian Railways' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPlannerTab(tab.id)}
                className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  plannerTab === tab.id ? 'bg-white text-[#141821] shadow-xs' : 'text-[#525866] hover:text-[#141821]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mobile List vs Map Toggle */}
          <div className="flex lg:hidden items-center gap-1 p-1 bg-[#EBE8E1]/70 border border-[#E2E0DA] rounded-lg">
            <button
              type="button"
              onClick={() => setMobileSplit('list')}
              className={`px-3 py-2 text-xs font-semibold rounded-md ${
                mobileSplit === 'list' ? 'bg-[#141821] text-white' : 'text-[#525866]'
              }`}
            >
              Plan
            </button>
            <button
              type="button"
              onClick={() => setMobileSplit('map')}
              className={`px-3 py-2 text-xs font-semibold rounded-md ${
                mobileSplit === 'map' ? 'bg-[#141821] text-white' : 'text-[#525866]'
              }`}
            >
              Map
            </button>
          </div>
        </div>
      </div>

      {/* Main Split: Left 7 cols Content | Right 5 cols Sticky Open-Source Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={`lg:col-span-7 space-y-6 ${mobileSplit === 'map' ? 'hidden lg:block' : ''}`}>
          {/* MINDTRIP-STYLE TRAVEL & HOTEL PLANNER */}
          {plannerTab === 'mindtrip' && (
            <>
              <div className="bg-white border border-[#E2E0DA] rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#525866] mb-1">Destination City</label>
                    <select
                      value={activeCity.id}
                      onChange={(e) => {
                        onChangeCity(e.target.value);
                        setAiPlan(null);
                      }}
                      className="w-full px-3 py-2 text-xs font-medium bg-[#F8F7F4] border border-[#E2E0DA] rounded-md"
                    >
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#525866] mb-1">Origin (Optional Rail)</label>
                    <select
                      value={originCityId}
                      onChange={(e) => setOriginCityId(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-medium bg-[#F8F7F4] border border-[#E2E0DA] rounded-md"
                    >
                      <option value="">Already in {activeCity.name}</option>
                      {cities
                        .filter((c) => c.id !== activeCity.id)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            From {c.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#525866] mb-1">Duration</label>
                    <select
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-medium bg-[#F8F7F4] border border-[#E2E0DA] rounded-md"
                    >
                      {[1, 2, 3, 4, 5].map((d) => (
                        <option key={d} value={d}>
                          {d} {d === 1 ? 'Day' : 'Days'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#525866] mb-1">Stay & Budget</label>
                    <select
                      value={budgetTier}
                      onChange={(e) => setBudgetTier(e.target.value as 'Budget' | 'Mid-Range' | 'Premium')}
                      className="w-full px-3 py-2 text-xs font-medium bg-[#F8F7F4] border border-[#E2E0DA] rounded-md"
                    >
                      <option value="Budget">Budget (₹1k–₹2.5k/nt)</option>
                      <option value="Mid-Range">Mid-Range (₹3.5k–₹6.5k/nt)</option>
                      <option value="Premium">Premium (₹12k–₹18k+/nt)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    placeholder="Interests (e.g. museums, street food, riverside ferries, tech parks)..."
                    className="flex-1 px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded-md text-[#141821]"
                  />
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={handleGenerateMindtripAi}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-60 rounded-md whitespace-nowrap transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
                    <span>{aiLoading ? 'Building Live Plan...' : 'Customize with 2026 Web Prices'}</span>
                  </button>
                </div>

                {aiError && (
                  <p className="text-xs text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded p-3">
                    {aiError} — showing verified local transit & hotel itinerary below.
                  </p>
                )}
              </div>

              {/* Total Trip Cost Summary */}
              <div className="bg-[#141821] text-white rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-mono text-[#93C5FD]">
                      Complete {days}-Day Estimate · {budgetTier} Tier
                    </div>
                    <h2 className="text-xl sm:text-2xl font-serif font-semibold">{displayedPlan.tripTitle}</h2>
                    <p className="text-xs text-[#D1D5DB] max-w-xl leading-relaxed">{displayedPlan.overview}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-[11px] font-mono text-[#9CA3AF]">Estimated Total</div>
                    <div className="text-3xl font-mono font-semibold tabular-nums">
                      ₹{displayedPlan.estimatedTotalInr.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/15 font-mono tabular-nums text-xs">
                  <div>
                    <div className="text-[#9CA3AF] font-sans">Local Transit</div>
                    <div className="text-sm font-semibold mt-0.5">
                      ₹{displayedPlan.costBreakdown.transitInr.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#9CA3AF] font-sans">Hotels ({Math.max(1, days - 1)} nt)</div>
                    <div className="text-sm font-semibold mt-0.5">
                      ₹{displayedPlan.costBreakdown.stayInr.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#9CA3AF] font-sans">Food & Sightseeing</div>
                    <div className="text-sm font-semibold mt-0.5">
                      ₹{displayedPlan.costBreakdown.activitiesAndFoodInr.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              {aiRawText && (
                <div className="bg-white border border-[#E2E0DA] rounded-xl p-5 text-xs text-[#141821] whitespace-pre-line leading-relaxed">
                  {aiRawText}
                </div>
              )}

              {/* Day-by-Day Itinerary */}
              <div className="space-y-4">
                {displayedPlan.days.map((day) => (
                  <div key={day.dayNumber} className="bg-white border border-[#E2E0DA] rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 bg-[#F8F7F4] border-b border-[#E2E0DA] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#1D4ED8]" aria-hidden="true" />
                        <h3 className="text-base font-serif font-semibold text-[#141821]">
                          Day {day.dayNumber}: {day.theme}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenBooking(activeCity.id)}
                        className="text-xs font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap"
                      >
                        Buy Day Pass →
                      </button>
                    </div>
                    <div className="divide-y divide-[#E2E0DA]">
                      {day.stops.map((stop, idx) => (
                        <div key={`${day.dayNumber}-${idx}`} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-xs font-mono text-[#525866]">
                              {stop.time} · {stop.transitMode} · Nearest: {stop.nearestStation}
                            </div>
                            <h4 className="text-base font-semibold text-[#141821]">{stop.placeName}</h4>
                            <p className="text-xs text-[#525866] leading-relaxed">{stop.notes}</p>
                          </div>
                          <div className="shrink-0 sm:text-right font-mono tabular-nums text-xs space-y-0.5">
                            <div className="font-semibold text-[#1D4ED8]">Transit ₹{stop.ticketFareInr}</div>
                            <div className="text-[#525866]">Est. Food/Entry ₹{stop.entryOrFoodInr}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommended Transit-Connected Hotels */}
              <div className="bg-white border border-[#E2E0DA] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono text-[#7C3AED]">Walkable to Metro & Rail</div>
                    <h3 className="text-lg font-serif font-semibold text-[#141821]">
                      Transit-First Stays in {activeCity.name}
                    </h3>
                  </div>
                  <Hotel className="w-5 h-5 text-[#7C3AED]" aria-hidden="true" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {displayedPlan.recommendedHotels.map((h, i) => {
                    const matched = cityHotels.find((ch) => ch.name === h.name);
                    return (
                      <div key={`${h.name}-${i}`} className="p-4 bg-[#F8F7F4] border border-[#E2E0DA] rounded-lg space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-[#141821]">{h.name}</h4>
                            <p className="text-xs text-[#525866]">{h.neighborhood}</p>
                          </div>
                          <div className="text-right font-mono tabular-nums">
                            <div className="text-sm font-semibold text-[#141821]">
                              ₹{h.pricePerNightInr.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[11px] text-[#525866]">per night</div>
                          </div>
                        </div>
                        <div className="text-xs text-[#525866]">
                          <strong className="text-[#141821]">{h.walkMinutes} min walk</strong> to {h.nearestStation}
                        </div>
                        <a
                          href={matched?.bookingUrl || `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(`${h.name} ${activeCity.name}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:underline pt-1"
                        >
                          <span>Check Live Room Availability</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>

              {aiSources.length > 0 && (
                <div className="bg-white border border-[#E2E0DA] rounded-xl p-4 space-y-2">
                  <div className="text-xs font-semibold text-[#141821]">Live 2026 Web Sources Consulted</div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {aiSources.map((s) => (
                      <a
                        key={s.uri}
                        href={s.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#1D4ED8] hover:underline"
                      >
                        <span className="truncate max-w-[240px]">{s.title}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* POINT-TO-POINT METRO / BUS COMMUTE & WHEN TO LEAVE */}
          {plannerTab === 'commute' && (
            <div className="space-y-5">
              <div className="bg-white border border-[#E2E0DA] rounded-xl p-5 space-y-4">
                <h2 className="text-lg font-serif font-semibold text-[#141821]">
                  Intra-City Fare & Departure Planner ({activeCity.name})
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#525866] mb-1">City</label>
                    <select
                      value={activeCity.id}
                      onChange={(e) => {
                        onChangeCity(e.target.value);
                        setFromStationId('');
                        setToStationId('');
                      }}
                      className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded-md"
                    >
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#525866] mb-1">Origin Station</label>
                    <select
                      value={fromStation?.id || ''}
                      onChange={(e) => setFromStationId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded-md"
                    >
                      {cityStations.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#525866] mb-1">Destination Station</label>
                    <select
                      value={toStation?.id || ''}
                      onChange={(e) => setToStationId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded-md"
                    >
                      {cityStations.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#525866] mb-1">Walk to Station (min)</label>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={walkMin}
                      onChange={(e) => setWalkMin(Math.max(1, Number(e.target.value) || 5))}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#F8F7F4] border border-[#E2E0DA] rounded-md"
                    />
                  </div>
                </div>

                {commuteEstimate && (
                  <div className="space-y-4 pt-2">
                    <div className="bg-[#141821] text-white rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-mono text-[#93C5FD] flex items-center gap-1.5">
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Leave at {commuteEstimate.whenToLeave.leaveAtIst} IST (in {commuteEstimate.whenToLeave.leaveInMin} min)</span>
                        </div>
                        <p className="text-xs text-[#E5E7EB] mt-1">{commuteEstimate.whenToLeave.adviceText}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenBooking(activeCity.id, commuteEstimate.metroProfile?.systemId)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-[#1D4ED8] hover:bg-[#2563EB] text-white rounded-md whitespace-nowrap shrink-0"
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Book ₹{commuteEstimate.metroFare} Ticket</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-[#F8F7F4] border border-[#E2E0DA] rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#141821]">Metro / Rapid Rail</span>
                          <span className="text-lg font-mono font-semibold text-[#1D4ED8] tabular-nums">
                            ₹{commuteEstimate.metroFare}
                          </span>
                        </div>
                        <div className="text-xs text-[#525866] font-mono">
                          ~{commuteEstimate.trackKm} km · {commuteEstimate.metroDurationMin} min ride · 10% NCMC off
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenBooking(activeCity.id, commuteEstimate.metroProfile?.systemId)}
                          className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                        >
                          Open QR / WhatsApp Booking →
                        </button>
                      </div>

                      <div className="p-4 bg-[#F8F7F4] border border-[#E2E0DA] rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#141821]">City Bus / BRTS</span>
                          <span className="text-lg font-mono font-semibold text-[#0F766E] tabular-nums">
                            ₹{commuteEstimate.busFare}
                          </span>
                        </div>
                        <div className="text-xs text-[#525866] font-mono">
                          ~{commuteEstimate.trackKm} km · {commuteEstimate.busDurationMin} min road time
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenBooking(activeCity.id, commuteEstimate.busProfile?.systemId)}
                          className="text-xs font-semibold text-[#0F766E] hover:underline"
                        >
                          Check Bus App / Daily Pass →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* INDIAN RAILWAYS & COMING SOON CITIES */}
          {plannerTab === 'railways' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E2E0DA] rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono text-[#1D4ED8]">
                      Indian Railways & Namo Bharat Rapid Rail
                    </div>
                    <h2 className="text-lg font-serif font-semibold text-[#141821]">
                      Intercity Corridors & Official IRCTC Fares
                    </h2>
                  </div>
                  <a
                    href="https://www.irctc.co.in/nget/train-search"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#141821] text-white rounded-md hover:bg-[#1D4ED8]"
                  >
                    <span>IRCTC Official Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="space-y-3">
                  {indianRailways.map((tr) => (
                    <div key={tr.id} className="p-4 bg-[#F8F7F4] border border-[#E2E0DA] rounded-lg space-y-2.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-mono text-[#1D4ED8]">
                            {tr.trainType} · Train #{tr.trainNumber} · {tr.frequency}
                          </div>
                          <h3 className="text-base font-serif font-semibold text-[#141821]">{tr.trainName}</h3>
                        </div>
                        <span className="text-xs font-mono text-[#525866]">
                          {tr.durationLabel} · {tr.distanceKm} km
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#141821] font-medium">
                        <span>{tr.fromStation} ({tr.departureTimeIst})</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#525866]" />
                        <span>{tr.toStation} ({tr.arrivalTimeIst})</span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E2E0DA]">
                        <div className="flex flex-wrap gap-3 text-xs font-mono tabular-nums">
                          {tr.faresInr.map((f) => (
                            <span key={f.className} className="text-[#141821]">
                              {f.className}: <strong>₹{f.priceInr.toLocaleString('en-IN')}</strong>
                            </span>
                          ))}
                        </div>
                        <a
                          href={tr.irctcUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline"
                        >
                          <span>Book Ticket</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coming Soon Cities List */}
              <div className="bg-white border border-[#E2E0DA] rounded-xl p-5 space-y-4">
                <div>
                  <div className="text-xs font-mono text-[#B45309]">Expanding National Grid</div>
                  <h3 className="text-lg font-serif font-semibold text-[#141821]">
                    Coming Soon Transit Cities ({comingSoonCities.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {comingSoonCities.map((cs) => (
                    <div key={cs.id} className="p-4 bg-[#F8F7F4] border border-[#E2E0DA] rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono text-[#B45309]">
                        <span>{cs.currentStage}</span>
                        <span>{cs.expectedLaunch}</span>
                      </div>
                      <h4 className="text-base font-serif font-semibold text-[#141821]">
                        {cs.name}, {cs.state}
                      </h4>
                      <div className="text-xs text-[#525866]">
                        {cs.systemName} · {cs.phase1Km} km · {cs.stationsPlanned} stations · Est. {cs.estimatedFareRangeInr}
                      </div>
                      <p className="text-xs text-[#525866] leading-relaxed">{cs.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sticky Open-Source Map */}
        <aside className={`lg:col-span-5 lg:sticky lg:top-20 space-y-4 ${mobileSplit === 'list' ? 'hidden lg:block' : ''}`}>
          <div className="bg-white border border-[#E2E0DA] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#F8F7F4] border-b border-[#E2E0DA] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#141821] inline-flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span>OpenStreetMap Interactive Route & Stay Map</span>
              </span>
              <span className="font-mono text-[#525866]">{activeCity.name}</span>
            </div>

            <OpenSourceMap
              center={plannerTab === 'railways' ? [22.0, 79.0] : activeCity.coordinates}
              zoom={plannerTab === 'railways' ? 5 : 12}
              markers={plannerMapData.markers}
              polylines={plannerMapData.polylines}
              heightClass="h-[460px] lg:h-[580px]"
            />

            <div className="px-4 py-2.5 bg-[#F8F7F4] border-t border-[#E2E0DA] flex flex-wrap items-center gap-4 text-[11px] text-[#525866]">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#1D4ED8]" />
                <span>Transit Stops / POIs</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Hotel className="w-3 h-3 text-[#7C3AED]" />
                <span>Walkable Hotels</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Train className="w-3 h-3 text-[#0F766E]" />
                <span>Rail & Metro Lines</span>
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
