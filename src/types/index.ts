// StudyFlow TypeScript definitions
export interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint?: string;
  tags: string[];
}

export interface MultipleChoiceQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface QuizSession {
  id: string;
  questions: MultipleChoiceQuestion[];
  userAnswers: { [questionId: string]: number };
  startTime: Date;
  endTime?: Date;
  score?: number;
}

export interface APIRequest {
  topic: string;
  notes?: string;
  requestId: string;
  timestamp: Date;
}

export interface APIResponse {
  success: boolean;
  data?: {
    title: string;
    cards: Array<{
      id: string;
      question: string;
      answer: string;
      difficulty: 'easy' | 'medium' | 'hard';
    }>;
  };
  error?: string;
  requestId: string;
  timestamp: Date;
}