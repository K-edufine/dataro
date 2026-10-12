import common from "@/data/common-snacks.json";
import type { Snack } from "@/types/snack";

export const commonSnacks: Snack[] = common.snacks;

export const MIN_SNACKS = 5;
export const DEFAULT_SNACK_COUNT = 10;
export const MAX_SNACKS = 30;
