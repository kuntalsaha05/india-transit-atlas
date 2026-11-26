import React, { useMemo, useState } from 'react';
import { ArrowLeft, Compass, ExternalLink } from 'lucide-react';
import { useTransitData } from '../context/TransitDataContext';
import { City } from '../types/transit';
import { StatusLabel } from './StatusText';

interface CitiesDirectoryViewProps {
  selectedCityId: string | null;
  onSelectCity: (cityId: string | null) => void;
  onSelectSystem: (systemId: string) => void;
  onOpenMapCity: (cityId: string) => void;
}

export const CitiesDirectoryView: React.FC<CitiesDirectoryViewProps> = ({
  selectedCityId,
  onSelectCity,
  onSelectSystem,
  onOpenMapCity,
}) => {
  const { cities, comingSoonCities, systems, lines, stations, projects, milestones, modes, getSourcesByIds } = useTransitData();
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [pipelineFilter, setPipelineFilter] = useState<'all' | 'extension' | 'new-city'>('all');
  const [query, setQuery] = useState('');

  const selectedCity: City | null = useMemo(
    () => (selectedCityId ? cities.find((c) => c.id === selectedCityId) ?? null : null),
    [cities, selectedCityId]
  );

  const filteredCities = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cities.filter((c) => {
      if (regionFilter !== 'all' && c.region !== regionFilter) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.state.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cities, regionFilter, query]);

  const filteredPipeline = useMemo(() => {
    const q = query.trim().toLowerCase();
    return comingSoonCities.filter((item) => {
      const isExt = item.projectCategory === 'Phase 2 / Major Extension' || Boolean(item.relatedCityId);
      if (pipelineFilter === 'extension' && !isExt) return false;
      if (pipelineFilter === 'new-city' && isExt) return false;
      if (
        q &&
        !item.name.toLowerCase().includes(q) &&
        !item.state.toLowerCase().includes(q) &&
        !item.systemName.toLowerCase().includes(q) &&
        !item.corridors.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [comingSoonCities, pipelineFilter, query]);

  // Standardized 15-Section City Profile Template
  if (selectedCity) {
    const citySystems = systems.filter((s) => s.cityId === selectedCity.id);
    const cityLines = lines.filter((l) => l.cityId === selectedCity.id);
    const cityStations = stations.filter((st) => st.cityId === selectedCity.id);
    const cityExpansions = projects.filter((p) => p.cityId === selectedCity.id);
    const cityMilestones = milestones.filter((m) => m.cityId === selectedCity.id);
    const citySources = getSourcesByIds(selectedCity.sourceIds);

    const totalRailBrtWaterKm = citySystems
      .filter((s) => s.status === 'Operational' || s.status === 'Partially Operational')
      .reduce((acc, s) => acc + s.operationalLengthKm, 0);
    const totalElevatedKm = citySystems.reduce((acc, s) => acc + s.elevatedKm, 0);
    const totalUndergroundKm = citySystems.reduce((acc, s) => acc + s.undergroundKm, 0);
    const totalAtGradeKm = citySystems.reduce((acc, s) => acc + s.atGradeKm, 0);

    return (
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E2E0DA] pb-6">
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => onSelectCity(null)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1D4ED8] hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>All Indian Cities</span>
            </button>
            <div className="text-xs font-mono text-[#525866] pt-1">
              {selectedCity.state} · {selectedCity.region} India · {selectedCity.coordinates[0].toFixed(4)}°N,{' '}
              {selectedCity.coordinates[1].toFixed(4)}°E · Data as of {selectedCity.dataAsOf}
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-semibold text-[#141821]">
              {selectedCity.name} — Urban Transit Profile
            </h1>
          </div>

          <button
            type="button"
            onClick={() => onOpenMapCity(selectedCity.id)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md whitespace-nowrap"
          >
            <Compass className="w-4 h-4" aria-hidden="true" />
            <span>View {selectedCity.name} Corridor Map</span>
          </button>
        </div>

        {/* 15-Section Standardized Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Quick Index Rail */}
          <aside className="lg:col-span-3 lg:sticky lg:top-24 self-start bg-white border border-[#E2E0DA] rounded-lg p-4 space-y-2">
            <div className="text-xs font-mono uppercase tracking-wider text-[#525866] pb-2 border-b border-[#E2E0DA]">
              15-Section City Standard
            </div>
            <ol className="text-xs space-y-1.5 text-[#525866]">
              {[
                ['sec-1', '01. City Overview'],
                ['sec-2', '02. Transit Overview'],
                ['sec-3', '03. Historical Background'],
                ['sec-4', '04. Network Details'],
                ['sec-5', '05. Routes & Terminals'],
                ['sec-6', '06. Infrastructure'],
                ['sec-7', '07. Rolling Stock'],
                ['sec-8', '08. Technology & Ticketing'],
                ['sec-9', '09. Operations & Fares'],
                ['sec-10', '10. Ridership'],
                ['sec-11', '11. Connectivity'],
                ['sec-12', '12. Expansion'],
                ['sec-13', '13. Challenges'],
                ['sec-14', '14. Future Outlook'],
                ['sec-15', '15. References'],
              ].map(([href, label]) => (
                <li key={href}>
                  <a href={`#${href}`} className="hover:text-[#1D4ED8] transition-colors block py-0.5">
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </aside>

          {/* Main 15 Sections */}
          <div className="lg:col-span-9 space-y-8">
            {/* 01. City Overview */}
            <section id="sec-1" className="bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-3">
              <div className="text-xs font-mono text-[#1D4ED8]">01 / City Overview</div>
              <h2 className="text-xl font-serif font-semibold text-[#141821]">Metropolitan & Demographic Context</h2>
              <p className="text-sm text-[#525866] leading-relaxed">{selectedCity.overview}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-[#E2E0DA] font-mono tabular-nums">
                <div>
                  <div className="text-[11px] font-sans text-[#7D8491]">Urban Pop. (Est.)</div>
                  <div className="text-base font-semibold text-[#141821]">{selectedCity.urbanAgglomerationPopM}M</div>
                </div>
                <div>
                  <div className="text-[11px] font-sans text-[#7D8491]">Urban Area</div>
                  <div className="text-base font-semibold text-[#141821]">{selectedCity.urbanAreaSqKm} sq km</div>
                </div>
                <div>
                  <div className="text-[11px] font-sans text-[#7D8491]">Active Systems</div>
                  <div className="text-base font-semibold text-[#141821]">{citySystems.length}</div>
                </div>
                <div>
                  <div className="text-[11px] font-sans text-[#7D8491]">Corridor Network</div>
                  <div className="text-base font-semibold text-[#1D4ED8]">{totalRailBrtWaterKm.toFixed(1)} km</div>
                </div>
              </div>
            </section>

            {/* 02. Transit Overview */}
            <section id="sec-2" className="bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-4">
              <div className="text-xs font-mono text-[#1D4ED8]">02 / Transit Overview</div>
              <h2 className="text-xl font-serif font-semibold text-[#141821]">Available Public Transit Modes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {citySystems.map((sys) => {
                  const mode = modes.find((m) => m.id === sys.modeId);
                  return (
                    <div key={sys.id} className="p-4 bg-[#F8F7F4] border border-[#E2E0DA] rounded-md space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[11px] font-mono text-[#525866]">{mode?.name}</div>
                          <h3 className="text-base font-serif font-semibold text-[#141821]">{sys.name}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectSystem(sys.id)}
                          className="text-xs font-semibold text-[#1D4ED8] hover:underline shrink-0"
                        >
                          System Page →
                        </button>
                      </div>
                      <p className="text-xs text-[#525866]">{sys.operator}</p>
                      <div className="flex items-center justify-between pt-1">
                        <StatusLabel status={sys.status} />
                        <span className="text-xs font-mono tabular-nums text-[#141821]">
                          {sys.operationalLengthKm > 0 ? `${sys.operationalLengthKm} km` : sys.fleetCountLabel.split(' ')[0]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 03. Historical Background */}
            <section id="sec-3" className="bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-3">
              <div className="text-xs font-mono text-[#1D4ED8]">03 / Historical Background</div>
              <h2 className="text-xl font-serif font-semibold text-[#141821]">Origins & Milestones</h2>
              <p className="text-sm text-[#525866] leading-relaxed">{selectedCity.historicalBackground}</p>
              {cityMilestones.length > 0 && (
                <div className="pt-3 border-t border-[#E2E0DA] space-y-2">
                  {cityMilestones.map((m) => (
                    <div key={m.id} className="text-xs flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                      <span className="font-mono font-semibold text-[#1D4ED8] shrink-0">{m.dateLabel}</span>
                      <span className="font-semibold text-[#141821]">{m.title}:</span>
                      <span className="text-[#525866]">{m.summary}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 04 & 05. Network Details & Routes */}
            <section id="sec-4" className="bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-4">
              <div className="text-xs font-mono text-[#1D4ED8]">04 & 05 / Network Details & Routes</div>
              <h2 className="text-xl font-serif font-semibold text-[#141821]">
                Individual Lines, Terminals & Interchanges
              </h2>
              <div id="sec-5" />
              {cityLines.length === 0 ? (
                <p className="text-sm text-[#525866]">
                  Individual line geometry rows are being catalogued for {selectedCity.name}; system-level metrics remain active above.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F8F7F4] border-b border-[#E2E0DA] text-[#525866]">
                        <th className="py-2.5 px-3">Line</th>
                        <th className="py-2.5 px-3">Terminals</th>
                        <th className="py-2.5 px-3 text-right">Length</th>
                        <th className="py-2.5 px-3 text-right">Stations</th>
                        <th className="py-2.5 px-3">Major Interchanges</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E0DA]">
                      {cityLines.map((line) => (
                        <tr key={line.id}>
                          <td className="py-2.5 px-3 font-semibold text-[#141821] whitespace-nowrap">
                            <span className="inline-flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: line.colorHex }} />
                              <span>{line.name}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[#525866]">
                            {line.startStation} ↔ {line.terminalStation}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">{line.lengthKm} km</td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">{line.stationCount}</td>
                          <td className="py-2.5 px-3 text-[#525866]">{line.interchanges.join(', ')}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap"><StatusLabel status={line.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {cityStations.length > 0 && (
                <div className="pt-3 border-t border-[#E2E0DA]">
                  <div className="text-xs font-semibold text-[#141821] mb-2">
                    Verified Interchange Stations ({cityStations.length})
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#525866]">
                    {cityStations.map((st) => (
                      <span key={st.id}>
                        <strong className="text-[#141821]">{st.name}</strong> ({st.stationType})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* 06, 07, 08. Infrastructure, Rolling Stock & Technology */}
            <section id="sec-6" className="bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-4">
              <div className="text-xs font-mono text-[#1D4ED8]">06, 07 & 08 / Infrastructure, Rolling Stock & Technology</div>
              <div id="sec-7" />
              <div id="sec-8" />
              <div className="grid grid-cols-3 gap-4 p-3.5 bg-[#F8F7F4] border border-[#E2E0DA] rounded font-mono tabular-nums text-xs">
                <div>Elevated: <strong>{totalElevatedKm.toFixed(1)} km</strong></div>
                <div>Underground: <strong>{totalUndergroundKm.toFixed(1)} km</strong></div>
                <div>At-Grade / Water: <strong>{totalAtGradeKm.toFixed(1)} km</strong></div>
              </div>
              <div className="divide-y divide-[#E2E0DA] text-xs space-y-2">
                {citySystems.map((sys) => (
                  <div key={sys.id} className="pt-3 first:pt-0 space-y-1">
                    <div className="font-semibold text-sm text-[#141821]">{sys.name}</div>
                    <div className="text-[#525866]">
                      <strong>Rolling Stock:</strong> {sys.rollingStockSummary} ({sys.fleetCountLabel})
                    </div>
                    <div className="text-[#525866]">
                      <strong>Signalling & Power:</strong> {sys.signallingSystem} · {sys.electrification} · {sys.atoLevel}
                    </div>
                    <div className="text-[#525866]">
                      <strong>Ticketing:</strong> {sys.ticketingSystems.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 09 & 10. Operations & Ridership */}
            <section id="sec-9" className="bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-4">
              <div className="text-xs font-mono text-[#1D4ED8]">09 & 10 / Operations & Ridership</div>
              <div id="sec-10" />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8F7F4] border-b border-[#E2E0DA] text-[#525866]">
                      <th className="py-2.5 px-3">System</th>
                      <th className="py-2.5 px-3">Operating Hours</th>
                      <th className="py-2.5 px-3">Peak Frequency</th>
                      <th className="py-2.5 px-3">Fares (INR)</th>
                      <th className="py-2.5 px-3 text-right">Daily Ridership</th>
                      <th className="py-2.5 px-3">Reported Period</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E0DA]">
                    {citySystems.map((sys) => (
                      <tr key={sys.id}>
                        <td className="py-2.5 px-3 font-semibold text-[#141821]">{sys.shortName}</td>
                        <td className="py-2.5 px-3 font-mono">{sys.operatingHours}</td>
                        <td className="py-2.5 px-3 font-mono">{sys.headwayPeakMin}</td>
                        <td className="py-2.5 px-3 font-mono">{sys.fareRangeInr}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#1D4ED8]">
                          {sys.dailyRidershipAvg ? sys.dailyRidershipAvg.toLocaleString() : 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 text-[#525866]">{sys.ridershipDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 11 & 12. Connectivity & Expansion */}
            <section id="sec-11" className="bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-4">
              <div className="text-xs font-mono text-[#1D4ED8]">11 & 12 / Connectivity & Expansion</div>
              <div id="sec-12" />
              <p className="text-sm text-[#525866] leading-relaxed">
                <strong className="text-[#141821]">Multi-Modal Integration:</strong> {selectedCity.connectivityNotes}
              </p>
              {cityExpansions.length > 0 && (
                <div className="pt-3 border-t border-[#E2E0DA] space-y-2.5">
                  <div className="text-xs font-semibold text-[#141821]">Under-Construction, Approved & Proposed Projects</div>
                  {cityExpansions.map((exp) => (
                    <div key={exp.id} className="p-3 bg-[#F8F7F4] border border-[#E2E0DA] rounded space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#141821]">{exp.title}</span>
                        <StatusLabel status={exp.status} />
                      </div>
                      <p className="text-xs text-[#525866]">{exp.corridorDetails}</p>
                      <div className="text-[11px] font-mono text-[#7D8491]">
                        {exp.lengthKm} km · {exp.implementingAgency} · Target {exp.expectedTimeline} · {exp.estimatedCostCr}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 13, 14, 15. Challenges, Future Outlook & References */}
            <section id="sec-13" className="bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-4">
              <div className="text-xs font-mono text-[#1D4ED8]">13, 14 & 15 / Challenges, Future Outlook & References</div>
              <div id="sec-14" />
              <div id="sec-15" />
              <div>
                <h3 className="text-sm font-semibold text-[#141821]">Key Structural & Operational Challenges</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-[#525866] list-disc pl-5">
                  {selectedCity.challenges.map((ch) => (
                    <li key={ch}>{ch}</li>
                  ))}
                </ul>
              </div>
              <div className="pt-3 border-t border-[#E2E0DA]">
                <h3 className="text-sm font-semibold text-[#141821]">Future Outlook</h3>
                <p className="mt-1.5 text-sm text-[#525866] leading-relaxed">{selectedCity.futureOutlook}</p>
              </div>
              <div className="pt-3 border-t border-[#E2E0DA]">
                <h3 className="text-sm font-semibold text-[#141821] mb-2">Primary References</h3>
                <div className="space-y-2">
                  {citySources.map((src) => (
                    <div key={src.id} className="text-xs text-[#525866] flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <strong className="text-[#141821]">{src.title}</strong> ({src.publisher}, accessed {src.accessedAt})
                      </span>
                      <a href={src.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#1D4ED8] hover:underline">
                        <span>Source</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // City Directory Index
  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="border-b border-[#E2E0DA] pb-6 space-y-2">
        <p className="text-xs font-mono uppercase tracking-wider text-[#525866]">
          Standardized 15-Section Profiles · {cities.length} Cities
        </p>
        <h1 className="text-3xl sm:text-4xl font-serif font-semibold text-[#141821]">
          City-Wise Urban Transit Profiles
        </h1>
        <p className="text-sm text-[#525866] max-w-3xl">
          Every city follows a uniform 15-section encyclopedic template combining metro rail, suburban rail, bus networks, BRTS, tramways, monorail, and water transit.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by city or state..."
          className="px-3.5 py-2 text-xs bg-white border border-[#E2E0DA] rounded-md min-w-[240px] focus:outline-none focus:border-[#1D4ED8]"
        />
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EBE8E1]/60 border border-[#E2E0DA] rounded-md">
          {['all', 'North', 'West', 'South', 'East', 'Central'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRegionFilter(r)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                regionFilter === r ? 'bg-white text-[#141821] shadow-xs' : 'text-[#525866] hover:text-[#141821]'
              }`}
            >
              {r === 'all' ? 'All Regions' : r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCities.map((city) => {
          const citySystems = systems.filter((s) => s.cityId === city.id);
          const opKm = citySystems
            .filter((s) => s.status === 'Operational' || s.status === 'Partially Operational')
            .reduce((acc, s) => acc + s.operationalLengthKm, 0);
          return (
            <article
              key={city.id}
              className="bg-white border border-[#E2E0DA] hover:border-[#1D4ED8] rounded-lg p-5 flex flex-col justify-between space-y-4 transition-colors"
            >
              <div className="space-y-2">
                <div className="text-xs font-mono text-[#525866]">
                  {city.state} · {city.urbanAgglomerationPopM}M Urban Pop.
                </div>
                <h2 className="text-2xl font-serif font-semibold text-[#141821]">{city.name}</h2>
                <p className="text-xs text-[#525866] leading-relaxed line-clamp-3">{city.overview}</p>
              </div>

              <div className="space-y-3 pt-3 border-t border-[#E2E0DA]">
                <div className="text-xs text-[#525866]">
                  <span className="font-semibold text-[#141821]">{citySystems.length} transit systems:</span>{' '}
                  {citySystems.map((s) => s.shortName).join(' · ')}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono tabular-nums text-[#141821]">
                    {opKm.toFixed(1)} km mapped corridors
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectCity(city.id)}
                    className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                  >
                    Open 15-Section Profile →
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Future Pipeline — Upcoming Phase 2 Extensions & Coming Soon Cities */}
      <section className="pt-8 border-t border-[#E2E0DA] space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-mono uppercase tracking-wider text-[#0F766E]">
              Coming Soon Cities & Corridor Extensions · {comingSoonCities.length} Projects Indexed
            </p>
            <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-[#141821]">
              Future Pipeline
            </h2>
            <p className="text-sm text-[#525866] max-w-3xl">
              Upcoming Phase 2 expansions and greenfield urban rapid transit networks currently in trial runs, civil construction, or approved DPR stages across India.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EBE8E1]/60 border border-[#E2E0DA] rounded-md self-start md:self-auto">
            {[
              { id: 'all', label: 'All Upcoming' },
              { id: 'extension', label: 'Phase 2 & Extensions' },
              { id: 'new-city', label: 'New City Metros' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPipelineFilter(tab.id as 'all' | 'extension' | 'new-city')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  pipelineFilter === tab.id
                    ? 'bg-white text-[#141821] shadow-xs'
                    : 'text-[#525866] hover:text-[#141821]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredPipeline.length === 0 ? (
          <div className="bg-white border border-[#E2E0DA] rounded-lg p-6 text-sm text-[#525866]">
            No upcoming pipeline corridors match the current filter. Clear the search bar or switch to All Upcoming.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPipeline.map((project) => (
              <article
                key={project.id}
                className="bg-white border border-[#E2E0DA] rounded-lg p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs font-mono text-[#525866]">
                    <span>{project.state}</span>
                    <span className="text-[#0F766E] font-medium">{project.expectedLaunch}</span>
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-[#141821]">
                    {project.name}
                  </h3>
                  <div className="text-xs font-medium text-[#141821]">
                    {project.systemName}
                  </div>
                  <p className="text-xs text-[#525866] leading-relaxed">
                    {project.summary}
                  </p>
                  <div className="text-[11px] text-[#525866] pt-1">
                    <span className="font-semibold text-[#141821]">Corridors:</span> {project.corridors}
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#E2E0DA]">
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                    <div>
                      <div className="text-[10px] font-sans text-[#7D8491]">Length</div>
                      <div className="font-semibold text-[#141821]">{project.phase1Km} km</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-sans text-[#7D8491]">Stations</div>
                      <div className="font-semibold text-[#141821]">{project.stationsPlanned}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-sans text-[#7D8491]">Est. Fare</div>
                      <div className="font-semibold text-[#141821]">{project.estimatedFareRangeInr.replace(' (Est.)', '')}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                    <span className="font-mono text-[#B45309] font-medium">
                      {project.currentStage}
                    </span>
                    <div className="flex items-center gap-3">
                      {project.relatedCityId && (
                        <button
                          type="button"
                          onClick={() => onSelectCity(project.relatedCityId!)}
                          className="font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap"
                        >
                          Parent City →
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenMapCity(project.relatedCityId || cities[0].id)}
                        className="font-medium text-[#525866] hover:text-[#141821] whitespace-nowrap"
                      >
                        Atlas Map
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
