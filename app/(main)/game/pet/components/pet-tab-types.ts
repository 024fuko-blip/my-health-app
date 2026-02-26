/** ペット画面のタブコンポーネント用共有型 */

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
}

export interface FurnitureItem {
  id: string;
  name: string;
  cost: number;
  emoji: string;
  owned: number;
}

export interface PetTabData {
  points: number;
  foods: FoodItem[];
  outfits: OutfitItem[];
  rooms?: RoomItem[];
  furniture?: FurnitureItem[];
  current_room_id?: string | null;
  pet?: { current_outfit_id?: string | null } | null;
}
