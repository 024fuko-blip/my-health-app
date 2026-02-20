"use client";

import { getCyclePhase, getTsundereComment, getAmayamaComment, getKibishimeComment } from '@/lib/cycle-phase';
import { ResultModal } from './components/ResultModal';
import { MentalSection } from './components/MentalSection';
import { IbdSection } from './components/IbdSection';
import { DietSection } from './components/DietSection';
import { AlcoholSection } from './components/AlcoholSection';
import { MealSection } from './components/MealSection';
import { BasicInfoSection } from './components/BasicInfoSection';
import { useRecordForm } from './hooks/useRecordForm';

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
          : getTsundereComment(cyclePhase)
      : '';

  const dateObj = new Date(form.date);
  const isToday = form.date === new Date().toISOString().split('T')[0];
  const formattedDate = dateObj.toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <div className="space-y-6 pb-24 relative bg-slate-50/30">
      <div className="p-4 rounded-xl shadow-sm bg-white border border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-slate-800">{formattedDate}</p>
            {isToday && <span className="text-sm font-medium text-slate-600">📅 今日</span>}
          </div>
          <input
            type="date"
            value={form.date}
            onChange={(e) => form.setDate(e.target.value)}
            className="text-sm border border-slate-200 p-2 rounded w-auto text-slate-600"
          />
        </div>
      </div>

      {form.gender === 'female' && form.periodSettings.lastPeriodDate && cyclePhase && (
        <div className="relative">
          <div className="p-4 rounded-2xl border border-slate-200 shadow-sm relative bg-slate-50">
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
                  <span className="text-xs px-2 py-0.5 rounded-full text-slate-600 bg-slate-200/80">
                    周期 {cyclePhase.dayInCycle}日目
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {cycleComment}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cyclePhase.daysUntilPeriod > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full border bg-white/80 border-slate-200">
                      🩸 生理まで {cyclePhase.daysUntilPeriod}日
                    </span>
                  )}
                  {cyclePhase.daysUntilOvulation > 0 && cyclePhase.phase !== 'pms' && (
                    <span className="text-xs px-2 py-1 rounded-full border bg-white/80 border-slate-200">
                      🥚 排卵まで {cyclePhase.daysUntilOvulation}日
                    </span>
                  )}
                  {cyclePhase.isOvulationWindow && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full border border-red-200 font-bold">
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
          generalMood={form.generalMood}
          setGeneralMood={form.setGeneralMood}
          temperature={form.temperature}
          setTemperature={form.setTemperature}
          weight={form.weight}
          setWeight={form.setWeight}
          medications={form.medications}
          medicationTaken={form.medicationTaken}
          setMedicationTaken={form.setMedicationTaken}
          gender={form.gender}
          periodStatus={form.periodStatus}
          setPeriodStatus={form.setPeriodStatus}
          skinCondition={form.skinCondition}
          setSkinCondition={form.setSkinCondition}
          onPeriodStart={form.handlePeriodStart}
          onPeriodEnd={form.handlePeriodEnd}
          onPeriodStatusSave={form.savePeriodStatusToLog}
          onMedicationStatusSave={form.saveMedicationStatusToLog}
          lastPeriodDate={form.periodSettings.lastPeriodDate}
          selectedDate={form.date}
          onUserEdit={form.markUserEdit}
        />

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

        {form.modes.mode_ibd && (
          <IbdSection
            onUserEdit={form.markUserEdit}
            toiletCount={form.toiletCount}
            setToiletCount={form.setToiletCount}
            painLevel={form.painLevel}
            setPainLevel={form.setPainLevel}
          />
        )}

        {form.modes.mode_diet && (
          <DietSection
            weight={form.weight}
            setWeight={form.setWeight}
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
        )}

        {form.modes.mode_alcohol && (
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
            userWeight={form.userWeight}
            setUserWeight={form.setUserWeight}
          />
        )}

        {form.modes.mode_mental && (
          <MentalSection
            onUserEdit={form.markUserEdit}
            selectedEmotion={form.selectedEmotion}
            setSelectedEmotion={form.setSelectedEmotion}
            sleepQuality={form.sleepQuality}
            setSleepQuality={form.setSleepQuality}
            mentalDiary={form.mentalDiary}
            setMentalDiary={form.setMentalDiary}
          />
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
          className="w-full bg-slate-600 hover:bg-slate-700 text-white p-4 rounded-xl font-medium shadow-sm disabled:bg-gray-400 transition"
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
