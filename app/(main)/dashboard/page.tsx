"use client";

import { useState, useEffect } from 'react';
import { useDashboardData, type PeriodDays, type InsightTab } from './hooks/useDashboardData';
import { InsightTabSwitcher } from './components/InsightTabSwitcher';
import { InsightList } from './components/InsightList';
import { MedicationCard } from './components/MedicationCard';
import { TodayHealthCard } from './components/TodayHealthCard';
import { PeriodToggle } from './components/PeriodToggle';
import { HealthChart } from './components/HealthChart';
import { MindBodyScore } from './components/MindBodyScore';
import { CorrelationMap } from './components/CorrelationMap';
import { TriggerCards } from './components/TriggerCards';
import { AiReportSection } from './components/AiReportSection';
import { StepGoalReactionOverlay } from './components/StepGoalReactionOverlay';
import { SnsStylePetCard } from './components/SnsStylePetCard';
import { DEFAULT_STEP_GOAL } from '@/lib/constants';

const STEP_GOAL_STORAGE_KEY = 'stepGoalReactionShown';

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodDays>(7);
  const [insightTab, setInsightTab] = useState<InsightTab>('daily');
  const [showStepGoalOverlay, setShowStepGoalOverlay] = useState(false);

  const {
    loading,
    report,
    analyzing,
    insights,
    insightsLoading,
    insightGenerating,
    triggers,
    correlations,
    todayLog,
    sectionOpen,
    setSectionOpen,
    modes,
    medications,
    selectedItems,
    toggleItem,
    handleRegenerateInsight,
    mindScore,
    bodyScore,
    chartData,
    availableItems,
  } = useDashboardData(period, insightTab);

  useEffect(() => {
    if (insightTab !== 'daily' || loading || !todayLog) return;
    if (!modes.mode_diet) return;
    const steps = todayLog.steps ?? 0;
    if (steps < DEFAULT_STEP_GOAL) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      const stored = localStorage.getItem(STEP_GOAL_STORAGE_KEY);
      if (stored === today) return;
      setShowStepGoalOverlay(true);
    } catch {
      setShowStepGoalOverlay(true);
    }
  }, [insightTab, loading, todayLog, modes.mode_diet]);

  const handleStepGoalComplete = () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      localStorage.setItem(STEP_GOAL_STORAGE_KEY, today);
    } catch {
      /* ignore */
    }
    setShowStepGoalOverlay(false);
  };

  if (insightTab === 'daily' && loading) return <div className="p-4">読み込み中...</div>;
  if (insightTab !== 'daily' && insightsLoading) return <div className="p-4">読み込み中...</div>;

  return (
    <div className="space-y-6 pb-20">
      {showStepGoalOverlay && todayLog && (todayLog.steps ?? 0) >= DEFAULT_STEP_GOAL && (
        <StepGoalReactionOverlay
          todaySteps={todayLog.steps ?? 0}
          stepGoal={DEFAULT_STEP_GOAL}
          onComplete={handleStepGoalComplete}
        />
      )}
      <InsightTabSwitcher insightTab={insightTab} setInsightTab={setInsightTab} />

      {insightTab !== 'daily' ? (
        <InsightList
          insightTab={insightTab}
          insights={insights}
          insightGenerating={insightGenerating}
          onRegenerate={handleRegenerateInsight}
        />
      ) : (
        <>
          <SnsStylePetCard visible={insightTab === 'daily'} />
          <MedicationCard medications={medications} />
          <TodayHealthCard todayLog={todayLog} modes={modes} />
          <PeriodToggle period={period} setPeriod={setPeriod} />
          <HealthChart
            period={period}
            chartData={chartData}
            availableItems={availableItems}
            selectedItems={selectedItems}
            toggleItem={toggleItem}
            sectionOpen={sectionOpen}
            setSectionOpen={setSectionOpen}
          />
          <MindBodyScore
            period={period}
            mindScore={mindScore}
            bodyScore={bodyScore}
            sectionOpen={sectionOpen}
            setSectionOpen={setSectionOpen}
          />
          <CorrelationMap
            correlations={correlations}
            sectionOpen={sectionOpen}
            setSectionOpen={setSectionOpen}
          />
          <TriggerCards triggers={triggers} sectionOpen={sectionOpen} setSectionOpen={setSectionOpen} />
          <AiReportSection
            report={report}
            analyzing={analyzing}
            sectionOpen={sectionOpen}
            setSectionOpen={setSectionOpen}
          />
        </>
      )}
    </div>
  );
}
