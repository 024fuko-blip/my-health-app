import { z } from "zod";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseJsonBody, withSession } from "@/lib/api-utils";
import { MAX_HAPPINESS } from "@/lib/pet-shop";

const TODAY = () => new Date().toISOString().split("T")[0];

const MinigamePayloadSchema = z.object({
  game_type: z.enum(["catch", "pet", "quiz", "sudoku", "memory"]),
  score: z.number().optional().default(0),
  count: z.number().optional().default(0),
  correct: z.boolean().optional().default(false),
  completed: z.boolean().optional().default(false),
  pairsMatched: z.number().optional().default(0),
});

/** POST: ミニゲーム結果を送信（ポイント・幸福度加算、日次制限チェック） */
export async function POST(req: Request) {
  return withSession(async (session) => {
    try {
      const parsed = await parseJsonBody(req, MinigamePayloadSchema);
      if (!parsed.ok) return parsed.error;
      const {
        game_type,
        score = 0,
        count = 0,
        correct = false,
        completed = false,
        pairsMatched = 0,
      } = parsed.data;

      const pet = await prisma.userPet.findUnique({
        where: { userId: session.userId },
      });
      if (!pet) {
        return NextResponse.json(
          { error: "ペットがいません" },
          { status: 400 }
        );
      }

      const lastJson = ((pet as { lastMinigameAt?: Record<string, string> })
        .lastMinigameAt ?? {}) as Record<string, string>;
      const last = lastJson;
      const today = TODAY();

      if (game_type === "catch") {
        const catchToday = (last["catch"] ?? "").split(":")[0];
        const catchCount = parseInt((last["catch"] ?? "").split(":")[1] || "0", 10);
        if (catchToday === today && catchCount >= 3) {
          return NextResponse.json(
            { error: "本日のキャッチゲームは3回までです" },
            { status: 400 }
          );
        }
      } else if (game_type === "pet") {
        if (last["pet"] === today) {
          return NextResponse.json(
            { error: "本日のなでなでは1回までです" },
            { status: 400 }
          );
        }
      } else if (game_type === "quiz") {
        if (last["quiz"] === today) {
          return NextResponse.json(
            { error: "本日のクイズは1回までです" },
            { status: 400 }
          );
        }
      } else if (game_type === "sudoku") {
        if (last["sudoku"] === today) {
          return NextResponse.json(
            { error: "本日の数独は1回までです" },
            { status: 400 }
          );
        }
      } else if (game_type === "memory") {
        if (last["memory"] === today) {
          return NextResponse.json(
            { error: "本日の神経衰弱は1回までです" },
            { status: 400 }
          );
        }
      }

      let pointsEarned = 0;
      let happinessGain = 0;

      if (game_type === "catch") {
        const s = Math.max(0, Math.min(30, Math.floor(score)));
        pointsEarned = s * 5;
        happinessGain = Math.min(20, s * 2);
      } else if (game_type === "pet") {
        const c = Math.max(0, Math.min(100, Math.floor(count)));
        pointsEarned = 10 + Math.min(40, c * 2);
        happinessGain = Math.min(15, Math.floor(c / 5));
      } else if (game_type === "quiz") {
        pointsEarned = correct ? 50 : 10;
        happinessGain = correct ? 10 : 2;
      } else if (game_type === "sudoku") {
        pointsEarned = completed ? 40 : 5;
        happinessGain = completed ? 12 : 2;
      } else if (game_type === "memory") {
        const p = Math.min(8, Math.max(0, Math.floor(pairsMatched)));
        pointsEarned = p >= 8 ? 50 : 10 + p * 5;
        happinessGain = p >= 8 ? 12 : Math.min(8, 2 + p);
      }

      const newHappiness = Math.min(
        MAX_HAPPINESS,
        pet.happiness + happinessGain
      );

      let newLastCatch = last["catch"] ?? "";
      if (game_type === "catch") {
        const [lastDate, lastCount] = (last["catch"] ?? ":0").split(":");
        const prevCount = lastDate === today ? parseInt(lastCount || "0", 10) : 0;
        newLastCatch = `${today}:${Math.min(3, prevCount + 1)}`;
      }
      const newLastPet = game_type === "pet" ? today : last["pet"] ?? "";
      const newLastQuiz = game_type === "quiz" ? today : last["quiz"] ?? "";
      const newLastSudoku = game_type === "sudoku" ? today : last["sudoku"] ?? "";
      const newLastMemory = game_type === "memory" ? today : last["memory"] ?? "";

      const gameStats = await prisma.userGameStats.findUnique({
        where: { userId: session.userId },
      });
      const currentPoints = gameStats?.totalPoints ?? 0;

      await prisma.$transaction([
        prisma.userPet.update({
          where: { userId: session.userId },
          data: {
            happiness: newHappiness,
            lastMinigameAt: {
              catch: newLastCatch,
              pet: newLastPet,
              quiz: newLastQuiz,
              sudoku: newLastSudoku,
              memory: newLastMemory,
            },
          },
        }),
        prisma.userGameStats.upsert({
          where: { userId: session.userId },
          create: {
            userId: session.userId,
            totalPoints: currentPoints + pointsEarned,
          },
          update: {
            totalPoints: currentPoints + pointsEarned,
          },
        }),
      ]);

      return NextResponse.json({
        ok: true,
        points_earned: pointsEarned,
        happiness_gain: happinessGain,
        new_happiness: newHappiness,
        new_points: currentPoints + pointsEarned,
      });
    } catch (error) {
      console.error("pet minigame POST error:", error);
      return NextResponse.json(
        { error: "処理に失敗しました" },
        { status: 500 }
      );
    }
  });
}
