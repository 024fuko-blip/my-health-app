"use client";

import { useState, useEffect, useCallback } from 'react';
import { buildPmdaUrl } from '@/lib/medication-prompt';
import type { MedicationWithNdb } from '../hooks/useDashboardData';
import { safeParseJson } from '@/lib/json-utils';
import { apiPut } from '@/lib/api-client';
import type { HealthLogApiResponse } from '@/app/(main)/record/hooks/record-form-types';

interface MedicationCardProps {
  medications: MedicationWithNdb[];
  todayLog: HealthLogApiResponse | null;
}

export function MedicationCard({ medications, todayLog }: MedicationCardProps) {
  const today = new Date().toISOString().split('T')[0];
  const [medicationTaken, setMedicationTaken] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const detail = safeParseJson<Record<string, boolean>>(
      todayLog?.medication_taken_detail ?? null,
      {}
    );
    setMedicationTaken(detail);
  }, [todayLog?.medication_taken_detail]);

  const saveMedicationStatus = useCallback(
    async (medKey: string, taken: boolean) => {
      setMedicationTaken((prev) => ({ ...prev, [medKey]: taken }));
      try {
        await apiPut('/api/health-logs/medication-status', {
          date: today,
          med_key: medKey,
          taken,
        });
      } catch (e) {
        console.error('Medication status save error:', e);
        setMedicationTaken((prev) => ({ ...prev, [medKey]: !taken }));
      }
    },
    [today]
  );

  if (medications.length === 0) return null;

  return (
    <div className="bg-[var(--color-accent-pink)]/30 border-2 border-[var(--color-border)] p-4">
      <h2 className="font-bold text-[var(--color-text)] mb-2">💊 服薬中の薬</h2>
      <div className="space-y-3">
        {medications.map((med) => (
          <div key={med.id} className="bg-white/60 p-2 rounded-lg border border-slate-100">
            <div className="flex items-center justify-between gap-2 mb-2">
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
            <div className="grid grid-cols-4 gap-1">
              {med.timings.map((timing) => {
                const key = `${med.id}_${timing}`;
                const nextTaken = !medicationTaken[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => saveMedicationStatus(key, nextTaken)}
                    className={`py-1.5 rounded-lg border-2 font-bold text-xs transition touch-manipulation active:scale-95 ${
                      medicationTaken[key]
                        ? 'border-green-500 bg-green-100 text-green-800'
                        : 'border-slate-200 bg-slate-50 text-slate-400'
                    }`}
                  >
                    {timing}
                    {medicationTaken[key] && ' ✓'}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
