import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, MapPin, Search, Train, X } from 'lucide-react';
import { useTransitData } from '../context/TransitDataContext';
import { ModeId } from '../types/transit';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCity: (cityId: string) => void;
  onSelectSystem: (systemId: string) => void;
  onSelectMode: (modeId: ModeId) => void;
  onSelectStationOnMap: (cityId: string, stationId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectCity,
  onSelectSystem,
  onSelectMode,
  onSelectStationOnMap,
}) => {
  const { cities, systems, lines, stations, modes } = useTransitData();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'city' | 'system' | 'line' | 'station' | 'mode'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    const cityMatches = cities
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.state.toLowerCase().includes(q)
      )
      .slice(0, 6)
      .map((c) => ({
        kind: 'city' as const,
        id: c.id,
        title: c.name,
        meta: `${c.state} · ${c.urbanAgglomerationPopM}M Urban Pop.`,
        onPick: () => {
          onSelectCity(c.id);
          onClose();
        },
      }));

    const systemMatches = systems
      .filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.operator.toLowerCase().includes(q) ||
          s.shortName.toLowerCase().includes(q)
      )
      .slice(0, 8)
      .map((s) => {
        const city = cities.find((c) => c.id === s.cityId);
        const mode = modes.find((m) => m.id === s.modeId);
        return {
          kind: 'system' as const,
          id: s.id,
          title: s.name,
          meta: `${mode?.shortName ?? s.modeId} · ${city?.name ?? s.cityId} · ${s.status}${
            s.operationalLengthKm > 0 ? ` · ${s.operationalLengthKm} km` : ''
          }`,
          onPick: () => {
            onSelectSystem(s.id);
            onClose();
          },
        };
      });

    const lineMatches = lines
      .filter(
        (l) =>
          !q ||
          l.name.toLowerCase().includes(q) ||
          l.startStation.toLowerCase().includes(q) ||
          l.terminalStation.toLowerCase().includes(q)
      )
      .slice(0, 6)
      .map((l) => {
        const sys = systems.find((s) => s.id === l.systemId);
        return {
          kind: 'line' as const,
          id: l.id,
          title: l.name,
          meta: `${sys?.name ?? ''} · ${l.startStation} – ${l.terminalStation} · ${l.lengthKm} km`,
          onPick: () => {
            onSelectSystem(l.systemId);
            onClose();
          },
        };
      });

    const stationMatches = stations
      .filter(
        (st) =>
          !q ||
          st.name.toLowerCase().includes(q) ||
          st.interchangeModes.some((im) => im.toLowerCase().includes(q))
      )
      .slice(0, 8)
      .map((st) => {
        const city = cities.find((c) => c.id === st.cityId);
        return {
          kind: 'station' as const,
          id: st.id,
          title: st.name,
          meta: `${city?.name ?? ''} · ${st.stationType} · ${st.latitude.toFixed(4)}°N, ${st.longitude.toFixed(4)}°E`,
          onPick: () => {
            onSelectStationOnMap(st.cityId, st.id);
            onClose();
          },
        };
      });

    const modeMatches = modes
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.definition.toLowerCase().includes(q))
      .map((m) => ({
        kind: 'mode' as const,
        id: m.id,
        title: m.name,
        meta: `Transport Mode Category 0${m.order}`,
        onPick: () => {
          onSelectMode(m.id);
          onClose();
        },
      }));

    const combined = [
      ...(categoryFilter === 'all' || categoryFilter === 'city' ? cityMatches : []),
      ...(categoryFilter === 'all' || categoryFilter === 'system' ? systemMatches : []),
      ...(categoryFilter === 'all' || categoryFilter === 'line' ? lineMatches : []),
      ...(categoryFilter === 'all' || categoryFilter === 'station' ? stationMatches : []),
      ...(categoryFilter === 'all' || categoryFilter === 'mode' ? modeMatches : []),
    ];

    return combined.slice(0, 18);
  }, [query, categoryFilter, cities, systems, lines, stations, modes, onClose, onSelectCity, onSelectSystem, onSelectMode, onSelectStationOnMap]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#141821]/45 backdrop-blur-[2px] flex items-start justify-center pt-16 sm:pt-24 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search India Transit Atlas"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-[#E2E0DA] rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E2E0DA]">
          <Search className="w-4 h-4 text-[#525866] shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Indian cities, metro systems, lines, stations, or operators..."
            className="w-full text-sm text-[#141821] placeholder:text-[#7D8491] bg-transparent focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#525866] hover:text-[#141821] rounded transition-colors"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-2.5 bg-[#F8F7F4] border-b border-[#E2E0DA] flex items-center gap-1.5 overflow-x-auto">
          {(
            [
              { id: 'all', label: 'All Entities' },
              { id: 'city', label: 'Cities' },
              { id: 'system', label: 'Systems' },
              { id: 'line', label: 'Lines' },
              { id: 'station', label: 'Stations' },
              { id: 'mode', label: 'Modes' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === tab.id
                  ? 'bg-[#141821] text-white'
                  : 'text-[#525866] hover:bg-[#EBE8E1] hover:text-[#141821]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-h-[380px] overflow-y-auto divide-y divide-[#E2E0DA]">
          {results.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium text-[#141821]">No matching transit records found</p>
              <p className="text-xs text-[#525866] mt-1">
                Try searching for Delhi, Mumbai, Kochi Water Metro, Rajiv Chowk, or DMRC.
              </p>
            </div>
          ) : (
            results.map((item) => (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                onClick={item.onPick}
                className="w-full px-4 py-3 text-left hover:bg-[#F8F7F4] transition-colors flex items-center justify-between gap-4 group"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#1D4ED8] shrink-0">
                      {item.kind}
                    </span>
                    <span className="text-sm font-semibold text-[#141821] truncate group-hover:text-[#1D4ED8] transition-colors">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-xs text-[#525866] mt-0.5 truncate">{item.meta}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#7D8491] group-hover:text-[#1D4ED8] shrink-0 transition-colors" />
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 bg-[#F8F7F4] border-t border-[#E2E0DA] flex items-center justify-between text-[11px] text-[#525866]">
          <span className="flex items-center gap-2">
            <Train className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{systems.length} systems · {lines.length} lines · {stations.length} stations indexed</span>
          </span>
          <span className="hidden sm:flex items-center gap-1.5 font-mono">
            <MapPin className="w-3 h-3" aria-hidden="true" />
            <span>ESC to close</span>
          </span>
        </div>
      </div>
    </div>
  );
};
