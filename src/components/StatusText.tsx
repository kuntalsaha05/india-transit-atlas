import React from 'react';
import { AlertCircle, CheckCircle2, Clock, FileCheck, PauseCircle } from 'lucide-react';
import { OperationalStatus } from '../types/transit';

export const StatusLabel: React.FC<{ status: OperationalStatus }> = ({ status }) => {
  switch (status) {
    case 'Operational':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D]">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Operational</span>
        </span>
      );
    case 'Partially Operational':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1D4ED8]">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Partially Operational</span>
        </span>
      );
    case 'Under Construction':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B45309]">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Under Construction</span>
        </span>
      );
    case 'Approved':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F766E]">
          <FileCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Approved</span>
        </span>
      );
    case 'Proposed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#525866]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Proposed</span>
        </span>
      );
    case 'Suspended / Dismantled':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B91C1C]">
          <PauseCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Suspended / Dismantled</span>
        </span>
      );
  }
};
