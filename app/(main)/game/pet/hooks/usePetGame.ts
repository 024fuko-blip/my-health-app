"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ensureSession, handleUnauthorized, apiFetch, apiPost, apiPut } from "@/lib/api-client";

export interface PetState {
  pet_name: string;
  pet_species: string;
  species_emoji: string;
  stage?: "baby" | "junior" | "adult";
  happiness: number;
  last_fed_at: string | null;
  current_outfit_id: string | null;
  current_outfit_emoji: string | null;
  level?: number;
  exp_points?: number;
  exp_to_next?: { current: number; needed: number };
  adopted_at: string | null;
  feed_count?: number;
  mood_face?: string;
  mood_label?: string;
  mood_comment?: string;
  sleepy?: boolean;
  wearing_mask?: boolean;
  worried?: boolean;
  low_mood?: boolean;
  weather?: { temp: number; desc: string } | null;
}

export interface FoodItem {
  id: string;
  name: string;
  cost: number;
  emoji: string;
  happiness_gain: number;
  owned: number;
}

export interface OutfitItem {
  id: string;
  name: string;
  cost: number;
  emoji: string | null;
  owned: boolean;
  equipped: boolean;
}

export interface RoomItem {
  id: string;
  name: string;
  cost: number;
  emoji: string;
  owned: boolean | number;
  equipped?: boolean;
}

export interface PetData {
  pet: PetState | null;
  points: number;
  inventory: Record<string, number>;
  foods: FoodItem[];
  outfits: OutfitItem[];
  rooms?: RoomItem[];
  furniture?: Array<{ id: string; name: string; cost: number; emoji: string; owned: number }>;
  current_room_id?: string | null;
  placed_furniture?: Array<{ itemId: string; position: string }>;
}

const DEFAULT_PET_DATA: PetData = {
  pet: null,
  points: 0,
  inventory: {},
  foods: [],
  outfits: [],
  rooms: [],
  furniture: [],
  current_room_id: null,
  placed_furniture: [],
};

export function usePetGame() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PetData | null>(null);
  const [tab, setTab] = useState<"feed" | "outfit" | "room" | "play">("feed");
  const [minigame, setMinigame] = useState<"sudoku" | "memory" | "pet" | "quiz" | null>(null);
  const [petName, setPetName] = useState("");
  const [petSpecies, setPetSpecies] = useState("cat");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchPet = useCallback(async () => {
    try {
      const session = await ensureSession(router);
      if (!session) {
        setLoading(false);
        return;
      }
      const res = await apiFetch("/api/pet");
      if (res.status === 401) {
        handleUnauthorized(router);
        setLoading(false);
        return;
      }
      if (res.ok) {
        const j = await res.json();
        setData(j);
        if (j.pet) {
          setPetName(j.pet.pet_name);
          setPetSpecies(j.pet.pet_species);
        }
      } else {
        setData(DEFAULT_PET_DATA);
      }
    } catch {
      setData(DEFAULT_PET_DATA);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchPet();
  }, [fetchPet]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "play") setTab("play");
  }, []);

  const handleCreatePet = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const result = await apiPost<Record<string, unknown>>("/api/pet", {
        pet_name: petName.trim() || "ぽっち",
        pet_species: petSpecies,
      });
      if (result.ok) {
        await fetchPet();
      } else {
        setMessage(result.error ?? "作成に失敗しました");
      }
    } catch (err) {
      setMessage("通信エラーです。ブラウザを更新して再度お試しください。");
      console.error("createPet error:", err);
    } finally {
      setSaving(false);
    }
  }, [petName, petSpecies, fetchPet]);

  const handleFeed = useCallback(async (itemId: string) => {
    setMessage(null);
    const result = await apiPost<{ used?: string; happiness?: number; error?: string }>("/api/pet/feed", { itemId });
    const j = result.ok ? result.data : { error: result.error };
    if (result.ok) {
      setMessage(`${j.used}をあげた！ 幸福度 ${j.happiness}`);
      await fetchPet();
    } else setMessage(j.error ?? "失敗しました");
  }, [fetchPet]);

  const handleBuy = useCallback(async (itemId: string, cost: number, quantity?: number) => {
    if ((data?.points ?? 0) < cost) {
      setMessage("ポイントが足りません");
      return;
    }
    setMessage(null);
    const result = await apiPost<{ error?: string }>("/api/pet/buy", { itemId, quantity: quantity ?? 1 });
    const j = result.ok ? {} : { error: result.error };
    if (result.ok) {
      setMessage("購入した！");
      await fetchPet();
    } else setMessage(j.error ?? "購入に失敗しました");
  }, [data?.points, fetchPet]);

  const submitMinigame = useCallback(async (
    gameType: "catch" | "pet" | "quiz" | "sudoku" | "memory",
    payload: {
      score?: number;
      count?: number;
      correct?: boolean;
      completed?: boolean;
      pairsMatched?: number;
    }
  ) => {
    setMessage(null);
    const result = await apiPost<{ points_earned?: number; happiness_gain?: number; error?: string }>("/api/pet/minigame", {
      game_type: gameType,
      ...payload,
    });
    const j = result.ok ? result.data : { error: result.error };
    if (result.ok) {
      setMessage(`+${j.points_earned}pt！幸福度+${j.happiness_gain}`);
      await fetchPet();
    } else {
      setMessage(j.error ?? "失敗しました");
    }
    setMinigame(null);
  }, [fetchPet]);

  const handleRoomUpdate = useCallback(async (
    roomId?: string | null,
    placed?: Array<{ itemId: string; position: string }>
  ) => {
    setMessage(null);
    const result = await apiPut<{ error?: string }>("/api/pet/room", {
      current_room_id: roomId ?? data?.current_room_id ?? null,
      placed_furniture: placed ?? data?.placed_furniture ?? [],
    });
    if (result.ok) {
      setMessage("部屋を更新した！");
      await fetchPet();
    } else {
      setMessage(result.error ?? "失敗しました");
    }
  }, [data?.current_room_id, data?.placed_furniture, fetchPet]);

  const handleEquip = useCallback(async (outfitId: string | null) => {
    setMessage(null);
    const result = await apiPost<{ error?: string }>("/api/pet/outfit", {
      outfitId: outfitId === "outfit_none" ? null : outfitId,
    });
    if (result.ok) {
      setMessage(outfitId ? "着せ替えた！" : "衣装を外した");
      await fetchPet();
    } else {
      setMessage(result.error ?? "失敗しました");
    }
  }, [fetchPet]);

  const handleUpdatePet = useCallback(async () => {
    setSaving(true);
    const result = await apiPost<Record<string, unknown>>("/api/pet", {
      pet_name: petName.trim() || "ぽっち",
      pet_species: petSpecies,
    });
    if (result.ok) await fetchPet();
    setSaving(false);
  }, [petName, petSpecies, fetchPet]);

  const dataToUse = data ?? DEFAULT_PET_DATA;

  return {
    loading,
    data: dataToUse,
    tab, setTab,
    minigame, setMinigame,
    petName, setPetName,
    petSpecies, setPetSpecies,
    saving,
    message,
    handleCreatePet,
    handleFeed,
    handleBuy,
    submitMinigame,
    handleRoomUpdate,
    handleEquip,
    handleUpdatePet,
  };
}
