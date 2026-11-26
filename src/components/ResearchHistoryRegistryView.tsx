import React, { useMemo, useState } from 'react';
import { Database, Download, ExternalLink, Plus, RotateCcw } from 'lucide-react';
import { useTransitData } from '../context/TransitDataContext';
import { ModeId, OperationalStatus } from '../types/transit';

interface ResearchHistoryRegistryViewProps {
  onSelectCity: (cityId: string) => void;
}

export const ResearchHistoryRegistryView: React.FC<ResearchHistoryRegistryViewProps> = ({
  onSelectCity,
}) => {
  const {
    milestones,
    sources,
    cities,
    modes,
    systems,
    lines,
    stations,
    addLine,
    addStation,
    addSource,
    resetRegistry,
    hasCustomEntries,
  } = useTransitData();

  const [activeTab, setActiveTab] = useState<'history' | 'methodology' | 'registry'>('history');
  const [historyModeFilter, setHistoryModeFilter] = useState<ModeId | 'all'>('all');

  // Registry Workbench Forms
  const [entryType, setEntryType] = useState<'line' | 'station' | 'source'>('line');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Add Line Form State
  const [lineSystemId, setLineSystemId] = useState(systems[0]?.id ?? 'sys-delhi-metro');
  const [lineName, setLineName] = useState('');
  const [lineStart, setLineStart] = useState('');
  const [lineEnd, setLineEnd] = useState('');
  const [lineLength, setLineLength] = useState('');
  const [lineStations, setLineStations] = useState('');
  const [lineStatus, setLineStatus] = useState<OperationalStatus>('Operational');
  const [lineColor, setLineColor] = useState('#1D4ED8');

  // Add Station Form State
  const [stSystemId, setStSystemId] = useState(systems[0]?.id ?? 'sys-delhi-metro');
  const [stName, setStName] = useState('');
  const [stLat, setStLat] = useState('');
  const [stLng, setStLng] = useState('');
  const [stType, setStType] = useState<'Elevated' | 'Underground' | 'At-Grade' | 'Ferry Terminal' | 'Median BRT' | 'Suburban Terminal'>('Elevated');

  // Add Source Form State
  const [srcTitle, setSrcTitle] = useState('');
  const [srcPublisher, setSrcPublisher] = useState('');
  const [srcPeriod, setSrcPeriod] = useState('2026');
  const [srcUrl, setSrcUrl] = useState('https://mohua.gov.in');

  const filteredMilestones = useMemo(() => {
    const list =
      historyModeFilter === 'all'
        ? milestones
        : milestones.filter((m) => m.modeId === historyModeFilter);
    return [...list].sort((a, b) => a.year - b.year);
  }, [milestones, historyModeFilter]);

  const handleAddLine = (e: React.FormEvent) => {
    e.preventDefault();
    const sys = systems.find((s) => s.id === lineSystemId);
    const city = cities.find((c) => c.id === sys?.cityId);
    if (!sys || !city || !lineName.trim() || !lineLength) return;

    addLine({
      id: `line-custom-${Date.now()}`,
      systemId: sys.id,
      cityId: city.id,
      name: lineName.trim(),
      lineCode: lineName.trim().slice(0, 3).toUpperCase(),
      colorHex: lineColor,
      startStation: lineStart.trim() || 'Origin Terminal',
      terminalStation: lineEnd.trim() || 'End Terminal',
      lengthKm: Number(lineLength),
      stationCount: Number(lineStations) || 10,
      openingDate: '2026-11-15',
      status: lineStatus,
      trackGauge: sys.trackGauge,
      electrification: sys.electrification,
      rollingStock: sys.rollingStockSummary,
      signalling: sys.signallingSystem,
      interchanges: [],
      coordinatesPath: [
        city.coordinates,
        [city.coordinates[0] + 0.04, city.coordinates[1] + 0.04],
      ],
      notes: 'Added via India Transit Atlas Research Registry.',
    });

    setLineName('');
    setLineStart('');
    setLineEnd('');
    setLineLength('');
    setLineStations('');
    setFeedbackMsg(
      `Added "${lineName.trim()}" to ${sys.name}. National KPIs, city profile, and corridor tables updated automatically.`
    );
  };

  const handleAddStation = (e: React.FormEvent) => {
    e.preventDefault();
    const sys = systems.find((s) => s.id === stSystemId);
    const city = cities.find((c) => c.id === sys?.cityId);
    if (!sys || !city || !stName.trim() || !stLat || !stLng) return;

    const matchingLine = lines.find((l) => l.systemId === sys.id);
    addStation({
      id: `st-custom-${Date.now()}`,
      name: stName.trim(),
      cityId: city.id,
      systemId: sys.id,
      lineIds: matchingLine ? [matchingLine.id] : [],
      latitude: Number(stLat),
      longitude: Number(stLng),
      stationType: stType,
      isInterchange: true,
      interchangeModes: [sys.name],
      accessibilityFeatures: ['Elevators', 'Tactile Guidance'],
      facilities: ['AFC Gates'],
      openedYear: 2026,
      status: 'Operational',
    });

    setStName('');
    setStLat('');
    setStLng('');
    setFeedbackMsg(
      `Added station "${stName.trim()}" (${stLat}°N, ${stLng}°E) to ${city.name}. Visible now on the Interactive Map.`
    );
  };

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!srcTitle.trim() || !srcPublisher.trim()) return;
    addSource({
      id: `src-custom-${Date.now()}`,
      title: srcTitle.trim(),
      publisher: srcPublisher.trim(),
      documentType: 'Research Verification Record',
      publicationDate: '2026-11-15',
      accessedAt: '2026-11-15',
      reportingPeriod: srcPeriod.trim() || '2026',
      url: srcUrl.trim() || 'https://mohua.gov.in',
      verificationStatus: 'Verified Research',
    });
    setSrcTitle('');
    setSrcPublisher('');
    setFeedbackMsg(`Source citation "${srcTitle.trim()}" logged in the Source Transparency Table.`);
  };

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      cities,
      systems,
      lines,
      stations,
      sources,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'india-transit-atlas-dataset.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E0DA] pb-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#525866]">
            Historical Archive · Methodology · Relational Data Registry
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif font-semibold text-[#141821] mt-1">
            History, Research & Data Registry
          </h1>
        </div>

        <div className="inline-flex p-1 bg-[#EBE8E1]/70 border border-[#E2E0DA] rounded-lg self-start">
          {(
            [
              { id: 'history', label: 'Historical Timeline' },
              { id: 'methodology', label: 'Methodology & Sources' },
              { id: 'registry', label: 'Data Registry' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === t.id ? 'bg-white text-[#141821] shadow-xs' : 'text-[#525866] hover:text-[#141821]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: HISTORICAL TIMELINE */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setHistoryModeFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                historyModeFilter === 'all'
                  ? 'bg-[#141821] text-white border-[#141821]'
                  : 'bg-white text-[#525866] border-[#E2E0DA] hover:text-[#141821]'
              }`}
            >
              All Eras & Modes
            </button>
            {modes.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setHistoryModeFilter(m.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  historyModeFilter === m.id
                    ? 'bg-[#141821] text-white border-[#141821]'
                    : 'bg-white text-[#525866] border-[#E2E0DA] hover:text-[#141821]'
                }`}
              >
                {m.shortName}
              </button>
            ))}
          </div>

          <div className="bg-white border border-[#E2E0DA] rounded-lg divide-y divide-[#E2E0DA]">
            {filteredMilestones.map((m) => {
              const city = cities.find((c) => c.id === m.cityId);
              const mode = modes.find((md) => md.id === m.modeId);
              return (
                <article key={m.id} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div className="md:col-span-3 space-y-1">
                    <div className="text-2xl font-serif font-semibold text-[#1D4ED8] tabular-nums">{m.year}</div>
                    <div className="text-xs font-mono text-[#525866]">{m.dateLabel}</div>
                    <div className="text-xs text-[#525866]">
                      {mode?.shortName} ·{' '}
                      {city && (
                        <button
                          type="button"
                          onClick={() => onSelectCity(city.id)}
                          className="text-[#141821] font-medium hover:text-[#1D4ED8] hover:underline"
                        >
                          {city.name}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-9 space-y-2">
                    <h2 className="text-lg font-serif font-semibold text-[#141821]">{m.title}</h2>
                    <p className="text-sm text-[#141821] leading-relaxed">{m.summary}</p>
                    <p className="text-xs text-[#525866] leading-relaxed">
                      <strong>Significance:</strong> {m.significance}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: METHODOLOGY & SOURCES */}
      {activeTab === 'methodology' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-3">
              <h2 className="text-xl font-serif font-semibold text-[#141821]">
                Status Classification & Non-Aggregation Rules
              </h2>
              <p className="text-sm text-[#525866] leading-relaxed">
                India Transit Atlas strictly separates <strong>Operational</strong>, <strong>Partially Operational</strong>, <strong>Under Construction</strong>, <strong>Approved</strong>, <strong>Proposed</strong>, and <strong>Suspended / Dismantled</strong> corridors. Under-construction or DPR-proposed route lengths are never summed into operational national or city totals.
              </p>
            </div>
            <div className="bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-3">
              <h2 className="text-xl font-serif font-semibold text-[#141821]">
                Mode Scope Boundaries & Dated Snapshots
              </h2>
              <p className="text-sm text-[#525866] leading-relaxed">
                Suburban railways operated by Zonal Indian Railways (e.g., Mumbai Suburban, Kolkata Suburban, Chennai Suburban) are tracked separately from MoHUA/SPV Metro Rail networks. Every ridership and route-length record carries an explicit reporting period and source organization.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#E2E0DA] rounded-lg overflow-x-auto">
            <div className="px-5 py-4 border-b border-[#E2E0DA]">
              <h2 className="text-lg font-serif font-semibold text-[#141821]">
                Verified Source Transparency Index ({sources.length} Sources)
              </h2>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F7F4] border-b border-[#E2E0DA] text-[#525866]">
                  <th className="py-3 px-4">Document / Source Title</th>
                  <th className="py-3 px-4">Publisher</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Accessed</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E0DA]">
                {sources.map((src) => (
                  <tr key={src.id} className="hover:bg-[#F8F7F4]/60">
                    <td className="py-3 px-4 font-semibold text-[#141821]">{src.title}</td>
                    <td className="py-3 px-4 text-[#525866]">{src.publisher}</td>
                    <td className="py-3 px-4 font-mono">{src.reportingPeriod}</td>
                    <td className="py-3 px-4 font-mono tabular-nums">{src.accessedAt}</td>
                    <td className="py-3 px-4 font-medium text-[#1D4ED8]">{src.verificationStatus}</td>
                    <td className="py-3 px-4">
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#1D4ED8] hover:underline"
                      >
                        <span>Visit</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DATA REGISTRY WORKBENCH */}
      {activeTab === 'registry' && (
        <div className="space-y-8">
          <div className="bg-white border border-[#E2E0DA] rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-[#1D4ED8]">
                <Database className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Normalized Relational Store · Live Dynamic Recalculation</span>
              </div>
              <h2 className="text-xl font-serif font-semibold text-[#141821]">
                Transit Research Registry Workbench
              </h2>
              <p className="text-xs text-[#525866]">
                Add verified lines, station coordinates, or source citations directly to the normalized registry. All Homepage KPIs, City Profiles, Maps, and Analytics charts recompute immediately.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#141821] hover:bg-[#1D4ED8] text-white rounded-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Export JSON</span>
              </button>
              {hasCustomEntries && (
                <button
                  type="button"
                  onClick={() => {
                    resetRegistry();
                    setFeedbackMsg('Registry restored to verified baseline dataset.');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-[#E2E0DA] hover:border-[#B91C1C] text-[#B91C1C] rounded-md transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reset Baseline</span>
                </button>
              )}
            </div>
          </div>

          {feedbackMsg && (
            <div className="p-4 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg text-xs font-medium text-[#065F46]">
              {feedbackMsg}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Add Record Form */}
            <div className="lg:col-span-7 bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-[#E2E0DA] pb-3">
                {(
                  [
                    { id: 'line', label: 'Add Transit Line' },
                    { id: 'station', label: 'Add Station Coordinate' },
                    { id: 'source', label: 'Add Source Citation' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setEntryType(item.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      entryType === item.id ? 'bg-[#141821] text-white' : 'text-[#525866] hover:bg-[#EBE8E1]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {entryType === 'line' && (
                <form onSubmit={handleAddLine} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#141821] mb-1">Parent Transit System</label>
                      <select
                        value={lineSystemId}
                        onChange={(e) => setLineSystemId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded"
                      >
                        {systems.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#141821] mb-1">Line Name</label>
                      <input
                        required
                        type="text"
                        value={lineName}
                        onChange={(e) => setLineName(e.target.value)}
                        placeholder="e.g. Golden Line (Aerocity–Tughlakabad)"
                        className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#141821] mb-1">Starting Station</label>
                      <input
                        type="text"
                        value={lineStart}
                        onChange={(e) => setLineStart(e.target.value)}
                        placeholder="e.g. Aerocity"
                        className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#141821] mb-1">Terminal Station</label>
                      <input
                        type="text"
                        value={lineEnd}
                        onChange={(e) => setLineEnd(e.target.value)}
                        placeholder="e.g. Tughlakabad"
                        className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#141821] mb-1">Verified Length (km)</label>
                      <input
                        required
                        type="number"
                        step="0.1"
                        min="0.5"
                        value={lineLength}
                        onChange={(e) => setLineLength(e.target.value)}
                        placeholder="23.6"
                        className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#141821] mb-1">Station Count</label>
                      <input
                        type="number"
                        min="1"
                        value={lineStations}
                        onChange={(e) => setLineStations(e.target.value)}
                        placeholder="15"
                        className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#141821] mb-1">Operational Status</label>
                      <select
                        value={lineStatus}
                        onChange={(e) => setLineStatus(e.target.value as OperationalStatus)}
                        className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded"
                      >
                        <option value="Operational">Operational</option>
                        <option value="Partially Operational">Partially Operational</option>
                        <option value="Under Construction">Under Construction</option>
                        <option value="Approved">Approved</option>
                        <option value="Proposed">Proposed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#141821] mb-1">Line Indicator Colour</label>
                      <input
                        type="color"
                        value={lineColor}
                        onChange={(e) => setLineColor(e.target.value)}
                        className="h-9 w-full bg-[#F8F7F4] border border-[#E2E0DA] rounded p-1"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Save Line to Registry</span>
                  </button>
                </form>
              )}

              {entryType === 'station' && (
                <form onSubmit={handleAddStation} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#141821] mb-1">Parent Transit System</label>
                      <select
                        value={stSystemId}
                        onChange={(e) => setStSystemId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded"
                      >
                        {systems.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#141821] mb-1">Station Name</label>
                      <input
                        required
                        type="text"
                        value={stName}
                        onChange={(e) => setStName(e.target.value)}
                        placeholder="e.g. Indiranagar"
                        className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#141821] mb-1">Latitude (°N)</label>
                      <input
                        required
                        type="number"
                        step="0.0001"
                        value={stLat}
                        onChange={(e) => setStLat(e.target.value)}
                        placeholder="12.9784"
                        className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#141821] mb-1">Longitude (°E)</label>
                      <input
                        required
                        type="number"
                        step="0.0001"
                        value={stLng}
                        onChange={(e) => setStLng(e.target.value)}
                        placeholder="77.6408"
                        className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-[#141821] mb-1">Station Structure Type</label>
                      <select
                        value={stType}
                        onChange={(e) => setStType(e.target.value as typeof stType)}
                        className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded"
                      >
                        <option value="Elevated">Elevated</option>
                        <option value="Underground">Underground</option>
                        <option value="At-Grade">At-Grade</option>
                        <option value="Ferry Terminal">Ferry Terminal</option>
                        <option value="Median BRT">Median BRT</option>
                        <option value="Suburban Terminal">Suburban Terminal</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Save Station Coordinate</span>
                  </button>
                </form>
              )}

              {entryType === 'source' && (
                <form onSubmit={handleAddSource} className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[#141821] mb-1">Document / Report Title</label>
                      <input
                        required
                        type="text"
                        value={srcTitle}
                        onChange={(e) => setSrcTitle(e.target.value)}
                        placeholder="e.g. CMRL Monthly Progress Report — Oct 2026"
                        className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-[#141821] mb-1">Publisher / Authority</label>
                        <input
                          required
                          type="text"
                          value={srcPublisher}
                          onChange={(e) => setSrcPublisher(e.target.value)}
                          placeholder="e.g. Chennai Metro Rail Ltd."
                          className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#141821] mb-1">Reporting Period</label>
                        <input
                          type="text"
                          value={srcPeriod}
                          onChange={(e) => setSrcPeriod(e.target.value)}
                          placeholder="Q3 2026"
                          className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#141821] mb-1">Reference URL</label>
                      <input
                        type="url"
                        value={srcUrl}
                        onChange={(e) => setSrcUrl(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-[#E2E0DA] rounded font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-md"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Log Source Record</span>
                  </button>
                </form>
              )}
            </div>

            {/* Relational Schema Summary */}
            <div className="lg:col-span-5 bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-4">
              <h3 className="text-base font-serif font-semibold text-[#141821]">
                Normalized Relational Data Model
              </h3>
              <p className="text-xs text-[#525866] leading-relaxed">
                Transit entities are decoupled from UI templates. Every route, station, and city view queries these normalized tables:
              </p>
              <div className="divide-y divide-[#E2E0DA] text-xs font-mono">
                {[
                  ['cities', `${cities.length} rows`, 'id, name, state, lat/lng, urban_pop'],
                  ['transit_modes', `${modes.length} rows`, 'id, order, definition, scope_boundary'],
                  ['transit_systems', `${systems.length} rows`, 'id, city_id, mode_id, status, length_km'],
                  ['transit_lines', `${lines.length} rows`, 'id, system_id, path_coords, gauge, signalling'],
                  ['stations', `${stations.length} rows`, 'id, city_id, system_id, lat, lng, type'],
                  ['sources', `${sources.length} rows`, 'id, publisher, period, accessed_at, url'],
                ].map(([table, count, cols]) => (
                  <div key={table} className="py-2.5 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[#141821]">{table}</div>
                      <div className="text-[11px] text-[#7D8491] mt-0.5">{cols}</div>
                    </div>
                    <span className="text-[#1D4ED8] shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
