import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTransitData } from '../context/TransitDataContext';
import { NATIONAL_METRO_GROWTH_SERIES } from '../data/transitDatabase';
import { StatusLabel } from './StatusText';

interface AnalyticsTechExpansionViewProps {
  onSelectCity: (cityId: string) => void;
  onSelectSystem: (systemId: string) => void;
}

export const AnalyticsTechExpansionView: React.FC<AnalyticsTechExpansionViewProps> = ({
  onSelectCity,
  onSelectSystem,
}) => {
  const { systems, cities, projects, ridershipSnapshots, modes } = useTransitData();
  const [activeTab, setActiveTab] = useState<'statistics' | 'technology' | 'expansion'>('statistics');
  const [expansionFilter, setExpansionFilter] = useState<'all' | 'Under Construction' | 'Approved' | 'Proposed'>('all');

  const metroComparisonData = useMemo(() => {
    return systems
      .filter((s) => s.modeId === 'metro-rail')
      .sort((a, b) => b.operationalLengthKm - a.operationalLengthKm)
      .map((s) => ({
        name: s.shortName.replace('MahaMetro ', '').replace('UPMRC ', ''),
        operational: s.operationalLengthKm,
        underConstruction: s.underConstructionKm,
        approved: s.approvedKm,
      }));
  }, [systems]);

  const ridershipChartData = useMemo(() => {
    return ridershipSnapshots
      .slice()
      .sort((a, b) => b.dailyAvgPassengers - a.dailyAvgPassengers)
      .map((r) => {
        const sys = systems.find((s) => s.id === r.systemId);
        return {
          name: sys?.shortName ?? r.systemId,
          dailyMillions: Number((r.dailyAvgPassengers / 1_000_000).toFixed(2)),
          period: r.periodLabel,
        };
      });
  }, [ridershipSnapshots, systems]);

  const filteredProjects = useMemo(() => {
    if (expansionFilter === 'all') return projects;
    return projects.filter((p) => p.status === expansionFilter);
  }, [projects, expansionFilter]);

  const expansionTotals = useMemo(() => {
    const sumBy = (st: 'Under Construction' | 'Approved' | 'Proposed') =>
      projects
        .filter((p) => p.status === st)
        .reduce((acc, p) => acc + p.lengthKm, 0)
        .toFixed(1);
    return {
      uc: sumBy('Under Construction'),
      approved: sumBy('Approved'),
      proposed: sumBy('Proposed'),
    };
  }, [projects]);

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E0DA] pb-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-[#525866]">
            Quantitative Benchmarks · Engineering Standards · Pipeline
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif font-semibold text-[#141821] mt-1">
            Statistics, Technology & Expansion
          </h1>
        </div>

        <div className="inline-flex p-1 bg-[#EBE8E1]/70 border border-[#E2E0DA] rounded-lg self-start">
          {(
            [
              { id: 'statistics', label: 'Statistics & Analysis' },
              { id: 'technology', label: 'Technology & Standards' },
              { id: 'expansion', label: 'Projects & Expansion' },
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

      {/* TAB 1: STATISTICS & ANALYSIS */}
      {activeTab === 'statistics' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Operational vs Under Construction vs Approved */}
            <div className="bg-white border border-[#E2E0DA] rounded-lg p-6">
              <h2 className="text-lg font-serif font-semibold text-[#141821]">
                Metro Rail Length by City & Project Status (km)
              </h2>
              <p className="text-xs text-[#525866] mt-1 mb-4">
                Strictly separates active operational routes from corridors under construction or approved.
              </p>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metroComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EBE8E1" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#525866' }} angle={-18} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11, fill: '#525866' }} unit=" km" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E0DA', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="operational" name="Operational (km)" fill="#1D4ED8" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="underConstruction" name="Under Construction (km)" fill="#B45309" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="approved" name="Approved (km)" fill="#0F766E" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Historical Growth of India's Operational Metro Rail */}
            <div className="bg-white border border-[#E2E0DA] rounded-lg p-6">
              <h2 className="text-lg font-serif font-semibold text-[#141821]">
                India Metro Operational Network Expansion (2002–2026)
              </h2>
              <p className="text-xs text-[#525866] mt-1 mb-4">
                Verified national operational metro rail route length milestones (MoHUA / operator abstracts).
              </p>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={NATIONAL_METRO_GROWTH_SERIES} margin={{ top: 10, right: 16, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EBE8E1" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#525866' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#525866' }} unit=" km" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E0DA', fontSize: '12px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="operationalKm"
                      name="Operational Metro (km)"
                      stroke="#1D4ED8"
                      fill="#1D4ED8"
                      fillOpacity={0.14}
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Daily Ridership Benchmark */}
          <div className="bg-white border border-[#E2E0DA] rounded-lg p-6">
            <h2 className="text-lg font-serif font-semibold text-[#141821]">
              Highest Daily Ridership Urban Systems (Millions of Daily Trips)
            </h2>
            <p className="text-xs text-[#525866] mt-1 mb-4">
              Multi-modal comparison illustrating how suburban railways and city bus networks carry the highest daily passenger volumes alongside trunk metro corridors.
            </p>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ridershipChartData} layout="vertical" margin={{ top: 5, right: 24, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EBE8E1" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#525866' }} unit="M" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#141821' }} width={110} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E0DA', fontSize: '12px' }}
                  />
                  <Bar dataKey="dailyMillions" name="Daily Avg Passengers (Millions)" fill="#141821" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Complete System Comparison Table */}
          <div className="bg-white border border-[#E2E0DA] rounded-lg overflow-x-auto">
            <div className="px-5 py-4 border-b border-[#E2E0DA]">
              <h2 className="text-lg font-serif font-semibold text-[#141821]">
                System-Level Comparative Matrix
              </h2>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F7F4] border-b border-[#E2E0DA] text-[#525866]">
                  <th className="py-3 px-4">System</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Operational</th>
                  <th className="py-3 px-4 text-right">Under Const.</th>
                  <th className="py-3 px-4 text-right">Stations</th>
                  <th className="py-3 px-4 text-right">Daily Ridership</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E0DA]">
                {systems.map((sys) => {
                  const city = cities.find((c) => c.id === sys.cityId);
                  const mode = modes.find((m) => m.id === sys.modeId);
                  return (
                    <tr key={sys.id} className="hover:bg-[#F8F7F4]/60">
                      <td className="py-2.5 px-4 font-semibold text-[#141821]">
                        <button
                          type="button"
                          onClick={() => onSelectSystem(sys.id)}
                          className="hover:text-[#1D4ED8] hover:underline text-left"
                        >
                          {sys.name}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-[#525866]">
                        {city && (
                          <button
                            type="button"
                            onClick={() => onSelectCity(city.id)}
                            className="hover:text-[#1D4ED8] hover:underline"
                          >
                            {city.name}
                          </button>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-[#525866]">{mode?.shortName}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {sys.operationalLengthKm > 0 ? `${sys.operationalLengthKm} km` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#B45309]">
                        {sys.underConstructionKm > 0 ? `${sys.underConstructionKm} km` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {sys.totalStations.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {sys.dailyRidershipAvg ? sys.dailyRidershipAvg.toLocaleString() : '—'}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <StatusLabel status={sys.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TECHNOLOGY & STANDARDS */}
      {activeTab === 'technology' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-3">
              <div className="text-xs font-mono text-[#1D4ED8]">01 / Track Gauge Architecture</div>
              <h2 className="text-xl font-serif font-semibold text-[#141821]">
                Standard Gauge (1435 mm) vs Broad Gauge (1676 mm)
              </h2>
              <p className="text-sm text-[#525866] leading-relaxed">
                Early Indian metros (Kolkata Line 1 and Delhi Phase 1–2 Lines 1–4) adopted 1676 mm Indian Broad Gauge to harmonize with Indian Railways maintenance standards. Subsequent systems—including Delhi Phase 3+, Mumbai, Bengaluru, Chennai, Hyderabad, Kochi, Pune, Nagpur, and Ahmedabad—standardized on 1435 mm Standard Gauge to enable sharper curve radii in dense urban street alignments and global rolling-stock interoperability.
              </p>
            </div>

            <div className="bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-3">
              <div className="text-xs font-mono text-[#1D4ED8]">02 / Traction & Electrification</div>
              <h2 className="text-xl font-serif font-semibold text-[#141821]">
                25 kV AC Overhead Catenary vs 750 V DC Third Rail
              </h2>
              <p className="text-sm text-[#525866] leading-relaxed">
                Delhi, Mumbai Metro, Chennai, Hyderabad, Pune, Nagpur, and all Indian Railways suburban networks utilize 25 kV 50 Hz AC overhead catenary (with rigid overhead conductor rails inside tunnels). Bengaluru, Kolkata, Kochi, and Ahmedabad utilize 750 V DC third-rail ground power pickup, eliminating overhead masts for slimmer elevated viaduct profiles.
              </p>
            </div>

            <div className="bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-3">
              <div className="text-xs font-mono text-[#1D4ED8]">03 / Signalling & Automation</div>
              <h2 className="text-xl font-serif font-semibold text-[#141821]">
                CBTC Moving Block & GoA 4 Driverless Operations
              </h2>
              <p className="text-sm text-[#525866] leading-relaxed">
                Modern Indian metro corridors deploy Communications-Based Train Control (CBTC) from Alstom (Urbalis), Siemens (Trainguard MT), Thales (SelTrac), and Nippon Signal. Delhi Metro’s Pink and Magenta lines pioneered unattended train operation (GoA 4), followed by driverless-ready CBTC fleets on Mumbai Line 3, Bengaluru Yellow/Pink lines, and Chennai Phase 2.
              </p>
            </div>

            <div className="bg-white border border-[#E2E0DA] rounded-lg p-6 space-y-3">
              <div className="text-xs font-mono text-[#1D4ED8]">04 / Fare & Fleet Modernization</div>
              <h2 className="text-xl font-serif font-semibold text-[#141821]">
                NCMC Open-Loop Ticketing & Electric Fleet Shift
              </h2>
              <p className="text-sm text-[#525866] leading-relaxed">
                National Common Mobility Card (NCMC) RuPay open-loop gates now operate across Delhi, Mumbai, Bengaluru, Chennai, Kochi (Metro + Water Metro), Ahmedabad, Pune, and Nagpur. Simultaneously, urban bus agencies (DTC, BEST, BMTC, PMPML) and Kochi Water Metro are scaling zero-tailpipe battery-electric vehicles using depot fast-charging and LTO marine batteries.
              </p>
            </div>
          </div>

          {/* Rolling Stock & Signalling Registry Table */}
          <div className="bg-white border border-[#E2E0DA] rounded-lg overflow-x-auto">
            <div className="px-5 py-4 border-b border-[#E2E0DA]">
              <h2 className="text-lg font-serif font-semibold text-[#141821]">
                Rolling Stock, Electrification & Signalling Matrix
              </h2>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F7F4] border-b border-[#E2E0DA] text-[#525866]">
                  <th className="py-3 px-4">System</th>
                  <th className="py-3 px-4">Track Gauge</th>
                  <th className="py-3 px-4">Power / Fuel</th>
                  <th className="py-3 px-4">Signalling / Control</th>
                  <th className="py-3 px-4">Automation</th>
                  <th className="py-3 px-4">Fleet Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E0DA]">
                {systems.map((sys) => (
                  <tr key={sys.id} className="hover:bg-[#F8F7F4]/60">
                    <td className="py-2.5 px-4 font-semibold text-[#141821] whitespace-nowrap">{sys.name}</td>
                    <td className="py-2.5 px-4 text-[#525866]">{sys.trackGauge}</td>
                    <td className="py-2.5 px-4 text-[#525866]">{sys.electrification}</td>
                    <td className="py-2.5 px-4 text-[#525866]">{sys.signallingSystem}</td>
                    <td className="py-2.5 px-4 font-mono">{sys.atoLevel}</td>
                    <td className="py-2.5 px-4 text-[#525866]">{sys.rollingStockSummary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PROJECTS & EXPANSION */}
      {activeTab === 'expansion' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-[#E2E0DA] rounded-lg p-5">
              <div className="text-xs text-[#525866]">Indexed Under-Construction Corridors</div>
              <div className="text-2xl font-mono font-semibold tabular-nums text-[#B45309] mt-1">
                {expansionTotals.uc} km
              </div>
            </div>
            <div className="bg-white border border-[#E2E0DA] rounded-lg p-5">
              <div className="text-xs text-[#525866]">Indexed Approved Pipeline</div>
              <div className="text-2xl font-mono font-semibold tabular-nums text-[#0F766E] mt-1">
                {expansionTotals.approved} km
              </div>
            </div>
            <div className="bg-white border border-[#E2E0DA] rounded-lg p-5">
              <div className="text-xs text-[#525866]">Indexed Proposed / DPR Stage</div>
              <div className="text-2xl font-mono font-semibold tabular-nums text-[#525866] mt-1">
                {expansionTotals.proposed} km
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-[#EBE8E1]/60 p-1.5 rounded-lg border border-[#E2E0DA] w-fit">
            {(['all', 'Under Construction', 'Approved', 'Proposed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setExpansionFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  expansionFilter === st ? 'bg-white text-[#141821] shadow-xs' : 'text-[#525866] hover:text-[#141821]'
                }`}
              >
                {st === 'all' ? 'All Pipeline Stages' : st}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredProjects.map((proj) => {
              const city = cities.find((c) => c.id === proj.cityId);
              const mode = modes.find((m) => m.id === proj.modeId);
              return (
                <article key={proj.id} className="bg-white border border-[#E2E0DA] rounded-lg p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-mono text-[#525866]">
                        {city?.name} · {mode?.shortName} · As of {proj.dataAsOf}
                      </div>
                      <h3 className="text-lg font-serif font-semibold text-[#141821] mt-1">{proj.title}</h3>
                    </div>
                    <StatusLabel status={proj.status} />
                  </div>
                  <p className="text-xs text-[#525866] leading-relaxed">{proj.corridorDetails}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#E2E0DA] text-xs font-mono tabular-nums">
                    <div>
                      <span className="block font-sans text-[11px] text-[#7D8491]">Length</span>
                      <strong>{proj.lengthKm} km</strong>
                    </div>
                    <div>
                      <span className="block font-sans text-[11px] text-[#7D8491]">Stations</span>
                      <strong>{proj.stationsPlanned ?? 'TBD'}</strong>
                    </div>
                    <div>
                      <span className="block font-sans text-[11px] text-[#7D8491]">Est. Cost</span>
                      <strong>{proj.estimatedCostCr}</strong>
                    </div>
                    <div>
                      <span className="block font-sans text-[11px] text-[#7D8491]">Target</span>
                      <strong>{proj.expectedTimeline}</strong>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#525866]">
                    Implementing Agency: <strong className="text-[#141821]">{proj.implementingAgency}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
