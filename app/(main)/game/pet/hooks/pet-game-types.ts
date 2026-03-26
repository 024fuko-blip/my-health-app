/** ペット育成画面 共通型定義（唯一の正規ソース） */

export interface PetState {
  pet_name: string;
  pet_species: string;
  species_emoji: string;
  stage?: "baby" | "junior" | "adult" | "stage_1" | "stage_2" | "stage_3" | "stage_4" | "stage_5" | "stage_6" | "stage_7" | "stage_8";
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

export interface FurnitureItem {
  id: string;
  name: string;
  cost: number;
  emoji: string;
  owned: number;
}

export interface PetData {
  pet: PetState | null;
  points: number;
  inventory: Record<string, number>;
  foods: FoodItem[];
  outfits: OutfitItem[];
  rooms?: RoomItem[];
  furniture?: FurnitureItem[];
  current_room_id?: string | null;
  placed_furniture?: Array<{ itemId: string; position: string }>;
}

/** タブコンポーネント向けの部分ビュー型 */
export type PetTabData = Pick<
  PetData,
  "points" | "foods" | "outfits" | "rooms" | "furniture" | "current_room_id"
> & {
  pet?: { current_outfit_id?: string | null } | null;
};
