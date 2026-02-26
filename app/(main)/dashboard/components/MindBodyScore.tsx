"use client";

interface MindBodyScoreProps {
  period: number;
  mindScore: string | null;
  bodyScore: string | null;
  sectionOpen: { mindBody: boolean };
  setSectionOpen: React.Dispatch<React.SetStateAction<import('../hooks/useDashboardData').SectionOpen>>;
}

export function MindBodyScore({
  period,
  mindScore,
  bodyScore,
  sectionOpen,
  setSectionOpen,
}: MindBodyScoreProps) {
  if (mindScore == null && bodyScore == null) return null;

  return (
    <details
      open={sectionOpen.mindBody}
      onToggle={(e) =>
        setSectionOpen((s) => ({ ...s, mindBody: (e.target as HTMLDetailsElement).open }))
      }
      className="overflow-hidden rounded-xl border border-gray-200"
    >
      <summary className="p-4 cursor-pointer list-none flex items-center justify-between font-bold text-gray-700 bg-slate-50 hover:bg-slate-100">
        <span>心身スコア</span>
        <span className="text-xs font-normal text-gray-400">
          {sectionOpen.mindBody ? '閉じる' : '開く'}
        </span>
      </summary>
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-600">心（メンタル）</span>
            <p className="text-2xl font-bold text-slate-800 mt-1">{mindScore ?? '—'}</p>
            <p className="text-xs text-slate-500">直近{period}日平均</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-600">身（フィジカル）</span>
            <p className="text-2xl font-bold text-slate-800 mt-1">{bodyScore ?? '—'}</p>
            <p className="text-xs text-slate-500">直近{period}日平均</p>
          </div>
        </div>
      </div>
    </details>
  );
}
