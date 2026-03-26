"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ensureSession, handleUnauthorized, apiFetch, apiPut } from "@/lib/api-client";
import { getNearestPrefecture } from "@/lib/prefectures";

export interface ProfileFormState {
  profile_name: string;
  birth_date: string;
  gender: string;
  height: string;
  weight: string;
  normal_temperature: string;
  medical_history_text: string;
  prefecture: string;
  latitude: number | null;
  longitude: number | null;
}

const INITIAL_PROFILE: ProfileFormState = {
  profile_name: "",
  birth_date: "",
  gender: "unspecified",
  height: "",
  weight: "",
  normal_temperature: "",
  medical_history_text: "",
  prefecture: "",
  latitude: null,
  longitude: null,
};

function parseMedicalHistoryText(raw: string | undefined | null): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return parsed.text || "";
  } catch {
    return typeof raw === "string" ? raw : "";
  }
}

function buildMedicalHistoryJson(
  existingRaw: string | undefined | null,
  text: string
): string {
  try {
    const existing = JSON.parse(existingRaw || "{}");
    return JSON.stringify({ ...existing, text });
  } catch {
    return JSON.stringify({ text });
  }
}

export function useProfileSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileFormState>(INITIAL_PROFILE);
  const [fullSettings, setFullSettings] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      const session = await ensureSession(router);
      if (!session) return;
      const res = await apiFetch("/api/user-settings");
      if (res.status === 401) {
        handleUnauthorized(router);
        setLoading(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setFullSettings(data);
        setProfile({
          profile_name: data.profile_name ?? "",
          birth_date: data.birth_date ?? "",
          gender: data.gender ?? "unspecified",
          height: data.height != null ? String(data.height) : "",
          weight: data.weight != null ? String(data.weight) : "",
          normal_temperature:
            data.normal_temperature != null
              ? String(data.normal_temperature)
              : "",
          medical_history_text: parseMedicalHistoryText(data.medical_history),
          prefecture: data.prefecture ?? "",
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
        });
      }
      setLoading(false);
    };
    fetchSettings();
  }, [router]);

  const updateField = useCallback(
    <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
      setProfile((p) => ({ ...p, [key]: value }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    const payload = {
      ...fullSettings,
      profile_name: profile.profile_name || null,
      birth_date: profile.birth_date || null,
      gender: profile.gender,
      height: profile.height || null,
      weight: profile.weight || null,
      normal_temperature: profile.normal_temperature || null,
      medical_history: buildMedicalHistoryJson(
        fullSettings.medical_history as string,
        profile.medical_history_text
      ),
      prefecture: profile.prefecture || null,
      latitude: profile.latitude,
      longitude: profile.longitude,
    };
    const result = await apiPut<Record<string, unknown>>(
      "/api/user-settings",
      payload
    );
    setSaving(false);
    if (result.ok) {
      setFullSettings(payload);
      alert("保存しました");
    } else if (result.status === 401) {
      handleUnauthorized(router);
    } else {
      alert(
        "保存に失敗しました" + (result.error ? ` (${result.error})` : "")
      );
    }
  }, [fullSettings, profile, router]);

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert(
        "お使いのブラウザでは位置情報を取得できません。都道府県を手動で選択してください。"
      );
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const pref = getNearestPrefecture(lat, lon);
        setProfile((p) => ({
          ...p,
          prefecture: pref ?? "",
          latitude: lat,
          longitude: lon,
        }));
        setLocationLoading(false);
        if (pref) alert(`現在地を取得しました: ${pref}`);
      },
      (err) => {
        setLocationLoading(false);
        alert(
          err.code === 1
            ? "位置情報が拒否されました。都道府県を手動で選択してください。"
            : "位置情報の取得に失敗しました。都道府県を手動で選択してください。"
        );
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  const clearLocation = useCallback(() => {
    setProfile((p) => ({
      ...p,
      prefecture: "",
      latitude: null,
      longitude: null,
    }));
  }, []);

  const selectPrefecture = useCallback((pref: string) => {
    setProfile((p) => ({
      ...p,
      prefecture: pref,
      latitude: null,
      longitude: null,
    }));
  }, []);

  return {
    loading,
    saving,
    locationLoading,
    profile,
    updateField,
    handleSave,
    handleGetLocation,
    clearLocation,
    selectPrefecture,
  };
}
