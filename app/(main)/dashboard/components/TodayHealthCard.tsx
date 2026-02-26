"use client";

import type { HealthLogApiResponse } from '@/app/(main)/record/hooks/record-form-types';
import type { UserSettingsMode } from '@/app/(main)/record/hooks/record-form-types';

interface TodayHealthCardProps {
  todayLog: HealthLogApiResponse | null;
  modes: UserSettingsMode;
}

export function TodayHealthCard({ todayLog, modes }: TodayHealthCardProps) {
  return (
    <div className="bg-[var(--color-card)] border-2 border-[var(--color-border)] p-4">
      <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
        <span>📋</span> 今日の体調
      </h2>
      {todayLog ? (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            {todayLog.general_mood != null && (
              <span className="px-2 py-1 rounded-full bg-slate-200 text-slate-700 font-medium">
                体調 {todayLog.general_mood}/5
              </span>
            )}
            {todayLog.sleep_quality && (
              <span className="px-2 py-1 rounded-full bg-slate-200 text-slate-700">
                睡眠: {todayLog.sleep_quality}
              </span>
            )}
            {todayLog.stress_level != null && (
              <span className="px-2 py-1 rounded-full bg-slate-200 text-slate-700">
                ストレス {todayLog.stress_level}/10
              </span>
            )}
            {todayLog.pain_level != null && modes.mode_ibd && (
              <span className="px-2 py-1 rounded-full bg-slate-200 text-slate-700">
                腹痛 {todayLog.pain_level}/5
              </span>
            )}
          </div>
          {todayLog.memo && (
            <p className="text-gray-600 text-xs line-clamp-2">{todayLog.memo}</p>
          )}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">
          まだ今日の記録がないわ。記録してから出直しなさい！
        </p>
      )}
    </div>
  );
}
