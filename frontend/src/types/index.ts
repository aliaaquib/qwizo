// Shared TypeScript types mirroring the existing Worker API shapes.
// These match the JSON the current backend returns — the API does not change.

export type QuestionType = 'mcq' | 'tf' | 'short' | 'fill' | 'matching';
export type QuizStatus = 'draft' | 'published' | 'archived';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Teacher {
  id: string;
  name: string;
  email: string;
  role?: string;
  onboarding_done?: boolean;
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
  duration_sec: number | null;
  submitted_at: number;
  late: boolean;
}

export interface ResultsSummary {
  total: number;
  avg_percentage: number;
  per_question: { question_id: string; attempts: number; correct_pct: number; text: string }[];
}

export interface SnapshotQuestion {
  id: string;
  type: QuestionType;
  text: string;
  marks: number;
  explanation: string;
  options: { id: string; text: string; is_correct: boolean }[];
  accepted: { text: string }[];
  pairs: { id: string; left: string; right: string; right_id: string }[];
}

export interface GradedAnswer {
  question_id: string;
  answer: StudentAnswer | null;
  is_correct: boolean;
  marks_awarded: number;
}

export interface SubmissionDetail extends Submission {
  quiz_id: string;
  snapshot: { questions?: SnapshotQuestion[] };
  answers: GradedAnswer[];
}

export interface ApiError {
  error: string;
}

/* ---------------- public student flow ---------------- */

export interface PublicQuizOption {
  id: string;
  text: string;
}

export interface PublicQuestion {
  id: string;
  type: QuestionType;
  text: string;
  marks: number;
  options?: PublicQuizOption[];
  lefts?: PublicQuizOption[];
  rights?: PublicQuizOption[];
}

export interface PublicQuizSettings {
  shuffle_questions: boolean;
  shuffle_options: boolean;
  require_student_name: boolean;
  allow_multiple_attempts: boolean;
  show_results_immediately: boolean;
}

export interface PublicQuiz {
  code: string;
  title: string;
  description: string;
  subject: string;
  level: string;
  time_limit_sec: number | null;
  settings: PublicQuizSettings;
  questions: PublicQuestion[];
}

export type StudentAnswer =
  | { option_id: string }
  | { value: boolean }
  | { text: string }
  | { matches: Record<string, string> };

export interface ReviewItem {
  question_id: string;
  text: string;
  marks: number;
  marks_awarded: number;
  is_correct?: boolean;
  correct?: unknown;
  explanation?: string;
}

export interface StudentResultData {
  id?: string;
  student_name?: string;
  submitted_at?: number;
  duration_sec?: number | null;
  late?: boolean;
  score?: number;
  max_score?: number;
  percentage?: number;
  correct_count?: number;
  incorrect_count?: number;
  questions?: ReviewItem[];
}

export interface QuizTemplate {
  id: string;
  source_quiz_id: string;
  teacher_id: string;
  teacher_name: string;
  title: string;
  description: string;
  subject: string;
  level: string;
  topic: string;
  question_count: number;
  use_count: number;
  created_at: number;
  updated_at: number;
}
