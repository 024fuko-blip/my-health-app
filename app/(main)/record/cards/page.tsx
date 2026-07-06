"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRecordForm } from "../hooks/useRecordForm";
import { EMOTIONS } from "@/lib/record-constants";
import { DRINK_PRESETS } from "@/lib/alcohol-calc";
import { RecordReactionOverlay } from "../components/RecordReactionOverlay";
import { ResultModal } from "../components/ResultModal";
import { CardShell } from "./components/CardShell";

/* ================================================================
   汎用 UI パーツ（大きくてわかりやすい入力部品）
   ================================================================ */

function BigSelect({
  options,
  value,
  onChange,
  columns = 5,
}: {
  options: { key: string | number; emoji: string; label: string }[];
  value: string | number;
  onChange: (v: string | number) => void;
  columns?: number;
}) {
  return (
    <div className={`grid gap-3 w-full`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`flex flex-col items-center gap-1 py-4 rounded-2xl border-2 transition-all ${
            String(value) === String(o.key)
              ? "border-amber-500 bg-amber-50 shadow-md scale-105"
              : "border-gray-200 bg-white hover:border-amber-300"
          }`}
        >
          <span className="text-4xl">{o.emoji}</span>
          <span className="text-xs font-medium text-gray-700">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function BigStepper({
  value,
  onChange,
  step,
  min,
  max,
  unit,
  decimals = 1,
}: {
  value: string;
  onChange: (v: string) => void;
  step: number;
  min: number;
  max: number;
  unit: string;
  decimals?: number;
}) {
  const numVal = parseFloat(value) || 0;
  const inc = () => {
    const next = Math.min(max, numVal + step);
    onChange(next.toFixed(decimals));
  };
  const dec = () => {
    const next = Math.max(min, numVal - step);
    onChange(next.toFixed(decimals));
  };
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={dec}
        className="w-16 h-16 rounded-full bg-gray-100 text-3xl font-bold text-gray-600 hover:bg-gray-200 transition"
      >
        −
      </button>
      <div className="text-center min-w-[140px]">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-5xl font-bold text-center text-gray-800 bg-transparent w-full outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          style={{ MozAppearance: "textfield" } as React.CSSProperties}
        />
        <span className="text-lg text-gray-500">{unit}</span>
      </div>
      <button
        type="button"
        onClick={inc}
        className="w-16 h-16 rounded-full bg-gray-100 text-3xl font-bold text-gray-600 hover:bg-gray-200 transition"
      >
        +
      </button>
    </div>
  );
}

function BigCounter({
  value,
  onChange,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-6">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-20 h-20 rounded-full bg-gray-100 text-4xl font-bold text-gray-600 hover:bg-gray-200 transition"
      >
        −
      </button>
      <div className="text-center">
        <span className="text-6xl font-bold text-gray-800">{value}</span>
        <span className="text-xl text-gray-500 ml-1">{unit}</span>
      </div>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-20 h-20 rounded-full bg-amber-100 text-4xl font-bold text-amber-700 hover:bg-amber-200 transition"
      >
        +
      </button>
    </div>
  );
}

/* ================================================================
   カード定義
   ================================================================ */

interface CardDef {
  id: string;
  emoji: string;
  title: string;
  subtitle?: string;
  visible: boolean;
  render: () => React.ReactNode;
}

/* ================================================================
   メインページ
   ================================================================ */

export default function RecordCardsPage() {
  const form = useRecordForm();
  const [cardIndex, setCardIndex] = useState(0);

  const MOOD_OPTIONS = useMemo(
    () => [
      { key: 1, emoji: "😢", label: "つらい" },
      { key: 2, emoji: "😟", label: "低め" },
      { key: 3, emoji: "😐", label: "ふつう" },
      { key: 4, emoji: "🙂", label: "いい感じ" },
      { key: 5, emoji: "😄", label: "最高！" },
    ],
    []
  );

  const PAIN_OPTIONS = useMemo(
    () => [
      { key: 1, emoji: "😊", label: "なし" },
      { key: 2, emoji: "😐", label: "少し" },
      { key: 3, emoji: "😟", label: "中程度" },
      { key: 4, emoji: "😣", label: "強い" },
      { key: 5, emoji: "😫", label: "激痛" },
    ],
    []
  );

  const SLEEP_OPTIONS = useMemo(
    () => [
      { key: "悪い", emoji: "😩", label: "悪い" },
      { key: "普通", emoji: "😐", label: "普通" },
      { key: "良い", emoji: "😴", label: "良い" },
    ],
    []
  );

  const EMOTION_OPTIONS = useMemo(
    () => EMOTIONS.map((e) => ({ key: e.label, emoji: e.emoji, label: e.label })),
    []
  );

  const DRINK_OPTIONS = useMemo(
    () =>
      Object.entries(DRINK_PRESETS).map(([key, p]) => ({
        key,
        label: p.label,
        ml: p.ml,
        percent: p.percent,
      })),
    []
  );

  const cards: CardDef[] = useMemo(() => {
    const hasMeds = form.medications.length > 0;
    return [
      {
        id: "mood",
        emoji: "😊",
        title: "今日の気分は？",
        subtitle: "一番近いものをタップ",
        visible: true,
        render: () => (
          <BigSelect
            options={MOOD_OPTIONS}
            value={form.generalMood}
            onChange={(v) => form.setGeneralMood(Number(v))}
          />
        ),
      },
      {
        id: "temperature",
        emoji: "🌡️",
        title: "体温",
        subtitle: "今日の体温を入力",
        visible: true,
        render: () => (
          <BigStepper
            value={form.temperature || form.defaultTemperature || "36.5"}
            onChange={(v) => { form.setTemperature(v); form.markUserEdit(); }}
            step={0.1}
            min={34}
            max={42}
            unit="°C"
          />
        ),
      },
      {
        id: "meal",
        emoji: "🍽️",
        title: "食事の記録",
        subtitle: "何を食べた？写真もOK",
        visible: true,
        render: () => (
          <div className="w-full space-y-3">
            <textarea
              value={form.mealDescription}
              onChange={(e) => { form.setMealDescription(e.target.value); form.markUserEdit(); }}
              placeholder="朝: トースト、コーヒー&#10;昼: カレーライス&#10;夜: ..."
              className="w-full h-40 p-4 rounded-2xl border-2 border-gray-200 text-lg resize-none focus:border-amber-400 focus:outline-none"
            />
            <label className="flex items-center justify-center gap-2 py-3 bg-amber-50 rounded-2xl border-2 border-dashed border-amber-300 cursor-pointer hover:bg-amber-100 transition">
              <span className="text-2xl">📷</span>
              <span className="font-bold text-amber-700">写真から記録</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={form.handleMealImageChange}
              />
            </label>
          </div>
        ),
      },
      {
        id: "medication",
        emoji: "💊",
        title: "お薬チェック",
        subtitle: "飲んだ薬をタップ",
        visible: hasMeds,
        render: () => (
          <div className="w-full space-y-3">
            {form.medications.map((med) => (
              <div key={med.id} className="bg-gray-50 rounded-2xl p-4">
                <p className="font-bold text-lg text-gray-800 mb-2">{med.name}</p>
                <div className="flex gap-2">
                  {med.timings.map((timing) => {
                    const key = `${med.id}_${timing}`;
                    const checked = form.medicationTaken[key] ?? false;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          const next = !checked;
                          form.setMedicationTaken((prev) => ({ ...prev, [key]: next }));
                          form.saveMedicationStatusToLog(key, next);
                        }}
                        className={`flex-1 py-3 rounded-xl font-bold text-base transition-all ${
                          checked
                            ? "bg-green-500 text-white shadow-md"
                            : "bg-white border-2 border-gray-200 text-gray-600"
                        }`}
                      >
                        {checked ? "✓ " : ""}{timing}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: "pain",
        emoji: "🤕",
        title: "痛みレベル",
        subtitle: "おなかの痛みはどう？",
        visible: Boolean(form.modes.mode_ibd),
        render: () => (
          <BigSelect
            options={PAIN_OPTIONS}
            value={form.painLevel}
            onChange={(v) => { form.setPainLevel(Number(v)); form.markUserEdit(); }}
          />
        ),
      },
      {
        id: "toilet",
        emoji: "🚽",
        title: "トイレ回数",
        subtitle: "今日のトイレ回数",
        visible: Boolean(form.modes.mode_ibd),
        render: () => (
          <BigCounter
            value={form.toiletCount}
            onChange={(v) => { form.setToiletCount(v); form.markUserEdit(); }}
            unit="回"
          />
        ),
      },
      {
        id: "weight",
        emoji: "⚖️",
        title: "体重",
        subtitle: "今日の体重",
        visible: Boolean(form.modes.mode_diet) || Boolean(form.modes.mode_ibd),
        render: () => (
          <BigStepper
            value={form.weight || form.defaultWeight || "60.0"}
            onChange={(v) => { form.setWeight(v); form.markUserEdit(); }}
            step={0.1}
            min={20}
            max={200}
            unit="kg"
          />
        ),
      },
      {
        id: "calories",
        emoji: "🔥",
        title: "カロリー・栄養",
        subtitle: "今日の食事カロリー",
        visible: Boolean(form.modes.mode_diet),
        render: () => (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.calories}
                  onChange={(e) => { form.setCalories(e.target.value); form.markUserEdit(); }}
                  placeholder="0"
                  className="text-5xl font-bold text-center text-gray-800 bg-transparent w-40 outline-none"
                />
                <span className="text-lg text-gray-500">kcal</span>
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              {[500, 1000, 1500, 2000, 2500].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { form.setCalories(String(v)); form.markUserEdit(); }}
                  className={`px-3 py-2 rounded-xl text-sm font-bold transition ${
                    form.calories === String(v)
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <label className="text-xs text-gray-500">タンパク質</label>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={form.protein}
                    onChange={(e) => { form.setProtein(e.target.value); form.markUserEdit(); }}
                    placeholder="0"
                    className="text-2xl font-bold text-center bg-transparent w-20 outline-none"
                  />
                  <span className="text-sm text-gray-500">g</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <label className="text-xs text-gray-500">歩数</label>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.steps}
                    onChange={(e) => { form.setSteps(e.target.value); form.markUserEdit(); }}
                    placeholder="0"
                    className="text-2xl font-bold text-center bg-transparent w-24 outline-none"
                  />
                  <span className="text-sm text-gray-500">歩</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <label className="text-xs text-gray-500">運動時間</label>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={form.exerciseMinutes}
                    onChange={(e) => { form.setExerciseMinutes(e.target.value); form.markUserEdit(); }}
                    placeholder="0"
                    className="text-2xl font-bold text-center bg-transparent w-20 outline-none"
                  />
                  <span className="text-sm text-gray-500">分</span>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "alcohol",
        emoji: "🍺",
        title: "お酒の記録",
        subtitle: "飲んだお酒をタップして追加",
        visible: Boolean(form.modes.mode_alcohol),
        render: () => (
          <div className="w-full space-y-4">
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {DRINK_OPTIONS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => form.addDrinkByKey(d.key, 1)}
                  className="flex items-center gap-2 py-3 px-3 rounded-xl bg-gray-50 border-2 border-gray-200 hover:border-amber-400 transition text-left"
                >
                  <span className="text-2xl">🍺</span>
                  <span className="text-sm font-medium text-gray-700 leading-tight">{d.label}</span>
                </button>
              ))}
            </div>
            {form.addedDrinks.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-gray-600">今日飲んだもの:</p>
                {form.addedDrinks.map((d) => (
                  <div key={d.id} className="flex items-center justify-between bg-amber-50 rounded-xl px-4 py-2">
                    <span className="text-sm">{d.label} × {d.count}</span>
                    <button
                      type="button"
                      onClick={() => form.handleRemoveDrink(d.id)}
                      className="text-red-400 text-lg"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <p className="text-center text-sm text-amber-700 font-bold">
                  合計 {form.currentTotalMl}ml
                </p>
              </div>
            )}
          </div>
        ),
      },
      {
        id: "emotion",
        emoji: "💭",
        title: "今日の感情",
        subtitle: "一番近い感情をタップ",
        visible: Boolean(form.modes.mode_mental),
        render: () => (
          <BigSelect
            options={EMOTION_OPTIONS}
            value={form.selectedEmotion}
            onChange={(v) => { form.setSelectedEmotion(String(v)); form.markUserEdit(); }}
            columns={4}
          />
        ),
      },
      {
        id: "sleep",
        emoji: "😴",
        title: "睡眠の質",
        subtitle: "昨夜の睡眠はどうだった？",
        visible: Boolean(form.modes.mode_mental),
        render: () => (
          <BigSelect
            options={SLEEP_OPTIONS}
            value={form.sleepQuality}
            onChange={(v) => { form.setSleepQuality(String(v)); form.markUserEdit(); }}
            columns={3}
          />
        ),
      },
      {
        id: "memo",
        emoji: "📝",
        title: "ひとことメモ",
        subtitle: "何かあれば自由に",
        visible: true,
        render: () => (
          <textarea
            value={form.memo}
            onChange={(e) => { form.setMemo(e.target.value); form.markUserEdit(); }}
            placeholder="今日あったこと、気になったこと..."
            className="w-full h-40 p-4 rounded-2xl border-2 border-gray-200 text-lg resize-none focus:border-amber-400 focus:outline-none"
          />
        ),
      },
    ].filter((c) => c.visible);
  }, [form, MOOD_OPTIONS, PAIN_OPTIONS, SLEEP_OPTIONS, EMOTION_OPTIONS, DRINK_OPTIONS]);

  const goNext = useCallback(() => setCardIndex((i) => Math.min(i + 1, cards.length - 1)), [cards.length]);
  const goBack = useCallback(() => setCardIndex((i) => Math.max(i - 1, 0)), []);
  const currentCard = cards[cardIndex];

  /* サマリー構築 */
  const summaryItems = useMemo(() => {
    const items: { label: string; value: string }[] = [];
    const moodMap: Record<number, string> = { 1: "😢 つらい", 2: "😟 低め", 3: "😐 ふつう", 4: "🙂 いい感じ", 5: "😄 最高！" };
    items.push({ label: "気分", value: moodMap[form.generalMood] ?? "未入力" });
    if (form.temperature) items.push({ label: "体温", value: `${form.temperature}°C` });
    if (form.mealDescription) items.push({ label: "食事", value: form.mealDescription.slice(0, 40) + (form.mealDescription.length > 40 ? "…" : "") });
    if (form.medications.length > 0) {
      const total = form.medications.flatMap((m) => m.timings.map((t) => `${m.id}_${t}`));
      const done = total.filter((k) => form.medicationTaken[k]);
      items.push({ label: "服薬", value: `${done.length}/${total.length} 完了` });
    }
    if (form.modes.mode_ibd) {
      const painLabels: Record<number, string> = { 1: "なし", 2: "少し", 3: "中程度", 4: "強い", 5: "激痛" };
      items.push({ label: "痛み", value: painLabels[form.painLevel] ?? "未入力" });
      items.push({ label: "トイレ", value: `${form.toiletCount}回` });
    }
    if (form.weight && (form.modes.mode_diet || form.modes.mode_ibd))
      items.push({ label: "体重", value: `${form.weight}kg` });
    if (form.modes.mode_diet && form.calories)
      items.push({ label: "カロリー", value: `${form.calories}kcal` });
    if (form.modes.mode_alcohol && form.addedDrinks.length > 0)
      items.push({ label: "お酒", value: `${form.currentTotalMl}ml` });
    if (form.modes.mode_mental && form.selectedEmotion)
      items.push({ label: "感情", value: form.selectedEmotion });
    if (form.modes.mode_mental)
      items.push({ label: "睡眠", value: form.sleepQuality });
    if (form.memo) items.push({ label: "メモ", value: form.memo.slice(0, 30) + (form.memo.length > 30 ? "…" : "") });
    return items;
  }, [form]);

  if (form.loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-bounce">📝</div>
          <p className="text-gray-500 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  const isOnSummary = cardIndex >= cards.length;

  return (
    <div className="pb-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/record"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
        >
          ←
        </Link>
        <h1 className="text-lg font-bold text-gray-800">かんたん記録</h1>
        <span className="text-sm text-gray-400 ml-auto">
          {new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
        </span>
      </div>

      <form onSubmit={form.handleSubmit}>
        {!isOnSummary && currentCard ? (
          <CardShell
            emoji={currentCard.emoji}
            title={currentCard.title}
            subtitle={currentCard.subtitle}
            current={cardIndex}
            total={cards.length + 1}
            onNext={() => {
              if (cardIndex === cards.length - 1) setCardIndex(cards.length);
              else goNext();
            }}
            onBack={goBack}
            onSkip={() => {
              if (cardIndex === cards.length - 1) setCardIndex(cards.length);
              else goNext();
            }}
            isFirst={cardIndex === 0}
            isLast={false}
          >
            {currentCard.render()}
          </CardShell>
        ) : (
          /* サマリーカード */
          <CardShell
            emoji="✅"
            title="確認して記録"
            subtitle="入力内容を確認してください"
            current={cards.length}
            total={cards.length + 1}
            onNext={() => {}}
            onBack={() => setCardIndex(cards.length - 1)}
            onSkip={undefined}
            isFirst={false}
            isLast={true}
            nextLabel={form.isSubmitting ? "送信中..." : "記録する 📝"}
          >
            <div className="w-full space-y-2">
              {summaryItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
                >
                  <span className="text-sm font-medium text-gray-500">{item.label}</span>
                  <span className="text-sm font-bold text-gray-800 text-right max-w-[60%] truncate">
                    {item.value}
                  </span>
                </div>
              ))}
              {summaryItems.length === 0 && (
                <p className="text-center text-gray-400 py-8">まだ何も入力されていません</p>
              )}
            </div>
          </CardShell>
        )}
      </form>

      {/* AI結果モーダル + ペットEXPオーバーレイ */}
      {form.reactionOverlay && (
        <RecordReactionOverlay
          expGained={form.reactionOverlay.expGained}
          leveledUp={form.reactionOverlay.leveledUp}
          streak={form.reactionOverlay.streak}
          onComplete={form.handleReactionComplete}
        />
      )}
      {form.resultModal?.show && (
        <ResultModal
          msg={form.resultModal.msg}
          aiPersonality={form.aiPersonality}
          onClose={form.handleCloseModal}
        />
      )}
    </div>
  );
}
