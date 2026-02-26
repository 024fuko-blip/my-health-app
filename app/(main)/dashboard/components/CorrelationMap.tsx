"use client";

import { CORRELATION_LABELS } from '@/lib/dashboard-constants';
import type { SectionOpen } from '@/lib/dashboard-types';

interface CorrelationMapProps {
  correlations: Record<string, number>;
  sectionOpen: { correlation: boolean };
  setSectionOpen: React.Dispatch<React.SetStateAction<SectionOpen>>;
}

export function CorrelationMap({
  correlations,
  sectionOpen,
  setSectionOpen,
}: CorrelationMapProps) {
  if (Object.keys(correlations).length === 0) return null;

  return (
    <details
      open={sectionOpen.correlation}
      onToggle={(e) =>
        setSectionOpen((s) => ({ ...s, correlation: (e.target as HTMLDetailsElement).open }))
      }
      className="overflow-hidden rounded-xl border border-slate-200"
    >
      <summary className="p-4 cursor-pointer list-none flex items-center justify-between font-bold text-slate-700 bg-slate-50 hover:bg-slate-100">
        <span>相関マップ</span>
        <span className="text-xs font-normal text-gray-400">
          {sectionOpen.correlation ? '閉じる' : '開く'}
        </span>
      </summary>
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="space-y-2">
          {Object.entries(correlations).map(([key, val]) => {
            const intensity = Math.min(1, Math.abs(val));
            const isPos = val > 0;
            const bg = isPos
              ? `rgba(34,197,94,${0.2 + intensity * 0.5})`
              : `rgba(239,68,68,${0.2 + intensity * 0.5})`;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-600 w-32">
                  {CORRELATION_LABELS[key] ?? key}
                </span>
                <div
                  className="flex-1 h-6 rounded bg-slate-200 overflow-hidden"
                  style={{ maxWidth: 120 }}
                >
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${(Math.abs(val) + 1) * 50}%`,
                      backgroundColor: bg,
                    }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700 w-10">
                  {val > 0 ? '+' : ''}{val}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}
