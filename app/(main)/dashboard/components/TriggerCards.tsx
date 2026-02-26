"use client";

interface TriggerCardsProps {
  triggers: Array<{ label: string; ratio: number; description: string }>;
  sectionOpen: { triggers: boolean };
  setSectionOpen: React.Dispatch<React.SetStateAction<import('@/lib/dashboard-types').SectionOpen>>;
}

export function TriggerCards({ triggers, sectionOpen, setSectionOpen }: TriggerCardsProps) {
  if (triggers.length === 0) return null;

  return (
    <details
      open={sectionOpen.triggers}
      onToggle={(e) =>
        setSectionOpen((s) => ({ ...s, triggers: (e.target as HTMLDetailsElement).open }))
      }
      className="overflow-hidden rounded-xl border border-slate-200"
    >
      <summary className="p-4 cursor-pointer list-none flex items-center justify-between font-bold text-slate-800 bg-slate-50 hover:bg-slate-100">
        <span className="flex items-center gap-2">
          <span>🔬</span>
          心身相関の発見
        </span>
        <span className="text-xs font-normal text-gray-400">
          {sectionOpen.triggers ? '閉じる' : '開く'}
        </span>
      </summary>
      <div className="p-4 bg-white border-t border-slate-100 space-y-2">
        {triggers.map((t, i) => (
          <div
            key={i}
            className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm"
          >
            <span className="font-bold text-slate-800">{t.label}</span>
            <p className="text-gray-700 mt-1">{t.description}</p>
          </div>
        ))}
      </div>
    </details>
  );
}
