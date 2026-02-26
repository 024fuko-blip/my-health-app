"use client";

import type React from 'react';
import { getCyclePhase, getTsundereComment, getAmayamaComment, getKibishimeComment, getNaruseComment } from '@/lib/cycle-phase';
import { ResultModal } from './components/ResultModal';
import { MentalSection } from './components/MentalSection';
import { IbdSection } from './components/IbdSection';
import { DietSection } from './components/DietSection';
import { AlcoholSection } from './components/AlcoholSection';
import { MealSection } from './components/MealSection';
import { BasicInfoSection } from './components/BasicInfoSection';
import { useRecordForm } from './hooks/useRecordForm';

function CollapsibleSection({
  title,
  icon,
  defaultOpen,
  children,
}: {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-slate-100 cursor-pointer list-none">
        <span className="font-bold text-slate-700 flex items-center gap-2">
          <span>{icon}</span>
          {title}
        </span>
        <span className="text-xs text-gray-600 group-open:rotate-180 transition-transform">
          &#9660;
        </span>
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

export default function RecordPage() {
  const form = useRecordForm();

  if (form.loading) return <div>読み込み中...</div>;

  const cyclePhase =
    form.gender === 'female' && form.periodSettings.lastPeriodDate
      ? getCyclePhase(
          form.date,
          form.periodSettings.lastPeriodDate,
          form.periodSettings.periodCycle,
          form.periodSettings.periodDuration
        )
      : null;
  const cycleComment =
    cyclePhase && form.gender === 'female'
      ? form.aiPersonality === 'amayama'
        ? getAmayamaComment(cyclePhase)
        : form.aiPersonality === 'kibishime'
          ? getKibishimeComment(cyclePhase)
          : form.aiPersonality === 'naruse'
            ? getNaruseComment(cyclePhase)
            : getTsundereComment(cyclePhase)
      : '';

  const dateObj = new Date(form.date);
  const isToday = form.date === new Date().toISOString().split('T')[0];
  const formattedDate = dateObj.toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  // 今日の記録プログレス（次に何をすべきか明確に）
  const progress = (() => {
    if (!isToday) return null;
    const sections: { filled: boolean; label: string }[] = [
      { filled: form.generalMood != null, label: '体調' },
      { filled: (form.mealDescription ?? '').trim().length > 0, label: '食事' },
      ...(form.modes.mode_ibd
        ? [{ filled: form.painLevel != null || form.toiletCount > 0 || (form.stoolType ?? '').length > 0, label: 'IBD' }]
        : []),
      ...(form.modes.mode_diet
        ? [{ filled: (form.weight ?? '').length > 0 || (form.calories ?? '').length > 0 || (form.steps ?? '').length > 0, label: 'ダイエット' }]
        : []),
      ...(form.modes.mode_alcohol ? [{ filled: form.addedDrinks.length > 0, label: '飲酒' }] : []),
      ...(form.modes.mode_mental
        ? [{ filled: (form.sleepQuality ?? '').length > 0 || (form.selectedEmotion ?? '').length > 0 || (form.mentalDiary ?? '').trim().length > 0, label: 'メンタル' }]
        : []),
    ];
    const filled = sections.filter((s) => s.filled).length;
    const total = sections.length;
    return { filled, total, sections };
  })();

  return (
    <div className="space-y-6 pb-24 relative bg-[var(--color-card)]">
      <div className="p-4 rounded-xl shadow-sm bg-white border border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-slate-800">{formattedDate}</p>
            {isToday && <span className="text-sm font-medium text-slate-600">📅 今日</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const d = new Date(form.date);
                d.setDate(d.getDate() - 1);
                form.setDate(d.toISOString().split('T')[0]);
              }}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              aria-label="前日"
            >
              &#8249;
            </button>
            <input
              type="date"
              value={form.date}
              onChange={(e) => form.setDate(e.target.value)}
              className="text-sm border border-slate-200 p-2 rounded w-auto text-slate-600"
            />
            <button
              type="button"
              onClick={() => {
                const d = new Date(form.date);
                d.setDate(d.getDate() + 1);
                form.setDate(d.toISOString().split('T')[0]);
              }}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
              aria-label="翌日"
            >
              &#8250;
            </button>
          </div>
        </div>
        {progress && progress.total > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-600 mb-2">
              今日の記録 {progress.filled}/{progress.total} 項目
            </p>
            <div className="flex gap-1 flex-wrap">
              {progress.sections.map((s, i) => (
                <span
                  key={i}
                  className={`text-xs px-2 py-1 rounded-full ${
                    s.filled
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-slate-100 text-slate-400 border border-dashed border-slate-300'
                  }`}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {form.gender === 'female' && form.periodSettings.showPeriodOnCalendar && form.periodSettings.lastPeriodDate && cyclePhase && (
        <div className="relative">
          <div className="p-4 border border-[var(--color-border)] shadow-kirei-card relative bg-[var(--color-card)]">
            <div className="flex items-start gap-3">
              <div className="text-4xl flex-shrink-0">
                {cyclePhase.phase === 'period' && '😣'}
                {cyclePhase.phase === 'follicular' && '✨'}
                {cyclePhase.phase === 'ovulation' && '🥚'}
                {cyclePhase.phase === 'luteal_early' && '🌙'}
                {cyclePhase.phase === 'pms' && '😤'}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-slate-700">
                    今日のあなたへ
                  </span>
                  <span className="text-xs px-2 py-0.5 text-gray-700 bg-[var(--color-border)]/80">
                    周期 {cyclePhase.dayInCycle}日目
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {cycleComment}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cyclePhase.daysUntilPeriod > 0 && (
                    <span className="text-xs px-2 py-1 border bg-white/80 border-[var(--color-border)]">
                      🩸 生理まで {cyclePhase.daysUntilPeriod}日
                    </span>
                  )}
                  {cyclePhase.daysUntilOvulation > 0 && cyclePhase.phase !== 'pms' && (
                    <span className="text-xs px-2 py-1 border bg-white/80 border-[var(--color-border)]">
                      🥚 排卵まで {cyclePhase.daysUntilOvulation}日
                    </span>
                  )}
                  {cyclePhase.isOvulationWindow && (
                    <span className="text-xs bg-[var(--color-accent-pink)] text-[var(--color-text)] px-2 py-1 border border-[var(--color-border)] font-bold">
                      ⚠️ 妊娠しやすい時期
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={form.handleSubmit} className="space-y-6">
        <BasicInfoSection
          formState={{
            generalMood: form.generalMood,
            temperature: form.temperature,
            weight: form.weight,
            periodStatus: form.periodStatus,
            skinCondition: form.skinCondition,
            medicationTaken: form.medicationTaken,
          }}
          setGeneralMood={form.setGeneralMood}
          setTemperature={form.setTemperature}
          setWeight={form.setWeight}
          setPeriodStatus={form.setPeriodStatus}
          setSkinCondition={form.setSkinCondition}
          setMedicationTaken={form.setMedicationTaken}
          medications={form.medications}
          onMedicationStatusSave={form.saveMedicationStatusToLog}
          periodConfig={{
            lastPeriodDate: form.periodSettings.lastPeriodDate,
            selectedDate: form.date,
            onPeriodStart: form.handlePeriodStart,
            onPeriodEnd: form.handlePeriodEnd,
            onPeriodStatusSave: form.savePeriodStatusToLog,
          }}
          gender={form.gender}
          onUserEdit={form.markUserEdit}
          defaultTemperature={form.defaultTemperature}
          defaultWeight={form.defaultWeight}
        />

        <CollapsibleSection title="食事" icon="🍽️" defaultOpen>
          <MealSection
            mealDescription={form.mealDescription}
            setMealDescription={form.setMealDescription}
            handleEstimateFromText={form.handleEstimateFromText}
            isAnalyzing={form.isAnalyzing}
            isDragging={form.isDragging}
            handleDragOver={form.handleDragOver}
            handleDragLeave={form.handleDragLeave}
            handleDrop={form.handleDrop}
            handleMealImageChange={form.handleMealImageChange}
            mealImageBase64={form.mealImageBase64}
            clearMealImage={form.clearMealImage}
            nutritionData={form.nutritionData}
            setNutritionData={form.setNutritionData}
          />
        </CollapsibleSection>

        {form.modes.mode_ibd && (
          <CollapsibleSection title="IBDチェック" icon="🏥">
            <IbdSection
              onUserEdit={form.markUserEdit}
              toiletCount={form.toiletCount}
              setToiletCount={form.setToiletCount}
              painLevel={form.painLevel}
              setPainLevel={form.setPainLevel}
            />
          </CollapsibleSection>
        )}

        {form.modes.mode_diet && (
          <CollapsibleSection title="ボディメイク" icon="💪">
            <DietSection
              weight={form.weight}
              onUserEdit={form.markUserEdit}
              bodyFat={form.bodyFat}
              setBodyFat={form.setBodyFat}
              calories={form.calories}
              setCalories={form.setCalories}
              protein={form.protein}
              setProtein={form.setProtein}
              steps={form.steps}
              setSteps={form.setSteps}
            />
          </CollapsibleSection>
        )}

        {form.modes.mode_alcohol && (
          <CollapsibleSection title="アルコール" icon="🍺">
            <AlcoholSection
              onUserEdit={form.markUserEdit}
              addedDrinks={form.addedDrinks}
              selectedDrinkKey={form.selectedDrinkKey}
              setSelectedDrinkKey={form.setSelectedDrinkKey}
              drinkCount={form.drinkCount}
              setDrinkCount={form.setDrinkCount}
              handleAddDrink={form.handleAddDrink}
              handleRemoveDrink={form.handleRemoveDrink}
              drinkStartTime={form.drinkStartTime}
              setDrinkStartTime={form.setDrinkStartTime}
              drinkEndTime={form.drinkEndTime}
              setDrinkEndTime={form.setDrinkEndTime}
              currentTotalPureAlcohol={form.currentTotalPureAlcohol}
              currentTotalMl={form.currentTotalMl}
              previousAlcoholSummary={form.previousAlcoholSummary}
              decompositionHours={form.decompositionHours}
              soberTime={form.soberTime}
              effectiveWeight={form.effectiveWeight}
            />
          </CollapsibleSection>
        )}

        {form.modes.mode_mental && (
          <CollapsibleSection title="メンタル" icon="🌿">
            <MentalSection
              onUserEdit={form.markUserEdit}
              selectedEmotion={form.selectedEmotion}
              setSelectedEmotion={form.setSelectedEmotion}
              sleepQuality={form.sleepQuality}
              setSleepQuality={form.setSleepQuality}
              mentalDiary={form.mentalDiary}
              setMentalDiary={form.setMentalDiary}
            />
          </CollapsibleSection>
        )}

        <div>
          <label className="text-sm font-bold block mb-1">ひとことメモ</label>
          <textarea
            value={form.memo}
            onChange={(e) => form.setMemo(e.target.value)}
            className="w-full border p-3 rounded-lg h-20"
          />
        </div>

        <button
          type="submit"
          disabled={form.isSubmitting}
          className="w-full bg-[var(--color-sage)] hover:opacity-90 text-white p-4 font-medium shadow-kirei-card disabled:opacity-50 transition"
        >
          {form.isSubmitting ? '分析中...' : '記録して相棒に報告'}
        </button>
      </form>

      {form.resultModal && (
        <ResultModal
          msg={form.resultModal.msg}
          aiPersonality={form.aiPersonality}
          onClose={form.handleCloseModal}
        />
      )}
    </div>
  );
}
