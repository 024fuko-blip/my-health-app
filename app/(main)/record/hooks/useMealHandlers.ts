import { useState, useCallback } from 'react';
import { processMealImageFile } from './meal-image-handler';
import type { NutritionData } from './record-form-types';

interface UseMealHandlersDeps {
  mealDescription: string;
  setMealImageBase64: (v: string | null) => void;
  setCalories: (v: string) => void;
  setProtein: (v: string) => void;
}

export function useMealHandlers({
  mealDescription,
  setMealImageBase64,
  setCalories,
  setProtein,
}: UseMealHandlersDeps) {
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleMealImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processMealImageFile(file, {
          setMealImageBase64,
          setIsAnalyzing,
          setNutritionData,
          setCalories,
          setProtein,
        });
      }
      e.target.value = '';
    },
    [setMealImageBase64, setCalories, setProtein]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processMealImageFile(files[0], {
          setMealImageBase64,
          setIsAnalyzing,
          setNutritionData,
          setCalories,
          setProtein,
        });
      }
    },
    [setMealImageBase64, setCalories, setProtein]
  );

  const clearMealImage = useCallback(() => {
    setMealImageBase64(null);
    setNutritionData(null);
  }, [setMealImageBase64]);

  const handleEstimateFromText = useCallback(async () => {
    const text = mealDescription.trim();
    if (!text) {
      alert('食事メモに内容を書いてから押してください');
      return;
    }
    setIsAnalyzing(true);
    setNutritionData(null);
    try {
      const res = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_description: text }),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          setNutritionData({ foods: [text] });
        } else {
          setNutritionData(data);
          if (data.calories != null) setCalories(String(data.calories));
          if (data.protein != null) setProtein(String(data.protein));
        }
      } else {
        setNutritionData({ foods: [text] });
      }
    } catch {
      setNutritionData({ foods: [text] });
    } finally {
      setIsAnalyzing(false);
    }
  }, [mealDescription, setCalories, setProtein]);

  return {
    nutritionData,
    setNutritionData,
    isAnalyzing,
    isDragging,
    handleMealImageChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clearMealImage,
    handleEstimateFromText,
  };
}
