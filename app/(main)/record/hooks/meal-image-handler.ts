/** 食事画像の処理（Base64変換・API送信・栄養分析） */

import type React from 'react';
import { apiPost } from '@/lib/api-client';
import type { NutritionData } from './record-form-types';

export interface MealImageHandlerParams {
  setMealImageBase64: (v: string | null) => void;
  setIsAnalyzing: (v: boolean) => void;
  setNutritionData: React.Dispatch<React.SetStateAction<NutritionData | null>>;
  setCalories: (v: string) => void;
  setProtein: (v: string) => void;
}

export async function processMealImageFile(
  file: File,
  params: MealImageHandlerParams
): Promise<void> {
  if (!file) return;

  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
    alert(
      'HEICファイルはブラウザで表示できません。\niPhoneの設定で「互換性優先」にするか、JPG/PNGに変換してください。\n\n設定 > カメラ > フォーマット > 互換性優先'
    );
    return;
  }

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const isImageByType = file.type.startsWith('image/');
  const isImageByExt = imageExtensions.some((ext) => fileName.endsWith(ext));
  if (!isImageByType && !isImageByExt) {
    alert('対応形式: JPG, PNG, GIF, WebP');
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    const result = reader.result;
    if (typeof result !== 'string' || !result.startsWith('data:image/')) {
      if (typeof result === 'string') {
        alert('画像ファイルとして読み込めませんでした。\nJPGまたはPNG形式で保存し直してください。');
      }
      return;
    }

    const { setMealImageBase64, setIsAnalyzing, setNutritionData, setCalories, setProtein } = params;
    setMealImageBase64(result);
    setIsAnalyzing(true);
    setNutritionData(null);

    try {
      const apiResult = await apiPost<Record<string, unknown>>('/api/analyze-meal', {
        image_base64: result,
      });
      if (apiResult.ok) {
        const data = apiResult.data;
        if (data.error) {
          setNutritionData({ foods: ['料理名を入力してください'] });
        } else {
          setNutritionData(data as NutritionData);
          if (data.calories) setCalories(String(data.calories));
          if (data.protein) setProtein(String(data.protein));
        }
      } else {
        setNutritionData({ foods: ['料理名を入力してください'] });
      }
    } catch {
      setNutritionData({ foods: ['料理名を入力してください'] });
    } finally {
      setIsAnalyzing(false);
    }
  };

  reader.onerror = () => {
    alert('画像の読み込みに失敗しました。別の画像を選んでください。');
  };
  reader.readAsDataURL(file);
}
