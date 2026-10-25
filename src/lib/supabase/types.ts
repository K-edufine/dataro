export interface ClassRow {
  id: string;
  school: string;
  grade: number;
  class_no: number;
  student_count: number;
  /** 3~4학년 low, 5~6학년 high (DB 에서 자동 계산) */
  grade_band: "low" | "high";
  teacher_id: string;
  open_lessons: number[];
  created_at: string;
}

export interface StudentRow {
  id: string;
  class_id: string;
  number: number;
  anon_code: string;
  created_at: string;
}

export interface SnackRow {
  id: string;
  name: string;
  price: number;
  taste: number;
  sort_order: number;
}

export interface SurveyRow {
  student_id: string;
  class_id: string;
  answers: number[];
  consume_score: number;
  save_score: number;
}
