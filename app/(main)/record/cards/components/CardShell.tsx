"use client";

interface CardShellProps {
  emoji: string;
  title: string;
  subtitle?: string;
  current: number;
  total: number;
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;
  isFirst: boolean;
  isLast: boolean;
  nextLabel?: string;
  children: React.ReactNode;
}

export function CardShell({
  emoji,
  title,
  subtitle,
  current,
  total,
  onNext,
  onBack,
  onSkip,
  isFirst,
  isLast,
  nextLabel,
  children,
}: CardShellProps) {
  return (
    <div className="flex flex-col min-h-[calc(100dvh-80px)]">
      {/* Progress */}
      <div className="flex items-center gap-1.5 justify-center py-3">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i < current ? "bg-amber-500 w-6" : i === current ? "bg-amber-400 w-8" : "bg-gray-200 w-6"
            }`}
          />
        ))}
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 mx-1 flex-1 flex flex-col p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <span className="text-5xl block mb-2">{emoji}</span>
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {children}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 px-2 py-4">
          {!isFirst && (
            <button
              type="button"
              onClick={onBack}
              className="flex-shrink-0 px-5 py-3.5 rounded-2xl bg-gray-100 text-gray-600 font-bold text-base"
            >
              ← 戻る
            </button>
          )}
          {onSkip && !isLast && (
            <button
              type="button"
              onClick={onSkip}
              className="flex-shrink-0 px-4 py-3.5 text-gray-400 font-medium text-sm"
            >
              スキップ
            </button>
          )}
          <div className="flex-1" />
          {isLast ? (
            <button
              type="submit"
              className="px-8 py-3.5 rounded-2xl bg-amber-500 text-white font-bold text-lg shadow-md hover:bg-amber-600 transition"
            >
              {nextLabel ?? "記録する 📝"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="px-8 py-3.5 rounded-2xl bg-amber-500 text-white font-bold text-lg shadow-md hover:bg-amber-600 transition"
            >
              {nextLabel ?? "次へ →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
