"use client";

import { buildPmdaUrl } from '@/lib/medication-prompt';
import type { MedicationWithNdb } from '../hooks/useDashboardData';

interface MedicationCardProps {
  medications: MedicationWithNdb[];
}

export function MedicationCard({ medications }: MedicationCardProps) {
  if (medications.length === 0) return null;

  return (
    <div className="bg-[var(--color-accent-pink)]/30 border-2 border-[var(--color-border)] p-4">
      <h2 className="font-bold text-[var(--color-text)] mb-2">💊 服薬中の薬</h2>
      <div className="space-y-2">
        {medications.map((med) => (
          <div key={med.id} className="flex items-center justify-between gap-2 py-1.5">
            <span className="text-sm font-medium text-[var(--color-text)]">{med.name}</span>
            <a
              href={buildPmdaUrl(med.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-2 py-1 bg-[var(--color-sage)] text-white text-xs font-bold hover:opacity-90 rounded"
            >
              PMDA
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
