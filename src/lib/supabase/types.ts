export interface ClassRow {
  id: string;
  code: string;
  name: string;
  teacher_id: string;
  open_lessons: number[];
  created_at: string;
}

export interface StudentRow {
  id: string;
  class_id: string;
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
