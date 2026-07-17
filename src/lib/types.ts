export type Rarity = "common" | "rare" | "epic" | "legendary";

export type UserRow = {
  id: string;
  tg_id: number;
  username: string | null;
  first_name: string | null;
  photo_url: string | null;
  stars: number;
  is_banned: boolean;
  created_at: string;
};

export type GiftRow = {
  id: string;
  name: string;
  description: string | null;
  gif_url: string;
  rarity: Rarity;
  price_stars: number;
  supply_limit: number | null;
  minted: number;
  is_active: boolean;
  created_at: string;
};

export type GiftVariantRow = {
  id: string;
  gift_id: string;
  name: string;
  gif_url: string | null;
  rarity: Rarity | null;
};

export type GiftWithVariants = GiftRow & { gift_variants: GiftVariantRow[] };

export type InventoryRow = {
  id: string;
  user_id: string;
  gift_id: string;
  variant_id: string | null;
  tier: number;
  acquired_from: "shop" | "market" | "case" | "admin";
  is_listed: boolean;
  acquired_at: string;
};

export type InventoryItem = InventoryRow & {
  gifts: GiftRow;
  gift_variants: GiftVariantRow | null;
};

export type ListingRow = {
  id: string;
  item_id: string;
  seller_id: string;
  buyer_id: string | null;
  price_stars: number;
  status: "active" | "sold" | "cancelled" | "removed";
  created_at: string;
};

export type MarketListing = ListingRow & {
  inventory: InventoryItem;
  seller: Pick<UserRow, "id" | "username" | "first_name">;
};

export type CaseRow = {
  id: string;
  name: string;
  image_url: string | null;
  price_stars: number;
  is_active: boolean;
};

export type CaseItemRow = {
  id: string;
  case_id: string;
  gift_id: string;
  variant_id: string | null;
  weight: number;
  gifts: GiftRow;
};

export type CaseWithItems = CaseRow & { case_items: CaseItemRow[] };

export type TransactionRow = {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  meta: Record<string, unknown>;
  created_at: string;
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Обычный",
  rare: "Редкий",
  epic: "Эпик",
  legendary: "Легенда",
};

export const TX_LABEL: Record<string, string> = {
  onboarding: "Бонус за регистрацию",
  shop_purchase: "Покупка в каталоге",
  market_sale: "Продажа на маркете",
  market_purchase: "Покупка на маркете",
  case_open: "Открытие кейса",
  admin_grant: "Начисление администратором",
};
