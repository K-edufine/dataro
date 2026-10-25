import common from "@/data/common-snacks.json";
import lesson4 from "@/data/lesson4-snacks.json";

/** 3차시 공통 체험용 간식 20개 */
export const commonSnacks = common.snacks;

/** 4차시에서 학생이 선호도를 입력하는 간식 10개 (이름·가격은 고정) */
export interface PresetSnack {
  id: string;
  name: string;
  price: number;
}
export const lesson4Snacks: PresetSnack[] = lesson4.snacks;

export const PREFERENCE_LABELS = ["", "별로예요", "조금 아쉬워요", "보통이에요", "좋아요", "정말 좋아요"];
