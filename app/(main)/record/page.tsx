"use client";

import { getCyclePhase, getTsundereComment } from '@/lib/cycle-phase';
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
  const tsundereComment = cyclePhase ? getTsundereComment(cyclePhase) : '';

  const dateObj = new Date(form.date);
  const isToday = form.date === new Date().toISOString().split('T')[0];
  const formattedDate = dateObj.toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <div className="space-y-6 pb-24 relative">
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-gray-800">{formattedDate}</p>
            {isToday && <span className="text-sm text-blue-600 font-medium">📅 今日</span>}
          </div>
          <input
            type="date"
            value={form.date}
            onChange={(e) => form.setDate(e.target.value)}
            className="text-sm border p-2 rounded text-gray-500 w-auto"
          />
        </div>
      </div>

      {form.gender === 'female' && form.periodSettings.lastPeriodDate && cyclePhase && (
        <div className="relative">
          <div className="bg-gradient-to-r from-pink-100 to-purple-100 p-4 rounded-2xl border-2 border-pink-300 shadow-lg relative">
            <div className="absolute -bottom-3 left-8 w-6 h-6 bg-gradient-to-br from-pink-100 to-purple-100 border-r-2 border-b-2 border-pink-300 transform rotate-45" />
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
                  <span className="font-bold text-pink-800 text-sm">💋 今日のあんたへ</span>
                  <span className="text-xs text-pink-600 bg-pink-200 px-2 py-0.5 rounded-full">
                    周期 {cyclePhase.dayInCycle}日目
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {tsundereComment}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cyclePhase.daysUntilPeriod > 0 && (
                    <span className="text-xs bg-white px-2 py-1 rounded-full border border-pink-200">
                      🩸 生理まで {cyclePhase.daysUntilPeriod}日
                    </span>
                  )}
                  {cyclePhase.daysUntilOvulation > 0 && cyclePhase.phase !== 'pms' && (
                    <span className="text-xs bg-white px-2 py-1 rounded-full border border-purple-200">
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
          <div className="absolute -bottom-1 left-2 text-3xl">👹</div>
        </div>
      )}

      <form onSubmit={form.handleSubmit} className="space-y-6">
        <BasicInfoSection
          generalMood={form.generalMood}
          setGeneralMood={form.setGeneralMood}
          medications={form.medications}
          medicationTaken={form.medicationTaken}
          setMedicationTaken={form.setMedicationTaken}
          gender={form.gender}
          periodStatus={form.periodStatus}
          setPeriodStatus={form.setPeriodStatus}
          skinCondition={form.skinCondition}
          setSkinCondition={form.setSkinCondition}
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
            temperature={form.temperature}
            setTemperature={form.setTemperature}
            weight={form.weight}
            setWeight={form.setWeight}
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
          className="w-full bg-pink-600 hover:bg-pink-700 text-white p-4 rounded-xl font-bold shadow-lg disabled:bg-gray-400"
        >
          {form.isSubmitting ? '分析中...👹' : '記録して相棒に報告 📝'}
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
