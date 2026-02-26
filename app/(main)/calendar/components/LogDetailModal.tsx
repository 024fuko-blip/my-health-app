"use client";

import type { HealthLogApiResponse, CalendarEditForm } from '@/app/(main)/record/hooks/record-form-types';

interface LogDetailModalProps {
  selectedLog: HealthLogApiResponse;
  editForm: CalendarEditForm;
  setEditForm: React.Dispatch<React.SetStateAction<CalendarEditForm>>;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  onUpdate: () => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

export function LogDetailModal({
  selectedLog,
  editForm,
  setEditForm,
  isEditing,
  setIsEditing,
  onUpdate,
  onDelete,
  onClose,
}: LogDetailModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー: 日付と操作ボタン */}
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="text-xl font-bold">{selectedLog.date}</h3>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-[var(--color-sage)] bg-[var(--color-accent-pink)]/30 px-3 py-1 text-sm font-bold"
                >
                  ✏️ 編集
                </button>
                <button
                  onClick={onDelete}
                  className="text-red-600 bg-red-50 px-3 py-1 rounded text-sm font-bold"
                >
                  🗑️ 削除
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-700 text-sm"
              >
                キャンセル
              </button>
            )}
            <button onClick={onClose} className="text-gray-600 text-2xl ml-2">
              ×
            </button>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-gray-700">体調 (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={editForm.general_mood ?? 3}
                  onChange={(e) =>
                    setEditForm({ ...editForm, general_mood: parseInt(e.target.value) })
                  }
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700">腹痛 (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={editForm.pain_level ?? 1}
                  onChange={(e) =>
                    setEditForm({ ...editForm, pain_level: parseInt(e.target.value) })
                  }
                  className="w-full border p-2 rounded"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700">生理</label>
              <select
                value={editForm.period_status || 'なし'}
                onChange={(e) =>
                  setEditForm({ ...editForm, period_status: e.target.value })
                }
                className="w-full border p-2 rounded"
              >
                <option value="なし">なし</option>
                <option value="生理中">生理中</option>
                <option value="生理終了">生理終了</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700">便・トイレ</label>
              <input
                type="text"
                placeholder="例: 普通 / トイレ3回"
                value={editForm.stool_type || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, stool_type: e.target.value })
                }
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-700">食事メモ</label>
              <textarea
                value={editForm.meal_description || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, meal_description: e.target.value })
                }
                className="w-full border p-2 rounded h-16"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold">体重(kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.weight ?? ''}
                  onChange={(e) =>
                    setEditForm({ ...editForm, weight: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label className="text-xs font-bold">歩数</label>
                <input
                  type="number"
                  value={editForm.steps ?? ''}
                  onChange={(e) =>
                    setEditForm({ ...editForm, steps: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold">飲酒量(ml)</label>
                <input
                  type="number"
                  value={editForm.alcohol_amount ?? 0}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      alcohol_amount: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label className="text-xs font-bold">ストレス (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editForm.stress_level ?? ''}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      stress_level: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full border p-2 rounded"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold">睡眠の質</label>
              <select
                value={editForm.sleep_quality || '普通'}
                onChange={(e) =>
                  setEditForm({ ...editForm, sleep_quality: e.target.value })
                }
                className="w-full border p-2 rounded"
              >
                <option value="悪い">悪い</option>
                <option value="普通">普通</option>
                <option value="良い">良い</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-bold">体脂肪(%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.body_fat ?? ''}
                  onChange={(e) =>
                    setEditForm({ ...editForm, body_fat: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label className="text-xs font-bold">カロリー</label>
                <input
                  type="number"
                  value={editForm.calories ?? ''}
                  onChange={(e) =>
                    setEditForm({ ...editForm, calories: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label className="text-xs font-bold">タンパク質(g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editForm.protein ?? ''}
                  onChange={(e) =>
                    setEditForm({ ...editForm, protein: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700">メモ</label>
              <textarea
                value={editForm.memo || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, memo: e.target.value })
                }
                className="w-full border p-2 rounded h-16"
              />
            </div>
            <button
              onClick={onUpdate}
              className="w-full bg-[var(--color-sage)] text-white p-3 font-bold"
            >
              保存する
            </button>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
