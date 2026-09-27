import { useState, useRef } from 'react';
import axios from 'axios';
import { TopicInput } from '../lib/validation';
import { Flashcard, MultipleChoiceQuestion } from '../types';

interface AssignmentCard {
  id: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface GenerateResponse {
  success: boolean;
  data: {
    title: string;
    cards: AssignmentCard[];
  };
  error?: string;
  requestId?: string;
  timestamp?: string;
}

interface StudyFlowState {
  flashcards: Flashcard[];
  quizQuestions: MultipleChoiceQuestion[];
  isLoading: boolean;
  error: string | null;
  requestId: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sampleWithoutReplacement<T>(array: T[], count: number) {
  const copy = array.slice();
  const result: T[] = [];
  while (result.length < count && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function sampleWithReplacement<T>(array: T[], count: number) {
  if (array.length === 0) return [];
  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * array.length);
    result.push(array[idx]);
  }
  return result;
}

function deriveFlashcards(cards: AssignmentCard[]): Flashcard[] {
  return cards.map((card) => ({
    id: card.id,
    front: card.question,
    back: card.answer,
    tags: [card.difficulty],
  }));
}

function deriveQuizQuestions(cards: AssignmentCard[]): MultipleChoiceQuestion[] {
  return cards.map((card) => {
    const correctAnswer = card.answer;

    const decoyAnswers = cards
      .filter((c) => c.id !== card.id)
      .map((c) => c.answer);

    const distinctDecoys = decoyAnswers.filter((a) => a !== correctAnswer);

    let decoys: string[];
    if (distinctDecoys.length >= 3) {
      decoys = sampleWithoutReplacement(distinctDecoys, 3);
    } else if (decoyAnswers.length >= 1) {
      const pool = distinctDecoys.length > 0 ? distinctDecoys : decoyAnswers;
      decoys = sampleWithReplacement(pool, 3);

      while (decoys.length < 3) decoys.push(correctAnswer);
    } else {
      decoys = [correctAnswer, correctAnswer, correctAnswer];
    }

    const optionObjs = [
      { text: correctAnswer, isCorrect: true },
      ...decoys.slice(0, 3).map((t) => ({ text: t, isCorrect: false })),
    ];

    shuffleInPlace(optionObjs);

    const correctAnswerIndex = optionObjs.findIndex((o) => o.isCorrect);

    return {
      id: `quiz-${card.id}`,
      question: card.question,
      options: optionObjs.map((o) => o.text),
      correctAnswerIndex,
      explanation: '',
    };
  });
}

function buildInputString(input: TopicInput) {
  const notes = (input.notes ?? '').trim();
  if (notes.length > 0) {
    return `${input.topic}\n\nNotes: ${notes}`;
  }
  return input.topic;
}

export const useStudyFlow = () => {
  const [state, setState] = useState<StudyFlowState>({
    flashcards: [],
    quizQuestions: [],
    isLoading: false,
    error: null,
    requestId: null,
  });

  // Use ref to track request ID and prevent stale responses
  const currentRequestIdRef = useRef<string | null>(null);

  const generateContent = async (input: TopicInput) => {
    const requestId = crypto.randomUUID();
    currentRequestIdRef.current = requestId;

    setState({
      flashcards: [],
      quizQuestions: [],
      isLoading: true,
      error: null,
      requestId,
    });

    try {
      const response = await axios.post<GenerateResponse>(
        `${API_BASE_URL}/api/generate`,
        {
          input: buildInputString(input),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      // Check if this response is still current
      if (currentRequestIdRef.current !== requestId) {
        // eslint-disable-next-line no-console
        console.log('Ignoring stale response');
        return;
      }

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to generate content');
      }

      const cards = response.data.data.cards;
      const nextFlashcards = deriveFlashcards(cards);
      const nextQuizQuestions = deriveQuizQuestions(cards);

      setState({
        flashcards: nextFlashcards,
        quizQuestions: nextQuizQuestions,
        isLoading: false,
        error: null,
        requestId,
      });

    } catch (error) {
      if (currentRequestIdRef.current !== requestId) {
        return; // Ignore stale errors
      }

      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message || 'Failed to generate content'
        : error instanceof Error ? error.message : 'Failed to generate content';

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        requestId,
      }));
    }
  };

  const clearContent = () => {
    currentRequestIdRef.current = null;
    setState({
      flashcards: [],
      quizQuestions: [],
      isLoading: false,
      error: null,
      requestId: null,
    });
  };

  return {
    ...state,
    generateContent,
    clearContent,
    currentRequestId: currentRequestIdRef.current,
  };
};
