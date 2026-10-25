export const won = (v: number): string => `${Math.round(v).toLocaleString("ko-KR")}원`;

/** 선호도(1~5점) 표시 */
export const preferenceText = (v: number): string => `${v.toFixed(1)}점`;

/** 거리를 0~10 눈금으로 보여 준다 */
export const scaleText = (v: number): string => v.toFixed(1);
