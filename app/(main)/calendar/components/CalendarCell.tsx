"use client";

import type { PeriodStatus } from '@/lib/period-status';
import type { HealthLogApiResponse } from '@/app/(main)/record/hooks/record-form-types';

interface CalendarCellProps {
  day: number;
  log: HealthLogApiResponse | undefined;
  periodStatus: PeriodStatus;
  onDateClick: (day: number) => void;
}

export function CalendarCell({
  day,
  log,
  periodStatus,
  onDateClick,
}: CalendarCellProps) {
  let bgColor = 'bg-white';
  let borderColor = 'border-gray-100';

  if (periodStatus.type === 'period') {
    bgColor = 'bg-pink-50/70';
    borderColor = 'border-pink-100';
  } else if (periodStatus.type === 'ovulation') {
    bgColor = 'bg-purple-50/50';
    borderColor = 'border-purple-100';
  } else if (periodStatus.type === 'fertile') {
    bgColor = 'bg-purple-50/40';
    borderColor = 'border-purple-100';
  } else if (periodStatus.type === 'pms') {
    bgColor = 'bg-amber-50/50';
    borderColor = 'border-amber-100';
  }

  if (log && !periodStatus.type && log.general_mood != null) {
    if (log.general_mood <= 2) {
      bgColor = 'bg-red-50';
    } else if (log.general_mood === 3) {
      bgColor = 'bg-blue-50';
    } else if (log.general_mood >= 4) {
      bgColor = 'bg-green-50';
    }
  }

  return (
    <div
      onClick={() => onDateClick(day)}
      className={`h-24 border p-1 cursor-pointer transition-colors relative ${bgColor} ${borderColor} hover:opacity-80`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold ${log ? 'text-gray-800' : 'text-gray-600'}`}>
          {day}
        </span>
        <div className="flex gap-0.5">
          {periodStatus.type === 'period' && (
            <span className="text-xs opacity-80" title="生理予測">
              🩸
            </span>
          )}
          {periodStatus.type === 'ovulation' && (
            <span className="text-xs opacity-80" title="排卵日">
              🥚
            </span>
          )}
          {periodStatus.type === 'fertile' && (
            <span className="text-xs opacity-80" title="妊娠しやすい">
              💜
            </span>
          )}
          {periodStatus.type === 'pms' && (
            <span className="text-xs opacity-80" title="PMS期間">
              ⚠️
            </span>
          )}
        </div>
      </div>
      {log && (
        <div className="mt-1 flex flex-wrap gap-1 content-start">
          {(log.pain_level ?? 0) >= 3 && <span title="腹痛">⚡</span>}
          {(log.alcohol_amount ?? 0) > 0 && <span title="飲酒">🍺</span>}
          {log.ai_comment && <span title="AI">🤖</span>}
          {(log.period_status === '生理中' || log.period_status === '生理終了') && (
            <span
              title={
                log.period_status === '生理終了' ? '生理終了（記録）' : '生理中（記録）'
              }
            >
              {log.period_status === '生理終了' ? '✓' : '💧'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
