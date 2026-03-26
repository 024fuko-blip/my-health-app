"use client";

import type { CalendarEditForm } from '@/app/(main)/record/hooks/record-form-types';

interface LogEditFormProps {
  editForm: CalendarEditForm;
  setEditForm: React.Dispatch<React.SetStateAction<CalendarEditForm>>;
  onUpdate: () => Promise<void>;
}

export function LogEditForm({ editForm, setEditForm, onUpdate }: LogEditFormProps) {
  return (
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
  );
}
