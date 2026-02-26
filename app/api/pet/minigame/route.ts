import { z } from "zod";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseJsonBody, withSession, errorResponse } from "@/lib/api-utils";
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

type MinigamePayload = z.infer<typeof MinigamePayloadSchema>;

const GAME_CONFIG: Record<
  string,
  {
    dailyLimit: number;
    limitError: string;
    calcPoints: (p: MinigamePayload) => { points: number; happiness: number };
    lastKey: string;
    usesCount: boolean;
  }
> = {
  catch: {
    dailyLimit: 3,
    limitError: "本日のキャッチゲームは3回までです",
    calcPoints: ({ score = 0 }) => {
      const s = Math.max(0, Math.min(30, Math.floor(score)));
      return { points: s * 5, happiness: Math.min(20, s * 2) };
    },
    lastKey: "catch",
    usesCount: true,
  },
  pet: {
    dailyLimit: 1,
    limitError: "本日のなでなでは1回までです",
    calcPoints: ({ count = 0 }) => {
      const c = Math.max(0, Math.min(100, Math.floor(count)));
      return { points: 10 + Math.min(40, c * 2), happiness: Math.min(15, Math.floor(c / 5)) };
    },
    lastKey: "pet",
    usesCount: false,
  },
  quiz: {
    dailyLimit: 1,
    limitError: "本日のクイズは1回までです",
    calcPoints: ({ correct }) => ({ points: correct ? 50 : 10, happiness: correct ? 10 : 2 }),
    lastKey: "quiz",
    usesCount: false,
  },
  sudoku: {
    dailyLimit: 1,
    limitError: "本日の数独は1回までです",
    calcPoints: ({ completed }) => ({
      points: completed ? 40 : 5,
      happiness: completed ? 12 : 2,
    }),
    lastKey: "sudoku",
    usesCount: false,
  },
  memory: {
    dailyLimit: 1,
    limitError: "本日の神経衰弱は1回までです",
    calcPoints: ({ pairsMatched = 0 }) => {
      const p = Math.min(8, Math.max(0, Math.floor(pairsMatched)));
      return {
        points: p >= 8 ? 50 : 10 + p * 5,
        happiness: p >= 8 ? 12 : Math.min(8, 2 + p),
      };
    },
    lastKey: "memory",
    usesCount: false,
  },
};

function checkDailyLimit(
  gameType: string,
  last: Record<string, string>,
  today: string
): string | null {
  const config = GAME_CONFIG[gameType];
  if (!config) return "不正なゲームタイプです";

  if (config.usesCount) {
    const [lastDate, lastCount] = (last[config.lastKey] ?? ":0").split(":");
    const count = lastDate === today ? parseInt(lastCount || "0", 10) : 0;
    if (count >= config.dailyLimit) return config.limitError;
    return null;
  }

  if (last[config.lastKey] === today) return config.limitError;
  return null;
}

function buildNewLastValues(
  gameType: string,
  last: Record<string, string>,
  today: string
): Record<string, string> {
  const config = GAME_CONFIG[gameType];
  if (!config) return last;

  const result = { ...last };
  if (config.usesCount) {
    const [lastDate, lastCount] = (last[config.lastKey] ?? ":0").split(":");
    const prevCount = lastDate === today ? parseInt(lastCount || "0", 10) : 0;
    result[config.lastKey] = `${today}:${Math.min(config.dailyLimit, prevCount + 1)}`;
  } else {
    result[config.lastKey] = today;
  }
  return result;
}

/** POST: ミニゲーム結果を送信（ポイント・幸福度加算、日次制限チェック） */
export async function POST(req: Request) {
  return withSession(async (session) => {
    const parsed = await parseJsonBody(req, MinigamePayloadSchema);
    if (!parsed.ok) return parsed.error;
    const payload = parsed.data;
    const { game_type } = payload;

    const config = GAME_CONFIG[game_type];
    if (!config) {
      return errorResponse("不正なゲームタイプです", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const pet = await tx.userPet.findUnique({
        where: { userId: session.userId },
      });
      if (!pet) {
        return { error: "ペットがいません" } as const;
      }

      const last = ((pet as { lastMinigameAt?: Record<string, string> })
        .lastMinigameAt ?? {}) as Record<string, string>;
      const today = TODAY();

      const limitError = checkDailyLimit(game_type, last, today);
      if (limitError) {
        return { error: limitError } as const;
      }

      const { points: pointsEarned, happiness: happinessGain } = config.calcPoints(payload);
      const newHappiness = Math.min(MAX_HAPPINESS, pet.happiness + happinessGain);
      const newLastValues = buildNewLastValues(game_type, last, today);

      const gameStats = await tx.userGameStats.findUnique({
        where: { userId: session.userId },
      });
      const currentPoints = gameStats?.totalPoints ?? 0;

      await tx.userPet.update({
        where: { userId: session.userId },
        data: {
          happiness: newHappiness,
          lastMinigameAt: newLastValues,
        },
      });
      await tx.userGameStats.upsert({
        where: { userId: session.userId },
        create: {
          userId: session.userId,
          totalPoints: currentPoints + pointsEarned,
        },
        update: {
          totalPoints: currentPoints + pointsEarned,
        },
      });

      return {
        pointsEarned,
        happinessGain,
        newHappiness,
        newPoints: currentPoints + pointsEarned,
      } as const;
    });

    if ('error' in result) {
      return errorResponse(result.error!, 400);
    }

    return NextResponse.json({
      ok: true,
      points_earned: result.pointsEarned,
      happiness_gain: result.happinessGain,
      new_happiness: result.newHappiness,
      new_points: result.newPoints,
    });
  });
}
