"use client";

import type { HealthLogApiResponse, CalendarEditForm } from '@/app/(main)/record/hooks/record-form-types';
import { LogEditForm } from './LogEditForm';
import { LogDetailView } from './LogDetailView';

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
          <LogEditForm
            editForm={editForm}
            setEditForm={setEditForm}
            onUpdate={onUpdate}
          />
        ) : (
          <LogDetailView selectedLog={selectedLog} />
        )}
      </div>
    </div>
  );
}
