"use client";

import { useState } from 'react';
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

export default function DashboardPage() {
  const [period, setPeriod] = useState<PeriodDays>(7);
  const [insightTab, setInsightTab] = useState<InsightTab>('daily');

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

  if (insightTab === 'daily' && loading) return <div className="p-4">読み込み中...</div>;
  if (insightTab !== 'daily' && insightsLoading) return <div className="p-4">読み込み中...</div>;

  return (
    <div className="space-y-6 pb-20">
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
          <MedicationCard medications={medications} todayLog={todayLog} />
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
