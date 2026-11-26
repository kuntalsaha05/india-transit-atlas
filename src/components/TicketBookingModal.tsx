import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, MessageCircle, Ticket, Train, X } from 'lucide-react';
import { useTransitData } from '../context/TransitDataContext';
import { IndianRailwayCorridor, SystemTicketingProfile } from '../types/transit';

interface TicketBookingModalProps {
  isOpen: boolean;
  initialCityId?: string | null;
  initialSystemId?: string | null;
  onClose: () => void;
}

export const TicketBookingModal: React.FC<TicketBookingModalProps> = ({
  isOpen,
  initialCityId,
  initialSystemId,
  onClose,
}) => {
  const { cities, ticketingProfiles, indianRailways } = useTransitData();
  const [bookingTab, setBookingTab] = useState<'urban' | 'railways'>('urban');
  const [selectedCityId, setSelectedCityId] = useState<string>(initialCityId || 'delhi');
  const [selectedSystemId, setSelectedSystemId] = useState<string>(initialSystemId || 'sys-delhi-metro');
  const [selectedSlabIdx, setSelectedSlabIdx] = useState<number>(1);
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [paymentMode, setPaymentMode] = useState<'smartcard' | 'qr' | 'ac'>('smartcard');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [selectedTrainId, setSelectedTrainId] = useState<string>(indianRailways[0]?.id || '');
  const [selectedClassIdx, setSelectedClassIdx] = useState<number>(0);

  useEffect(() => {
    if (initialCityId) setSelectedCityId(initialCityId);
    if (initialSystemId) {
      setSelectedSystemId(initialSystemId);
      const match = ticketingProfiles.find((t) => t.systemId === initialSystemId);
      if (match) setSelectedCityId(match.cityId);
    }
  }, [initialCityId, initialSystemId, ticketingProfiles]);

  const cityProfiles = useMemo(
    () => ticketingProfiles.filter((t) => t.cityId === selectedCityId),
    [ticketingProfiles, selectedCityId]
  );

  const activeProfile: SystemTicketingProfile = useMemo(() => {
    return (
      cityProfiles.find((p) => p.systemId === selectedSystemId) ||
      cityProfiles[0] ||
      ticketingProfiles[0]
    );
  }, [cityProfiles, selectedSystemId, ticketingProfiles]);

  useEffect(() => {
    setSelectedSlabIdx(0);
    setPaymentMode('smartcard');
  }, [activeProfile.systemId]);

  const activeSlab = activeProfile.fareSlabs[Math.min(selectedSlabIdx, activeProfile.fareSlabs.length - 1)];

  const unitFare = useMemo(() => {
    if (!activeSlab) return activeProfile.minFareInr;
    if (paymentMode === 'ac' && activeSlab.acOrPremiumInr) return activeSlab.acOrPremiumInr;
    if (paymentMode === 'smartcard') return activeSlab.smartCardOrNcmcInr;
    return activeSlab.standardInr;
  }, [activeSlab, activeProfile.minFareInr, paymentMode]);

  const totalFare = unitFare * passengerCount;

  const activeTrain: IndianRailwayCorridor = useMemo(
    () => indianRailways.find((t) => t.id === selectedTrainId) || indianRailways[0],
    [indianRailways, selectedTrainId]
  );

  const activeTrainClass = activeTrain.faresInr[Math.min(selectedClassIdx, activeTrain.faresInr.length - 1)];

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#141821]/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Direct Ticket Booking & Official Fare Calculator"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl bg-white border border-[#E2E0DA] rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="px-5 py-4 bg-[#F8F7F4] border-b border-[#E2E0DA] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Ticket className="w-5 h-5 text-[#1D4ED8]" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-serif font-semibold text-[#141821] leading-tight">
                Live Fare Calculator & Direct Ticket Booking
              </h2>
              <p className="text-xs text-[#525866]">
                Official 2026 Indian Metro, Suburban Rail, Bus & IRCTC fares — zero markup
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-md text-[#525866] hover:text-[#141821] hover:bg-[#EBE8E1]"
            aria-label="Close ticket booking"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-5 pt-3 border-b border-[#E2E0DA] flex items-center gap-2 bg-white">
          <button
            type="button"
            onClick={() => setBookingTab('urban')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              bookingTab === 'urban'
                ? 'border-[#1D4ED8] text-[#1D4ED8]'
                : 'border-transparent text-[#525866] hover:text-[#141821]'
            }`}
          >
            Metro · Suburban · City Bus
          </button>
          <button
            type="button"
            onClick={() => setBookingTab('railways')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              bookingTab === 'railways'
                ? 'border-[#1D4ED8] text-[#1D4ED8]'
                : 'border-transparent text-[#525866] hover:text-[#141821]'
            }`}
          >
            Indian Railways (Vande Bharat / IRCTC)
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {bookingTab === 'urban' ? (
            <>
              {/* City + System Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#525866] mb-1">Select City</label>
                  <select
                    value={selectedCityId}
                    onChange={(e) => {
                      const nextCity = e.target.value;
                      setSelectedCityId(nextCity);
                      const firstSys = ticketingProfiles.find((p) => p.cityId === nextCity);
                      if (firstSys) setSelectedSystemId(firstSys.systemId);
                    }}
                    className="w-full px-3 py-2.5 text-sm bg-[#F8F7F4] border border-[#E2E0DA] rounded-md text-[#141821]"
                  >
                    {cities
                      .filter((c) => ticketingProfiles.some((t) => t.cityId === c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#525866] mb-1">Transit Operator</label>
                  <select
                    value={activeProfile.systemId}
                    onChange={(e) => setSelectedSystemId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-[#F8F7F4] border border-[#E2E0DA] rounded-md text-[#141821]"
                  >
                    {cityProfiles.map((p) => (
                      <option key={p.systemId} value={p.systemId}>
                        {p.systemName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Distance Slab Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#141821]">1. Choose Distance / Zone</label>
                  <span className="text-xs font-mono text-[#525866]">
                    Range: ₹{activeProfile.minFareInr} – ₹{activeProfile.maxFareInr}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeProfile.fareSlabs.map((slab, idx) => (
                    <button
                      key={slab.distanceLabel}
                      type="button"
                      onClick={() => setSelectedSlabIdx(idx)}
                      className={`p-3 text-left rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                        selectedSlabIdx === idx
                          ? 'border-[#1D4ED8] bg-[#1D4ED8]/5'
                          : 'border-[#E2E0DA] bg-white hover:bg-[#F8F7F4]'
                      }`}
                    >
                      <span className="text-xs font-medium text-[#141821]">{slab.distanceLabel}</span>
                      <span className="text-sm font-mono font-semibold tabular-nums text-[#1D4ED8]">
                        ₹{paymentMode === 'smartcard' ? slab.smartCardOrNcmcInr : slab.acOrPremiumInr && paymentMode === 'ac' ? slab.acOrPremiumInr : slab.standardInr}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ticket Type + Passenger Count */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                <div className="sm:col-span-8 space-y-1.5">
                  <label className="block text-xs font-semibold text-[#141821]">2. Ticket / Card Format</label>
                  <div className="flex flex-wrap gap-1.5 p-1 bg-[#EBE8E1]/60 rounded-lg border border-[#E2E0DA]">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('smartcard')}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap ${
                        paymentMode === 'smartcard' ? 'bg-white text-[#141821] shadow-xs' : 'text-[#525866]'
                      }`}
                    >
                      NCMC / Smart Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('qr')}
                      className={`flex-1 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap ${
                        paymentMode === 'qr' ? 'bg-white text-[#141821] shadow-xs' : 'text-[#525866]'
                      }`}
                    >
                      Single QR / Token
                    </button>
                    {activeSlab?.acOrPremiumInr && (
                      <button
                        type="button"
                        onClick={() => setPaymentMode('ac')}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap ${
                          paymentMode === 'ac' ? 'bg-white text-[#141821] shadow-xs' : 'text-[#525866]'
                        }`}
                      >
                        AC / Premium
                      </button>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-4 space-y-1.5">
                  <label className="block text-xs font-semibold text-[#141821]">Passengers</label>
                  <div className="flex items-center border border-[#E2E0DA] rounded-lg overflow-hidden bg-[#F8F7F4]">
                    <button
                      type="button"
                      onClick={() => setPassengerCount((c) => Math.max(1, c - 1))}
                      className="px-3.5 py-2 text-sm font-semibold hover:bg-[#EBE8E1]"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center text-sm font-mono font-semibold tabular-nums">
                      {passengerCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPassengerCount((c) => Math.min(6, c + 1))}
                      className="px-3.5 py-2 text-sm font-semibold hover:bg-[#EBE8E1]"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#525866] leading-relaxed bg-[#F8F7F4] border border-[#E2E0DA] rounded-lg p-3.5">
                {activeProfile.smartCardDiscountNote}
              </p>

              {/* Total Fare & Direct Official Launchers */}
              <div className="bg-[#141821] text-white rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-mono text-[#9CA3AF] uppercase">
                      Official Fare Total · {passengerCount} {passengerCount === 1 ? 'Rider' : 'Riders'}
                    </div>
                    <div className="text-3xl font-mono font-semibold tabular-nums mt-0.5">
                      ₹{totalFare.toLocaleString('en-IN')}
                    </div>
                    {activeProfile.dayPassInr && (
                      <div className="text-xs text-[#D1D5DB] mt-0.5">
                        Unlimited Day Pass available: ₹{activeProfile.dayPassInr}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={activeProfile.directBookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-[#1D4ED8] hover:bg-[#2563EB] text-white rounded-lg transition-colors whitespace-nowrap"
                    >
                      <span>Book on Official Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {activeProfile.secondaryBookUrl && (
                      <a
                        href={activeProfile.secondaryBookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-[#0F766E] hover:bg-[#0D9488] text-white rounded-lg transition-colors whitespace-nowrap"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp QR Ticket</span>
                      </a>
                    )}
                  </div>
                </div>

                {activeProfile.whatsappNumber && (
                  <div className="pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs text-[#D1D5DB]">
                    <span>Official WhatsApp Ticket Bot: <strong className="text-white font-mono">{activeProfile.whatsappNumber}</strong></span>
                    <button
                      type="button"
                      onClick={() => handleCopy(activeProfile.whatsappNumber || '', 'wa')}
                      className="inline-flex items-center gap-1 text-white hover:underline"
                    >
                      {copiedId === 'wa' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === 'wa' ? 'Copied' : 'Copy Number'}</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Indian Railways & Vande Bharat Direct Fare & Booking */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-[#141821]">
                  Select Indian Railways / Namo Bharat Corridor
                </label>
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {indianRailways.map((train) => (
                    <button
                      key={train.id}
                      type="button"
                      onClick={() => {
                        setSelectedTrainId(train.id);
                        setSelectedClassIdx(0);
                      }}
                      className={`w-full p-3.5 text-left rounded-lg border transition-colors ${
                        activeTrain.id === train.id
                          ? 'border-[#1D4ED8] bg-[#1D4ED8]/5'
                          : 'border-[#E2E0DA] bg-white hover:bg-[#F8F7F4]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Train className="w-4 h-4 text-[#1D4ED8]" aria-hidden="true" />
                          <span className="text-sm font-semibold text-[#141821]">
                            {train.trainNumber} · {train.trainName}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-[#525866]">
                          {train.durationLabel} · {train.distanceKm} km
                        </span>
                      </div>
                      <div className="text-xs text-[#525866] mt-1">
                        {train.fromStation} ({train.departureTimeIst}) → {train.toStation} ({train.arrivalTimeIst}) · {train.frequency}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#141821]">Select Coach Class</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {activeTrain.faresInr.map((f, idx) => (
                    <button
                      key={f.className}
                      type="button"
                      onClick={() => setSelectedClassIdx(idx)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        selectedClassIdx === idx
                          ? 'border-[#1D4ED8] bg-[#1D4ED8]/5'
                          : 'border-[#E2E0DA] bg-white hover:bg-[#F8F7F4]'
                      }`}
                    >
                      <div className="text-xs text-[#525866]">{f.className}</div>
                      <div className="text-base font-mono font-semibold text-[#141821] tabular-nums mt-0.5">
                        ₹{f.priceInr.toLocaleString('en-IN')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#141821] text-white rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-mono text-[#9CA3AF] uppercase">
                    IRCTC Base Fare · {activeTrainClass.className}
                  </div>
                  <div className="text-3xl font-mono font-semibold tabular-nums mt-0.5">
                    ₹{activeTrainClass.priceInr.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-[#D1D5DB] mt-0.5">
                    {activeTrain.fromStation} → {activeTrain.toStation}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={activeTrain.irctcUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-[#1D4ED8] hover:bg-[#2563EB] text-white rounded-lg transition-colors whitespace-nowrap"
                  >
                    <span>Book on IRCTC</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {activeTrain.utsAvailable && (
                    <a
                      href="https://www.utsonmobile.indianrail.gov.in"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors whitespace-nowrap"
                    >
                      <span>Unreserved via UTS</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
