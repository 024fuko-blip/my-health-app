"use client";

import type { HealthLogApiResponse } from '@/app/(main)/record/hooks/record-form-types';

interface LogDetailViewProps {
  selectedLog: HealthLogApiResponse;
}

export function LogDetailView({ selectedLog }: LogDetailViewProps) {
  return (
    <div className="space-y-4">
      {selectedLog.ai_comment && (
        <div className="bg-red-50 p-4 rounded-xl border border-red-200">
          <h4 className="font-bold text-red-800 text-sm mb-1">👹 鬼コーチ</h4>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">
            {selectedLog.ai_comment}
          </p>
        </div>
      )}
      <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
        <h4 className="font-bold text-orange-800 text-sm">🍽️ 食事メモ</h4>
        <p className="text-sm">{selectedLog.meal_description || 'なし'}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-blue-50 p-2 rounded">
          <span className="text-xs font-bold text-blue-800 block">体調</span>
          <span className="text-lg">Lv.{selectedLog.general_mood ?? '—'}</span>
        </div>
        <div className="bg-purple-50 p-2 rounded">
          <span className="text-xs font-bold text-purple-800 block">腹痛</span>
          <span className="text-lg">Lv.{selectedLog.pain_level ?? '—'}</span>
        </div>
        {selectedLog.period_status && selectedLog.period_status !== 'なし' && (
          <div className="bg-pink-50 p-2 rounded">
            <span className="text-xs font-bold text-pink-800 block">生理</span>
            <span className="text-sm">{selectedLog.period_status}</span>
          </div>
        )}
        {(selectedLog.alcohol_amount ?? 0) > 0 && (
          <div className="bg-amber-50 p-2 rounded">
            <span className="text-xs font-bold text-amber-800 block">飲酒</span>
            <span className="text-sm">{selectedLog.alcohol_amount}ml</span>
          </div>
        )}
      </div>
      {(selectedLog.stress_level != null || selectedLog.sleep_quality) && (
        <div className="flex gap-2 text-xs">
          {selectedLog.stress_level != null && (
            <span className="bg-indigo-50 px-2 py-1 rounded">
              ストレス Lv.{selectedLog.stress_level}
            </span>
          )}
          {selectedLog.sleep_quality && (
            <span className="bg-indigo-50 px-2 py-1 rounded">
              睡眠 {selectedLog.sleep_quality}
            </span>
          )}
        </div>
      )}
      <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 whitespace-pre-wrap">
        {selectedLog.memo || '—'}
      </div>
    </div>
  );
}
