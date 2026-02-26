"use client";

interface AiReportSectionProps {
  report: string;
  analyzing: boolean;
  sectionOpen: { report: boolean };
  setSectionOpen: React.Dispatch<React.SetStateAction<import('../hooks/useDashboardData').SectionOpen>>;
}

export function AiReportSection({
  report,
  analyzing,
  sectionOpen,
  setSectionOpen,
}: AiReportSectionProps) {
  return (
    <details
      open={sectionOpen.report}
      onToggle={(e) =>
        setSectionOpen((s) => ({ ...s, report: (e.target as HTMLDetailsElement).open }))
      }
      className="overflow-hidden rounded-xl border border-slate-200"
    >
      <summary className="p-4 cursor-pointer list-none flex items-center justify-between font-bold text-slate-800 bg-slate-50 hover:bg-slate-100">
        <span className="flex items-center gap-2">
          <span>💋</span>
          相棒の期間総評（因果関係分析）
        </span>
        <span className="text-xs font-normal text-gray-400">
          {sectionOpen.report ? '閉じる' : '開く'}
        </span>
      </summary>
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="bg-slate-50 p-4 rounded-lg text-gray-800 font-medium leading-relaxed min-h-[120px] whitespace-pre-wrap">
          {analyzing ? (
            <span className="text-slate-600">分析中...</span>
          ) : report ? (
            report
          ) : (
            <span className="text-gray-400 text-sm">
              記録がたまると、ここに因果関係に基づく気づきを表示します。
            </span>
          )}
        </div>
      </div>
    </details>
  );
}
