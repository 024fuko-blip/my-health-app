"use client";

import { useState } from 'react';
import { getPeriodStatus } from '@/lib/period-status';
import { LogDetailModal } from './components/LogDetailModal';
import { CalendarCell } from './components/CalendarCell';
import { PeriodLegend } from './components/PeriodLegend';
import { useCalendarData } from './hooks/useCalendarData';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const {
    year,
    month,
    firstDay,
    lastDate,
    logs,
    selectedLog,
    setSelectedLog,
    loading,
    isEditing,
    setIsEditing,
    editForm,
    setEditForm,
    periodSettings,
    handleToggleShowPeriod,
    handleDateClick,
    handleDelete,
    handleUpdate,
  } = useCalendarData(currentDate);

  const changeMonth = (diff: number) => {
    setCurrentDate(new Date(year, month - 1 + diff, 1));
    setSelectedLog(null);
  };

  const renderCalendarCells = () => {
    const cells = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="h-24 bg-gray-50 border border-gray-100"></div>);
    }
    for (let day = 1; day <= lastDate; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const log = logs.find((l) => l.date === dateStr);
      const periodStatus =
        periodSettings.showPeriodOnCalendar && periodSettings.gender === 'female'
          ? getPeriodStatus(dateStr, periodSettings.lastPeriodDate, periodSettings.periodCycle, periodSettings.periodDuration)
          : { type: null };
      cells.push(
        <CalendarCell
          key={day}
          day={day}
          log={log}
          periodStatus={periodStatus}
          onDateClick={handleDateClick}
        />
      );
    }
    return cells;
  };

  if (loading) return <div className="p-4">読み込み中...</div>;

  return (
    <div className="pb-24">
      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-xl shadow-sm">
        <button
          onClick={() => changeMonth(-1)}
          className="p-2 text-gray-700 hover:bg-gray-100 rounded"
        >
          ◀
        </button>
        <h2 className="text-xl font-bold text-gray-800">
          {year}年 {month}月
        </h2>
        <button
          onClick={() => changeMonth(1)}
          className="p-2 text-gray-700 hover:bg-gray-100 rounded"
        >
          ▶
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 text-center bg-gray-50 border-b">
          {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
            <div key={d} className="py-2 text-xs font-bold text-gray-700">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">{renderCalendarCells()}</div>
      </div>

      {periodSettings.gender === 'female' && periodSettings.lastPeriodDate && (
        <PeriodLegend
          showPeriodOnCalendar={periodSettings.showPeriodOnCalendar}
          onToggle={handleToggleShowPeriod}
        />
      )}

      {selectedLog && (
        <LogDetailModal
          selectedLog={selectedLog}
          editForm={editForm}
          setEditForm={setEditForm}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
