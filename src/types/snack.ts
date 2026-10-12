export interface Snack {
  id: string;
  name: string;
  /** 가격(원) */
  price: number;
  /** 맛 점수 (1~5) */
  taste: number;
}
