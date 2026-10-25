/** 마지막 글자에 받침이 있는지 (한글이 아니면 받침 없음으로 본다) */
export function hasBatchim(word: string): boolean {
  const ch = word.trim().slice(-1);
  if (!ch) return false;
  const code = ch.charCodeAt(0) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

/** 단어 뒤에 맞는 조사를 붙인다. 예: eulReul("도시") → "도시를", eulReul("간식") → "간식을" */
export const eulReul = (w: string): string => `${w}${hasBatchim(w) ? "을" : "를"}`;
export const iGa = (w: string): string => `${w}${hasBatchim(w) ? "이" : "가"}`;
export const eunNeun = (w: string): string => `${w}${hasBatchim(w) ? "은" : "는"}`;
