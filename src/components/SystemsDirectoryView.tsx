import React, { useMemo, useState } from 'react';
import { ArrowLeft, Compass, ExternalLink, Filter } from 'lucide-react';
import { useTransitData } from '../context/TransitDataContext';
import { ModeId, OperationalStatus, TransitSystem } from '../types/transit';
import { ImageWithFallback } from './ImageWithFallback';
import { StatusLabel } from './StatusText';

interface SystemsDirectoryViewProps {
  selectedModeId: ModeId | 'all';
  selectedSystemId: string | null;
  onSelectMode: (modeId: ModeId | 'all') => void;
  onSelectSystem: (systemId: string | null) => void;
  onSelectCity: (cityId: string) => void;
  onOpenMapCity: (cityId: string) => void;
}

export const SystemsDirectoryView: React.FC<SystemsDirectoryViewProps> = ({
  selectedModeId,
  selectedSystemId,
  onSelectMode,
  onSelectSystem,
  onSelectCity,
  onOpenMapCity,
}) => {
  const { modes, cities, systems, lines, stations, projects, getSourcesByIds } = useTransitData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OperationalStatus | 'all'>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');

  const uniqueStates = useMemo(
    () => Array.from(new Set(cities.map((c) => c.state))).sort(),
    [cities]
  );

  const activeMode = useMemo(
    () => (selectedModeId === 'all' ? null : modes.find((m) => m.id === selectedModeId) ?? null),
    [modes, selectedModeId]
  );

  const selectedSystem: TransitSystem | null = useMemo(
    () => (selectedSystemId ? systems.find((s) => s.id === selectedSystemId) ?? null : null),
    [systems, selectedSystemId]
  );

  const filteredSystems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return systems.filter((sys) => {
      if (selectedModeId !== 'all' && sys.modeId !== selectedModeId) return false;
      if (statusFilter !== 'all' && sys.status !== statusFilter) return false;
      const city = cities.find((c) => c.id === sys.cityId);
      if (stateFilter !== 'all' && city?.state !== stateFilter) return false;
      if (
        q &&
        !sys.name.toLowerCase().includes(q) &&
        !sys.operator.toLowerCase().includes(q) &&
        !(city?.name.toLowerCase().includes(q))
      ) {
        return false;
      }
      return true;
    });
  }, [systems, cities, selectedModeId, statusFilter, stateFilter, searchTerm]);

  // Dedicated Transit System Profile Page
  if (selectedSystem) {
    const city = cities.find((c) => c.id === selectedSystem.cityId);
    const mode = modes.find((m) => m.id === selectedSystem.modeId);
    const systemLines = lines.filter((l) => l.systemId === selectedSystem.id);
    const systemStations = stations.filter((st) => st.systemId === selectedSystem.id);
    const systemExpansion = projects.filter(
      (p) => p.systemId === selectedSystem.id || (p.cityId === selectedSystem.cityId && p.modeId === selectedSystem.modeId)
    );
    const sysSources = getSourcesByIds(selectedSystem.sourceIds);

    return (
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Breadcrumb & Back */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E0DA] pb-5">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onSelectSystem(null)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1D4ED8] hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Back to Transit Systems Directory</span>
            </button>
            <div className="text-xs font-mono text-[#525866] pt-1">
              {mode?.name} · {city?.name} · Verification: {selectedSystem.verificationStatus} · As of {selectedSystem.dataAsOf}
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-semibold text-[#141821]">
              {selectedSystem.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {city && (
              <>
                <button
                  type="button"
                  onClick={() => onSelectCity(city.id)}
                  className="px-3.5 py-2 text-xs font-semibold bg-white border border-[#E2E0DA] hover:border-[#141821] text-[#141821] rounded-md"
                >
                  View {city.name} Profile
                </button>
                <button
                  type="button"
                  onClick={() => onOpenMapCity(city.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md"
                >
                  <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Open Corridor Map</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Summary & Key Network Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-3">
              <StatusLabel status={selectedSystem.status} />
              <span className="text-xs text-[#525866] font-mono">
                Commenced: {selectedSystem.operationalSince}
              </span>
            </div>
            <p className="text-base text-[#141821] leading-relaxed">{selectedSystem.summary}</p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E2E0DA] text-sm">
              <div>
                <dt className="text-xs text-[#525866]">Operating Authority</dt>
                <dd className="font-medium text-[#141821] mt-0.5">{selectedSystem.operator}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#525866]">Ownership & Governance</dt>
                <dd className="font-medium text-[#141821] mt-0.5">{selectedSystem.ownershipModel}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#525866]">Operating Hours & Peak Headway</dt>
                <dd className="font-mono text-xs text-[#141821] mt-0.5">
                  {selectedSystem.operatingHours} · {selectedSystem.headwayPeakMin}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#525866]">Fare Range & Ticketing</dt>
                <dd className="text-xs text-[#141821] mt-0.5">
                  <span className="font-mono font-semibold">{selectedSystem.fareRangeInr}</span> ·{' '}
                  {selectedSystem.ticketingSystems.join(', ')}
                </dd>
              </div>
            </dl>
          </div>

          <div className="lg:col-span-5 bg-white border border-[#E2E0DA] rounded-lg p-5 space-y-4">
            <h2 className="text-base font-serif font-semibold text-[#141821]">
              Network & Alignment Breakdown
            </h2>
            <div className="grid grid-cols-2 gap-4 font-mono tabular-nums">
              <div>
                <div className="text-xs font-sans text-[#525866]">Operational Length</div>
                <div className="text-2xl font-semibold text-[#141821]">
                  {selectedSystem.operationalLengthKm > 0 ? `${selectedSystem.operationalLengthKm} km` : 'Surface Fleet'}
                </div>
              </div>
              <div>
                <div className="text-xs font-sans text-[#525866]">Under Construction</div>
                <div className="text-2xl font-semibold text-[#B45309]">
                  {selectedSystem.underConstructionKm} km
                </div>
              </div>
              <div>
                <div className="text-xs font-sans text-[#525866]">Stations / Stops</div>
                <div className="text-xl font-semibold text-[#141821]">
                  {selectedSystem.totalStations.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs font-sans text-[#525866]">Daily Ridership ({selectedSystem.ridershipDate})</div>
                <div className="text-xl font-semibold text-[#1D4ED8]">
                  {selectedSystem.dailyRidershipAvg
                    ? `${(selectedSystem.dailyRidershipAvg / 1000).toLocaleString()}k`
                    : 'Not Reported'}
                </div>
              </div>
            </div>
            {(selectedSystem.elevatedKm > 0 || selectedSystem.undergroundKm > 0 || selectedSystem.atGradeKm > 0) && (
              <div className="pt-3 border-t border-[#E2E0DA] text-xs font-mono tabular-nums text-[#525866] flex flex-wrap gap-x-4 gap-y-1">
                <span>Elevated: {selectedSystem.elevatedKm} km</span>
                <span>Underground: {selectedSystem.undergroundKm} km</span>
                <span>At-Grade / Water: {selectedSystem.atGradeKm} km</span>
              </div>
            )}
            <p className="text-xs text-[#525866] leading-relaxed">{selectedSystem.annualRidershipNote}</p>
          </div>
        </div>

        {/* Technical Specifications Grid */}
        <section className="bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-serif font-semibold text-[#141821]">
            Technical, Rolling Stock & Signalling Specifications
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-sm">
            <div>
              <div className="text-xs text-[#525866]">Track Gauge / Guideway</div>
              <div className="font-medium text-[#141821] mt-1">{selectedSystem.trackGauge}</div>
            </div>
            <div>
              <div className="text-xs text-[#525866]">Electrification & Power</div>
              <div className="font-medium text-[#141821] mt-1">{selectedSystem.electrification}</div>
            </div>
            <div>
              <div className="text-xs text-[#525866]">Signalling & Train Control</div>
              <div className="font-medium text-[#141821] mt-1">{selectedSystem.signallingSystem}</div>
            </div>
            <div>
              <div className="text-xs text-[#525866]">Automation Level (GoA)</div>
              <div className="font-medium text-[#141821] mt-1">{selectedSystem.atoLevel}</div>
            </div>
            <div>
              <div className="text-xs text-[#525866]">Rolling Stock / Fleet</div>
              <div className="font-medium text-[#141821] mt-1">{selectedSystem.rollingStockSummary}</div>
            </div>
            <div>
              <div className="text-xs text-[#525866]">Active Fleet Size</div>
              <div className="font-medium text-[#141821] mt-1 font-mono">{selectedSystem.fleetCountLabel}</div>
            </div>
          </div>
        </section>

        {/* Line-Wise Database Table */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif font-semibold text-[#141821]">
              Line-Wise Corridor Directory ({systemLines.length} indexed)
            </h2>
          </div>
          {systemLines.length === 0 ? (
            <div className="bg-white border border-[#E2E0DA] rounded-lg p-6 text-sm text-[#525866]">
              Individual corridor geometries for this network are summarized at system level; granular route polylines are progressively added in the Research Registry.
            </div>
          ) : (
            <div className="bg-white border border-[#E2E0DA] rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#F8F7F4] border-b border-[#E2E0DA] text-xs font-medium text-[#525866]">
                    <th className="py-3 px-4">Line</th>
                    <th className="py-3 px-4">Terminals</th>
                    <th className="py-3 px-4 text-right">Length</th>
                    <th className="py-3 px-4 text-right">Stations</th>
                    <th className="py-3 px-4">Opened</th>
                    <th className="py-3 px-4">Signalling & Stock</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E0DA]">
                  {systemLines.map((line) => (
                    <tr key={line.id} className="hover:bg-[#F8F7F4]/60">
                      <td className="py-3 px-4 font-semibold text-[#141821] whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: line.colorHex }}
                          />
                          <span>{line.name}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#525866]">
                        {line.startStation} ↔ {line.terminalStation}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                        {line.lengthKm} km
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                        {line.stationCount}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-xs whitespace-nowrap">
                        {line.openingDate}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#525866]">
                        {line.signalling} · {line.rollingStock}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusLabel status={line.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Station & Interchange Directory */}
        {systemStations.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-serif font-semibold text-[#141821]">
              Key Verified Stations & Interchanges ({systemStations.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemStations.map((st) => (
                <div key={st.id} className="bg-white border border-[#E2E0DA] rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#141821]">{st.name}</h3>
                    <span className="text-[11px] font-mono text-[#525866] shrink-0">
                      {st.stationType}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-[#7D8491]">
                    {st.latitude.toFixed(4)}°N, {st.longitude.toFixed(4)}°E · Opened {st.openedYear}
                  </div>
                  <p className="text-xs text-[#525866]">
                    Interchanges: {st.interchangeModes.join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Finance, Environment, Safety, Accessibility, Integration */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-[#E2E0DA] rounded-lg p-5 space-y-3">
            <h3 className="text-base font-serif font-semibold text-[#141821]">Financial Model & Project Cost</h3>
            <p className="text-sm text-[#525866] leading-relaxed">{selectedSystem.projectCostNote}</p>
            <h3 className="text-base font-serif font-semibold text-[#141821] pt-2">Environmental & Energy Profile</h3>
            <p className="text-sm text-[#525866] leading-relaxed">{selectedSystem.environmentalNotes}</p>
          </div>
          <div className="bg-white border border-[#E2E0DA] rounded-lg p-5 space-y-3">
            <h3 className="text-base font-serif font-semibold text-[#141821]">Safety, Accessibility & Intermodal Links</h3>
            <p className="text-xs text-[#525866] leading-relaxed">
              <strong className="text-[#141821]">Safety Systems:</strong> {selectedSystem.safetySystems}
            </p>
            <p className="text-xs text-[#525866] leading-relaxed">
              <strong className="text-[#141821]">Accessibility:</strong> {selectedSystem.accessibilityNotes}
            </p>
            <p className="text-xs text-[#525866] leading-relaxed">
              <strong className="text-[#141821]">Intermodal Integration:</strong> {selectedSystem.intermodalIntegration}
            </p>
          </div>
        </section>

        {/* Expansion & Verified Sources */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[#E2E0DA] rounded-lg p-5 space-y-3">
            <h3 className="text-base font-serif font-semibold text-[#141821]">Expansion & Future Corridors</h3>
            {systemExpansion.length === 0 ? (
              <p className="text-xs text-[#525866]">No active phase expansion projects currently logged for this system.</p>
            ) : (
              <div className="divide-y divide-[#E2E0DA]">
                {systemExpansion.map((exp) => (
                  <div key={exp.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#141821]">{exp.title}</span>
                      <StatusLabel status={exp.status} />
                    </div>
                    <p className="text-xs text-[#525866]">{exp.corridorDetails}</p>
                    <p className="text-[11px] font-mono text-[#7D8491]">
                      {exp.lengthKm} km · Target: {exp.expectedTimeline} · Est. {exp.estimatedCostCr}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-[#E2E0DA] rounded-lg p-5 space-y-3">
            <h3 className="text-base font-serif font-semibold text-[#141821]">Sources & References</h3>
            <div className="divide-y divide-[#E2E0DA]">
              {sysSources.map((src) => (
                <div key={src.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="text-sm font-medium text-[#141821]">{src.title}</div>
                  <div className="text-xs text-[#525866] mt-0.5">
                    {src.publisher} · {src.reportingPeriod} · Accessed {src.accessedAt}
                  </div>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#1D4ED8] hover:underline mt-1"
                  >
                    <span>Official Source</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Systems Directory List View
  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="border-b border-[#E2E0DA] pb-6 space-y-2">
        <p className="text-xs font-mono uppercase tracking-wider text-[#525866]">
          Multi-Modal Transit Encyclopedia · 8 Categories
        </p>
        <h1 className="text-3xl sm:text-4xl font-serif font-semibold text-[#141821]">
          Urban Transit Systems Directory
        </h1>
        <p className="text-sm text-[#525866] max-w-3xl">
          Explore verified urban transportation systems across India, classified into eight distinct operational modes with strict separation of operational versus under-construction figures.
        </p>
      </div>

      {/* Mode Segmented Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-[#EBE8E1]/60 p-1.5 rounded-lg border border-[#E2E0DA]">
        <button
          type="button"
          onClick={() => onSelectMode('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            selectedModeId === 'all'
              ? 'bg-white text-[#141821] shadow-xs'
              : 'text-[#525866] hover:text-[#141821]'
          }`}
        >
          All Modes ({systems.length})
        </button>
        {modes.map((m) => {
          const count = systems.filter((s) => s.modeId === m.id).length;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectMode(m.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedModeId === m.id
                  ? 'bg-white text-[#141821] shadow-xs'
                  : 'text-[#525866] hover:text-[#141821]'
              }`}
            >
              {m.shortName} ({count})
            </button>
          );
        })}
      </div>

      {/* Mode Definition Banner when a specific mode is selected */}
      {activeMode && (
        <div className="bg-white border border-[#E2E0DA] rounded-lg p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className={activeMode.imagePath ? 'lg:col-span-8 space-y-3' : 'lg:col-span-12 space-y-3'}>
            <div className="text-xs font-mono text-[#1D4ED8]">
              Category 0{activeMode.order} · Classification & Scope
            </div>
            <h2 className="text-2xl font-serif font-semibold text-[#141821]">{activeMode.name}</h2>
            <p className="text-sm text-[#141821] leading-relaxed">{activeMode.definition}</p>
            <p className="text-xs text-[#525866] leading-relaxed">
              <strong>Scope Boundary:</strong> {activeMode.scopeBoundary}
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[#525866] pt-1">
              {activeMode.keyCharacteristics.map((ch) => (
                <li key={ch} className="flex items-start gap-2">
                  <span className="text-[#1D4ED8]">—</span>
                  <span>{ch}</span>
                </li>
              ))}
            </ul>
          </div>
          {activeMode.imagePath && (
            <div className="lg:col-span-4">
              <ImageWithFallback src={activeMode.imagePath} alt={activeMode.name} aspectClass="aspect-[4/3]" />
            </div>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-[#E2E0DA] rounded-lg p-3.5">
        <div className="flex items-center gap-2 text-xs font-medium text-[#525866]">
          <Filter className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Filters:</span>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search system, city, or operator..."
          className="flex-1 min-w-[200px] px-3 py-1.5 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded focus:outline-none focus:border-[#1D4ED8]"
        />
        <select
          aria-label="Filter by state"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="px-3 py-1.5 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded text-[#141821]"
        >
          <option value="all">All States / Regions</option>
          {uniqueStates.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OperationalStatus | 'all')}
          className="px-3 py-1.5 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded text-[#141821]"
        >
          <option value="all">All Statuses</option>
          <option value="Operational">Operational</option>
          <option value="Partially Operational">Partially Operational</option>
          <option value="Under Construction">Under Construction</option>
          <option value="Approved">Approved</option>
          <option value="Proposed">Proposed</option>
          <option value="Suspended / Dismantled">Suspended / Dismantled</option>
        </select>
      </div>

      {/* Systems Grid */}
      {filteredSystems.length === 0 ? (
        <div className="bg-white border border-[#E2E0DA] rounded-lg p-10 text-center space-y-2">
          <p className="text-sm font-semibold text-[#141821]">No transit systems match the selected filters</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setStateFilter('all');
              onSelectMode('all');
            }}
            className="text-xs font-semibold text-[#1D4ED8] hover:underline"
          >
            Reset all directory filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSystems.map((sys) => {
            const city = cities.find((c) => c.id === sys.cityId);
            const mode = modes.find((m) => m.id === sys.modeId);
            return (
              <article
                key={sys.id}
                className="bg-white border border-[#E2E0DA] hover:border-[#1D4ED8] rounded-lg p-5 transition-colors flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="text-xs text-[#525866] font-mono">
                    {mode?.shortName} · {city?.name} · Since {sys.operationalSince.slice(0, 4)}
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-[#141821]">{sys.name}</h3>
                  <p className="text-xs text-[#525866] leading-relaxed line-clamp-3">{sys.summary}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-[#E2E0DA]">
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                    <div>
                      <div className="text-[11px] font-sans text-[#7D8491]">Operational</div>
                      <div className="font-semibold text-[#141821]">
                        {sys.operationalLengthKm > 0 ? `${sys.operationalLengthKm} km` : 'Surface'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-sans text-[#7D8491]">Stations</div>
                      <div className="font-semibold text-[#141821]">{sys.totalStations.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-sans text-[#7D8491]">Daily Avg</div>
                      <div className="font-semibold text-[#1D4ED8]">
                        {sys.dailyRidershipAvg ? `${(sys.dailyRidershipAvg / 1000).toFixed(0)}k` : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <StatusLabel status={sys.status} />
                    <button
                      type="button"
                      onClick={() => onSelectSystem(sys.id)}
                      className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                    >
                      Inspect System →
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
