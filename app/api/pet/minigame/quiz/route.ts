import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withSession } from "@/lib/api-utils";
import { getServerEnv } from "@/lib/env";
import OpenAI from "openai";

const FALLBACK_QUIZZES = [
  {
    question: "健康的な生活のために大切なのは？",
    choices: ["バランスの良い食事", "夜更かし", "運動しない"],
    correctIndex: 0,
  },
  {
    question: "体調管理で記録すると良いものは？",
    choices: ["睡眠時間", "テレビの音量", "服の色"],
    correctIndex: 0,
  },
  {
    question: "ストレス解消に効果があるといわれるのは？",
    choices: ["適度な運動", "暴飲暴食", "昼夜逆転"],
    correctIndex: 0,
  },
];

/** GET: 健康クイズを1問取得（AIでユーザーデータに基づき生成、未設定時はフォールバック） */
export async function GET() {
  return withSession(async (session) => {
    try {
      const env = getServerEnv();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startStr = sevenDaysAgo.toISOString().split("T")[0];
      const endStr = new Date().toISOString().split("T")[0];

      const logs = await prisma.healthLog.findMany({
        where: {
          userId: session.userId,
          date: { gte: startStr, lte: endStr },
        },
        orderBy: { date: "asc" },
      });

      if (env.OPENAI_API_KEY && logs.length >= 2) {
        try {
          const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
          const logsText = logs
            .map(
              (l) =>
                `${l.date}: 体調${l.generalMood ?? "-"} 腹痛${l.painLevel ?? "-"} 便${l.stoolType ?? "-"} 睡眠${l.sleepQuality ?? "-"} ストレス${l.stressLevel ?? "-"}`
            )
            .join("\n");

          const res = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `あなたは健康記録アプリのクイズ出題者です。
ユーザーの過去7日間の健康記録データを分析し、データに基づいた3択クイズを1問だけ作成してください。
JSONのみ返してください。形式: {"question":"質問文","choices":["A","B","C"],"correctIndex":0}
correctIndex は正解の選択肢のインデックス（0,1,2のいずれか）です。
データに明確な根拠がない場合は一般的な健康クイズにしてください。`,
              },
              {
                role: "user",
                content: `記録データ:\n${logsText}`,
              },
            ],
            temperature: 0.7,
          });

          const text =
            res.choices[0]?.message?.content?.trim() ?? "";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as {
              question?: string;
              choices?: string[];
              correctIndex?: number;
            };
            if (
              parsed.question &&
              Array.isArray(parsed.choices) &&
              parsed.choices.length === 3 &&
              typeof parsed.correctIndex === "number" &&
              parsed.correctIndex >= 0 &&
              parsed.correctIndex <= 2
            ) {
              return NextResponse.json({
                question: parsed.question,
                choices: parsed.choices,
                correctIndex: parsed.correctIndex,
              });
            }
          }
        } catch (aiErr) {
          console.error("Quiz AI generation error:", aiErr);
        }
      }

      const fallback =
        FALLBACK_QUIZZES[
          Math.floor(Math.random() * FALLBACK_QUIZZES.length)
        ];
      return NextResponse.json(fallback);
    } catch (error) {
      console.error("pet minigame quiz GET error:", error);
      return NextResponse.json(
        FALLBACK_QUIZZES[0],
        { status: 200 }
      );
    }
  });
}
