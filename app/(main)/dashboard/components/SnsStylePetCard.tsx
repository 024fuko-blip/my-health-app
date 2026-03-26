"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ensureSession, apiFetch, handleUnauthorized } from "@/lib/api-client";
import { getSnsCatMessage } from "@/lib/sns-cat-messages";
import { MangaSymbol } from "@/app/components/MangaSymbol";

/** Lv.5 サングラスねこ画像 */
const LV5_SUNGLASSES_IMAGE_PATH = "/pets/cat/stage_5_sunglasses.png";

interface SnsStylePetCardProps {
  /** 表示をスキップするか（夕方以外など） */
  visible?: boolean;
}

function isStage5OrHigher(stage: string | undefined): boolean {
  if (!stage?.startsWith("stage_")) return false;
  const n = parseInt(stage.replace("stage_", ""), 10);
  return n >= 5;
}

export function SnsStylePetCard({ visible = true }: SnsStylePetCardProps) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState<{ text: string; mangaEmoji: "💡" | "💢" } | null>(null);
  const [speciesEmoji, setSpeciesEmoji] = useState("🐱");
  const [useEmoji, setUseEmoji] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const load = async () => {
      const session = await ensureSession(router);
      if (!session) return;

      const [petRes, logsRes] = await Promise.all([
        apiFetch("/api/pet"),
        apiFetch(
          `/api/health-logs?startDate=${getYesterday()}&endDate=${getYesterday()}`
        ),
      ]);

      if (petRes.status === 401 || logsRes.status === 401) {
        handleUnauthorized(router);
        return;
      }

      const petData = petRes.ok ? await petRes.json() : null;
      if (!petData?.pet || petData.pet.pet_species !== "cat") return;
      if (!isStage5OrHigher(petData.pet.stage)) return;

      setSpeciesEmoji(petData.pet.species_emoji ?? "🐱");

      const logs = logsRes.ok ? await logsRes.json() : [];
      const yesterdayLog = Array.isArray(logs) ? logs[0] : null;

      const msg = getSnsCatMessage({
        yesterdaySteps: yesterdayLog?.steps ?? null,
        yesterdaySleepQuality: yesterdayLog?.sleep_quality ?? null,
        yesterdayStressLevel: yesterdayLog?.stress_level ?? null,
      });
      setMessage(msg);
      setShow(true);
    };
    load();
  }, [visible, router]);

  if (!show || !message) return null;

  return (
    <div className="bg-white border-2 border-slate-200 p-4 rounded-xl shadow-sm">
      <div className="flex gap-3 items-start">
        {/* 猫：スマホをぺしぺし叩くアニメ＋漫符（Lv.5: 💡アドバイス or 💢叱咤） */}
        <div className="relative flex-shrink-0">
          <div className="absolute -top-2 -right-1">
            <MangaSymbol
              symbol={message.mangaEmoji}
              variant={message.mangaEmoji === "💢" ? "shake" : "pulse"}
            />
          </div>
          <div className="sns-cat-poshposh">
            {!useEmoji ? (
              <img
                src={LV5_SUNGLASSES_IMAGE_PATH}
                alt="気ままな青年"
                className="w-16 h-16 object-contain"
                onError={() => setUseEmoji(true)}
              />
            ) : (
              <span className="text-5xl" aria-hidden>
                {speciesEmoji}
              </span>
            )}
          </div>
        </div>

        {/* SNS風吹き出し */}
        <div className="flex-1 min-w-0">
          <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm">
            <div className="absolute -left-2 top-4 w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-slate-200" />
            <div className="absolute -left-1.5 top-4 w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-slate-50" />
            <p className="text-sm text-slate-800 leading-relaxed">
              {message.text}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">ぽっち • 今</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}
