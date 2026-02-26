"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api-client";

const MEDICATION_TIMINGS = ["朝", "昼", "晩", "眠前"];

export interface MedicationNdb {
  drugCode: string;
  categoryName: string;
  price: number | null;
  isGeneric: boolean;
}

export interface Medication {
  id: number;
  name: string;
  timings: string[];
  ndb?: MedicationNdb;
}

interface DrugCandidate {
  name: string;
  code: string;
  categoryName: string;
  price: number | null;
  isGeneric: boolean;
}

interface MedicationManagerProps {
  medications: Medication[];
  setMedications: React.Dispatch<React.SetStateAction<Medication[]>>;
  reminderTimes: Record<string, string>;
  setReminderTimes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function MedicationManager({
  medications,
  setMedications,
  reminderTimes,
  setReminderTimes,
}: MedicationManagerProps) {
  const [newMedName, setNewMedName] = useState("");
  const [drugCandidates, setDrugCandidates] = useState<DrugCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addMedication = useCallback((name: string, ndb?: MedicationNdb) => {
    setMedications((prev) => [...prev, { id: Date.now(), name, timings: [], ndb }]);
    setNewMedName("");
    setDrugCandidates([]);
    setShowDropdown(false);
  }, [setMedications]);

  useEffect(() => {
    const q = newMedName.trim();
    if (!q) {
      setDrugCandidates([]);
      setShowDropdown(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiFetch(`/api/drugs/search?q=${encodeURIComponent(q)}&limit=15`);
        if (res.ok) {
          const { drugs } = await res.json();
          setDrugCandidates(drugs);
          setShowDropdown(true);
        } else {
          setDrugCandidates([]);
        }
      } catch {
        setDrugCandidates([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [newMedName]);

  return (
    <div className="bg-green-50 p-4 rounded-xl border border-green-200 space-y-4">
      <h3 className="font-bold text-green-800">💊 服薬中の薬</h3>
      <div className="relative">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMedName}
            onChange={(e) => setNewMedName(e.target.value)}
            onFocus={() => drugCandidates.length > 0 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (drugCandidates.length > 0) {
                  const first = drugCandidates[0];
                  addMedication(first.name, {
                    drugCode: first.code,
                    categoryName: first.categoryName,
                    price: first.price,
                    isGeneric: first.isGeneric,
                  });
                } else if (newMedName.trim()) {
                  addMedication(newMedName.trim());
                }
              }
            }}
            placeholder="薬の名前を入力（候補から選択 or 手動追加）"
            className="flex-1 p-2 border rounded text-sm"
          />
          <button
            type="button"
            onClick={() => {
              if (newMedName.trim()) {
                if (drugCandidates.length > 0) {
                  const first = drugCandidates[0];
                  addMedication(first.name, {
                    drugCode: first.code,
                    categoryName: first.categoryName,
                    price: first.price,
                    isGeneric: first.isGeneric,
                  });
                } else {
                  addMedication(newMedName.trim());
                }
              }
            }}
            disabled={searching}
            className="px-4 py-2 bg-green-600 text-white rounded font-bold text-sm hover:bg-green-700 disabled:opacity-50"
          >
            {searching ? "検索中..." : "追加"}
          </button>
        </div>
        {showDropdown && drugCandidates.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-green-200 rounded shadow-lg">
            {drugCandidates.map((d) => (
              <li key={`${d.code}-${d.name}`}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addMedication(d.name, {
                      drugCode: d.code,
                      categoryName: d.categoryName,
                      price: d.price,
                      isGeneric: d.isGeneric,
                    });
                  }}
                >
                  <span className="font-medium text-green-800">{d.name}</span>
                  {(d.categoryName || d.price != null) && (
                    <span className="ml-2 text-gray-500 text-xs">
                      {d.categoryName}
                      {d.price != null && `／${d.price}円`}
                      {d.isGeneric && "（後発品）"}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {medications.length > 0 ? (
        <div className="space-y-3">
          {medications.map((med) => (
            <div key={med.id} className="bg-white p-3 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-green-800">{med.name}</span>
                <button
                  type="button"
                  onClick={() => setMedications((prev) => prev.filter((m) => m.id !== med.id))}
                  className="text-red-500 hover:text-red-700 text-sm px-2"
                >
                  🗑️ 削除
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MEDICATION_TIMINGS.map((timing) => (
                  <button
                    key={timing}
                    type="button"
                    onClick={() => {
                      setMedications((prev) =>
                        prev.map((m) => {
                          if (m.id !== med.id) return m;
                          const newTimings = m.timings.includes(timing)
                            ? m.timings.filter((t) => t !== timing)
                            : [...m.timings, timing];
                          return { ...m, timings: newTimings };
                        })
                      );
                    }}
                    className={`py-2 rounded-lg border-2 font-bold text-xs transition ${
                      med.timings.includes(timing)
                        ? "border-green-500 bg-green-100 text-green-800"
                        : "border-gray-200 bg-gray-50 text-gray-400 hover:border-green-300"
                    }`}
                  >
                    {timing}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">薬が登録されていません</p>
      )}
      <p className="text-xs text-gray-500 mb-3">記録画面に服用タイミングが表示されます</p>
      <div className="border-t border-green-200 pt-3 mt-3">
        <p className="text-xs font-bold text-green-800 mb-2">リマインダー表示時刻（リマインダー画面で使用）</p>
        <div className="grid grid-cols-2 gap-2">
          {MEDICATION_TIMINGS.map((t) => (
            <div key={t} className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 w-8">{t}</span>
              <input
                type="time"
                value={reminderTimes[t] ?? "08:00"}
                onChange={(e) =>
                  setReminderTimes((prev) => ({ ...prev, [t]: e.target.value }))
                }
                className="flex-1 p-2 border rounded text-sm"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
