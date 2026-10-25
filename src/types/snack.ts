export interface Snack {
  id: string;
  name: string;
  /** 가격(원) */
  price: number;
  /** 선호도 (1~5). DB 컬럼 이름은 taste 로 그대로 둔다 */
  taste: number;
}
