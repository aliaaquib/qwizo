// Shared TypeScript types mirroring the existing Worker API shapes.
// These match the JSON the current backend returns — the API does not change.

export type QuestionType = 'mcq' | 'tf' | 'short' | 'fill' | 'matching';
export type QuizStatus = 'draft' | 'published' | 'archived';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Teacher {
  id: string;
  name: string;
  email: string;
}

export interface QuizSettings {
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_score: boolean;
  show_results_immediately: boolean;
  show_correct_answers: boolean;
  show_explanations: boolean;
  allow_multiple_attempts: boolean;
  require_student_name: boolean;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  curriculum: string;
  level: string;
  topic: string;
  time_limit_sec: number | null;
  settings: QuizSettings;
  status: QuizStatus;
  share_code: string | null;
  created_at: number;
  updated_at: number;
}

export interface Option {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface MatchingPair {
  id: string;
  left_text: string;
  right_text: string;
}

export interface AcceptedAnswer {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  quiz_id: string | null;
  type: QuestionType;
  text: string;
  explanation: string;
  marks: number;
  difficulty: Difficulty;
  case_sensitive: boolean;
  options: Option[];
  pairs: MatchingPair[];
  accepted: AcceptedAnswer[];
}

export interface BankItem {
  id: string;
  type: QuestionType;
  text: string;
  explanation: string;
  marks: number;
  difficulty: Difficulty;
  subject: string;
  topic: string;
  curriculum: string;
  level: string;
  payload: {
    options?: Option[];
    pairs?: MatchingPair[];
    accepted?: string[];
    case_sensitive?: boolean;
  };
}

export interface Submission {
  id: string;
  student_name: string;
  score: number;
  max_score: number;
  percentage: number;
  correct_count: number;
  incorrect_count: number;
  submitted_at: number;
  late: boolean;
}

export interface ApiError {
  error: string;
}
