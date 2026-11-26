import React, { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Building2,
  Compass,
  Home,
  Map as MapIcon,
  Menu,
  Search,
  Ticket,
  X,
} from 'lucide-react';
import { AtlasPage } from '../types/transit';

interface TopNavProps {
  activePage: AtlasPage;
  onNavigate: (page: AtlasPage) => void;
  onOpenSearch: () => void;
  onOpenBooking: () => void;
}

const DESKTOP_NAV_ITEMS: { id: AtlasPage; label: string }[] = [
  { id: 'planner', label: 'Trip Planner' },
  { id: 'map', label: 'Live Map' },
  { id: 'systems', label: 'Systems' },
  { id: 'cities', label: 'Cities' },
  { id: 'analytics', label: 'Insights' },
];

export const TopNav: React.FC<TopNavProps> = ({
  activePage,
  onNavigate,
  onOpenSearch,
  onOpenBooking,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (page: AtlasPage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#F8F7F4]/95 backdrop-blur-sm border-b border-[#E2E0DA]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => handleNav('home')}
            className="text-left font-serif text-lg sm:text-xl font-semibold tracking-tight text-[#141821] hover:text-[#1D4ED8] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] rounded-sm"
          >
            India Transit Atlas
          </button>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Primary Navigation">
            {DESKTOP_NAV_ITEMS.map((item) => {
              const isActive =
                activePage === item.id ||
                (item.id === 'analytics' && activePage === 'research');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] rounded-sm ${
                    isActive
                      ? 'text-[#141821]'
                      : 'text-[#525866] hover:text-[#141821]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 right-0 -bottom-[21px] h-[2px] bg-[#1D4ED8]"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenSearch}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs font-semibold text-white bg-[#141821] hover:bg-[#1D4ED8] transition-colors rounded-md whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
            >
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Search Atlas</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-[#141821] hover:bg-[#EBE8E1] rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E2E0DA] bg-[#F8F7F4] px-4 py-3 space-y-1">
            {[
              { id: 'home' as AtlasPage, label: 'Home & Live Status', icon: Home },
              { id: 'planner' as AtlasPage, label: 'Trip & Hotel Planner', icon: Compass },
              { id: 'map' as AtlasPage, label: 'OpenStreetMap Live Atlas', icon: MapIcon },
              { id: 'systems' as AtlasPage, label: 'Transit Systems Directory', icon: Building2 },
              { id: 'cities' as AtlasPage, label: '12 City Profiles', icon: Building2 },
              { id: 'analytics' as AtlasPage, label: 'Statistics & Analytics', icon: BarChart3 },
              { id: 'research' as AtlasPage, label: 'History, Sources & Registry', icon: BookOpen },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`w-full text-left px-3 py-3 text-sm font-medium rounded-md flex items-center gap-3 ${
                    activePage === item.id ? 'bg-[#EBE8E1] text-[#141821]' : 'text-[#525866]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Mobile App-Style Fixed Bottom Tab Bar (Thumb Zone, <= 60px height) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E2E0DA] pb-safe"
      >
        <div className="grid grid-cols-5 items-center h-[58px]">
          <button
            type="button"
            onClick={() => handleNav('home')}
            className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium ${
              activePage === 'home' ? 'text-[#1D4ED8]' : 'text-[#525866]'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" aria-hidden="true" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => handleNav('planner')}
            className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium ${
              activePage === 'planner' ? 'text-[#1D4ED8]' : 'text-[#525866]'
            }`}
          >
            <Compass className="w-5 h-5 mb-0.5" aria-hidden="true" />
            <span>Plan</span>
          </button>

          <button
            type="button"
            onClick={() => handleNav('map')}
            className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium ${
              activePage === 'map' ? 'text-[#1D4ED8]' : 'text-[#525866]'
            }`}
          >
            <MapIcon className="w-5 h-5 mb-0.5" aria-hidden="true" />
            <span>Map</span>
          </button>

          <button
            type="button"
            onClick={onOpenBooking}
            className="flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium text-[#0F766E]"
          >
            <Ticket className="w-5 h-5 mb-0.5" aria-hidden="true" />
            <span>Tickets</span>
          </button>

          <button
            type="button"
            onClick={() => handleNav('cities')}
            className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium ${
              activePage === 'cities' || activePage === 'systems' ? 'text-[#1D4ED8]' : 'text-[#525866]'
            }`}
          >
            <Building2 className="w-5 h-5 mb-0.5" aria-hidden="true" />
            <span>Cities</span>
          </button>
        </div>
      </nav>
    </>
  );
};
