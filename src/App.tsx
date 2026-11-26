import { useCallback, useEffect, useState } from 'react';
import { AnalyticsTechExpansionView } from './components/AnalyticsTechExpansionView';
import { CitiesDirectoryView } from './components/CitiesDirectoryView';
import { HomePage } from './components/HomePage';
import { InteractiveMapView } from './components/InteractiveMapView';
import { ResearchHistoryRegistryView } from './components/ResearchHistoryRegistryView';
import { SearchModal } from './components/SearchModal';
import { SystemsDirectoryView } from './components/SystemsDirectoryView';
import { TicketBookingModal } from './components/TicketBookingModal';
import { TopNav } from './components/TopNav';
import { TripPlannerView } from './components/TripPlannerView';
import { TransitDataProvider, useTransitData } from './context/TransitDataContext';
import { AtlasPage, ModeId } from './types/transit';
import { findNearestCity } from './utils/geoLocation';

function AtlasShell() {
  const { cities } = useTransitData();
  const [activePage, setActivePage] = useState<AtlasPage>('home');
  const [searchOpen, setSearchOpen] = useState(false);

  // User location & active city personalization
  const [activeCityId, setActiveCityId] = useState<string>('delhi');
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [locationLabel, setLocationLabel] = useState<string>('Delhi (NCR) · Default Hub');

  // Direct Ticket Booking Modal state
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingCityId, setBookingCityId] = useState<string | null>(null);
  const [bookingSystemId, setBookingSystemId] = useState<string | null>(null);

  const [selectedModeId, setSelectedModeId] = useState<ModeId | 'all'>('all');
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [mapCityId, setMapCityId] = useState<string | null>(null);
  const [mapStationId, setMapStationId] = useState<string | null>(null);

  // Automatic quiet location check (only if already granted, or via explicit button)
  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationLabel('Geolocation unavailable in browser');
      return;
    }
    setLocationLabel('Detecting your nearest transit hub...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserCoords(coords);
        const nearest = findNearestCity(coords[0], coords[1], cities);
        setActiveCityId(nearest.city.id);
        setLocationLabel(
          nearest.distanceKm < 80
            ? `${nearest.city.name} (${nearest.distanceKm} km from your GPS)`
            : `Nearest Indian Hub: ${nearest.city.name} (${nearest.distanceKm} km)`
        );
      },
      () => {
        setLocationLabel(`${cities.find((c) => c.id === activeCityId)?.name || 'Delhi (NCR)'} · Manual Hub`);
      },
      { timeout: 8000 }
    );
  }, [cities, activeCityId]);

  useEffect(() => {
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          if (status.state === 'granted') {
            requestUserLocation();
          }
        })
        .catch(() => {
          // ignore permission API errors
        });
    }
  }, [requestUserLocation]);

  const goToPage = (page: AtlasPage) => {
    setActivePage(page);
    if (page !== 'systems') {
      setSelectedSystemId(null);
    }
    if (page !== 'cities') {
      setSelectedCityId(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openCityProfile = (cityId: string) => {
    setSelectedCityId(cityId);
    setActiveCityId(cityId);
    setActivePage('cities');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openSystemProfile = (systemId: string) => {
    setSelectedSystemId(systemId);
    setActivePage('systems');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openModeDirectory = (modeId: ModeId) => {
    setSelectedModeId(modeId);
    setSelectedSystemId(null);
    setActivePage('systems');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openMapCity = (cityId: string, stationId?: string) => {
    setMapCityId(cityId);
    setMapStationId(stationId ?? null);
    setActiveCityId(cityId);
    setActivePage('map');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openBookingModal = (cityId?: string, systemId?: string) => {
    setBookingCityId(cityId || activeCityId);
    setBookingSystemId(systemId || null);
    setBookingOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F4] text-[#141821] pb-16 md:pb-0">
      <TopNav
        activePage={activePage}
        onNavigate={goToPage}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenBooking={() => openBookingModal()}
      />

      <main className="flex-1">
        {activePage === 'home' && (
          <HomePage
            activeCityId={activeCityId}
            userCoords={userCoords}
            locationLabel={locationLabel}
            onChangeActiveCity={(id) => {
              setActiveCityId(id);
              const name = cities.find((c) => c.id === id)?.name;
              if (name) setLocationLabel(`${name} · Selected Hub`);
            }}
            onRequestLocate={requestUserLocation}
            onNavigate={goToPage}
            onSelectCity={openCityProfile}
            onSelectSystem={openSystemProfile}
            onSelectMode={openModeDirectory}
            onOpenMapCity={(cityId, stationId) => openMapCity(cityId, stationId)}
            onOpenBooking={openBookingModal}
          />
        )}

        {activePage === 'planner' && (
          <TripPlannerView
            activeCityId={activeCityId}
            userCoords={userCoords}
            onChangeCity={setActiveCityId}
            onOpenBooking={openBookingModal}
          />
        )}

        {activePage === 'map' && (
          <InteractiveMapView
            key={`${mapCityId ?? 'india'}-${mapStationId ?? 'none'}`}
            initialCityId={mapCityId}
            initialStationId={mapStationId}
            userCoords={userCoords}
            onRequestLocate={requestUserLocation}
            onSelectCityProfile={openCityProfile}
            onSelectSystemProfile={openSystemProfile}
            onOpenBooking={openBookingModal}
          />
        )}

        {activePage === 'systems' && (
          <SystemsDirectoryView
            selectedModeId={selectedModeId}
            selectedSystemId={selectedSystemId}
            onSelectMode={setSelectedModeId}
            onSelectSystem={setSelectedSystemId}
            onSelectCity={openCityProfile}
            onOpenMapCity={(cityId) => openMapCity(cityId)}
          />
        )}

        {activePage === 'cities' && (
          <CitiesDirectoryView
            selectedCityId={selectedCityId}
            onSelectCity={setSelectedCityId}
            onSelectSystem={openSystemProfile}
            onOpenMapCity={(cityId) => openMapCity(cityId)}
          />
        )}

        {activePage === 'analytics' && (
          <div className="space-y-4">
            <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex items-center justify-end">
              <button
                type="button"
                onClick={() => goToPage('research')}
                className="text-xs font-semibold text-[#1D4ED8] hover:underline"
              >
                Open History, Sources & Research Registry →
              </button>
            </div>
            <AnalyticsTechExpansionView
              onSelectCity={openCityProfile}
              onSelectSystem={openSystemProfile}
            />
          </div>
        )}

        {activePage === 'research' && (
          <ResearchHistoryRegistryView onSelectCity={openCityProfile} />
        )}
      </main>

      <footer className="bg-white border-t border-[#E2E0DA] mt-16">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5 space-y-2.5">
            <div className="font-serif text-lg font-semibold text-[#141821]">India Transit Atlas</div>
            <p className="text-xs text-[#525866] leading-relaxed max-w-md">
              Customer-first urban mobility companion & digital encyclopedia for Indian metro rail, Indian Railways, suburban EMUs, city buses, BRTS corridors, tramways, monorails, water metros, and transit-connected travel planning.
            </p>
          </div>

          <div className="md:col-span-3 space-y-2">
            <div className="text-xs font-semibold text-[#141821]">Explore & Plan</div>
            <ul className="text-xs text-[#525866] space-y-1.5">
              <li><button type="button" onClick={() => goToPage('planner')} className="hover:text-[#1D4ED8]">Mindtrip-Style Trip & Stay Planner</button></li>
              <li><button type="button" onClick={() => openBookingModal()} className="hover:text-[#1D4ED8]">Direct Ticket Booking & Fares</button></li>
              <li><button type="button" onClick={() => goToPage('map')} className="hover:text-[#1D4ED8]">OpenStreetMap Live Atlas</button></li>
              <li><button type="button" onClick={() => goToPage('systems')} className="hover:text-[#1D4ED8]">Transit Systems Directory</button></li>
              <li><button type="button" onClick={() => goToPage('cities')} className="hover:text-[#1D4ED8]">12 City Profiles</button></li>
              <li><button type="button" onClick={() => goToPage('research')} className="hover:text-[#1D4ED8]">History, Sources & Registry</button></li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-2">
            <div className="text-xs font-semibold text-[#141821]">Open Data & Attribution</div>
            <p className="text-xs text-[#525866] leading-relaxed">
              Interactive maps use open-source Leaflet and OpenStreetMap / CARTO contributors data. Ticket fares and corridor lengths reflect official 2026 operator schedules (DMRC, BMRCL, MMRDA, CMRL, KMRL, Indian Railways IRCTC/UTS); final booking occurs directly on official operator channels.
            </p>
          </div>
        </div>
      </footer>

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectCity={openCityProfile}
        onSelectSystem={openSystemProfile}
        onSelectMode={openModeDirectory}
        onSelectStationOnMap={(cityId, stationId) => openMapCity(cityId, stationId)}
      />

      <TicketBookingModal
        isOpen={bookingOpen}
        initialCityId={bookingCityId}
        initialSystemId={bookingSystemId}
        onClose={() => setBookingOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <TransitDataProvider>
      <AtlasShell />
    </TransitDataProvider>
  );
}
