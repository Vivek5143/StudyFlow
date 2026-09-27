import { useRef, useState } from 'react';
import { TopicInputSchema } from '../lib/validation';
import { generateStudySet } from '../lib/api';

function makeRequestId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sampleWithoutReplacement(array, count) {
  const copy = array.slice();
  const result = [];
  while (result.length < count && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function sampleWithReplacement(array, count) {
  if (array.length === 0) return [];
  const result = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * array.length);
    result.push(array[idx]);
  }
  return result;
}

function deriveFlashcards(cards) {
  return cards.map((card) => ({
    id: card.id,
    front: card.question,
    back: card.answer,
    tags: [card.difficulty],
  }));
}

function deriveQuizQuestions(cards) {
  // Per assignment design decision: derive quiz questions from cards on the frontend.
  // Each quiz question uses the card.question as the question, and the card.answer as the correct option.
  return cards.map((card) => {
    const correctAnswer = card.answer;

    const decoyAnswers = cards
      .filter((c) => c.id !== card.id)
      .map((c) => c.answer);

    // Prefer decoys that differ from the correct answer (avoids ambiguity).
    const distinctDecoys = decoyAnswers.filter((a) => a !== correctAnswer);

    let decoys;
    if (distinctDecoys.length >= 3) {
      decoys = sampleWithoutReplacement(distinctDecoys, 3);
    } else if (decoyAnswers.length >= 1) {
      const pool = distinctDecoys.length > 0 ? distinctDecoys : decoyAnswers;
      decoys = sampleWithReplacement(pool, 3);

      // If all cards share the same answer, we can still build a valid 4-option set.
      while (decoys.length < 3) decoys.push(correctAnswer);
    } else {
      // Should be unreachable because we validate min 3 cards, but keep a safe fallback.
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

export function useStudySession() {
  const [mode, setMode] = useState('empty'); // empty | loading | error | flashcards | quiz | results
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [flashcards, setFlashcards] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]); // initial quiz or derived quiz
  const [activeQuizQuestions, setActiveQuizQuestions] = useState([]); // initial quiz or retry subset

  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  const [quizAttempt, setQuizAttempt] = useState(0); // 0 initial, 1+ retries
  const [quizResults, setQuizResults] = useState(null); // { scorePercent, incorrectQuestionIds, incorrectQuestions }

  const [lastInput, setLastInput] = useState(null);

  const currentRequestIdRef = useRef(null);

  const buildInputString = ({ topic, notes }) => {
    const trimmedNotes = (notes ?? '').trim();
    if (trimmedNotes.length > 0) {
      return `${topic}\n\nNotes: ${trimmedNotes}`;
    }
    return topic;
  };

  const generate = async (input) => {
    const validatedInput = TopicInputSchema.parse(input);
    const requestId = makeRequestId();
    currentRequestIdRef.current = requestId;

    setLastInput(validatedInput);
    setIsLoading(true);
    setError(null);
    setMode('loading');

    // Reset study state.
    setFlashcards([]);
    setQuizQuestions([]);
    setActiveQuizQuestions([]);
    setCurrentCardIndex(0);
    setQuizAttempt(0);
    setQuizResults(null);

    try {
      const studySet = await generateStudySet({
        input: buildInputString({ topic: validatedInput.topic, notes: validatedInput.notes }),
        cardCount: validatedInput.cardCount,
      });

      if (currentRequestIdRef.current !== requestId) return; // stale response protection

      const cards = studySet.cards;
      const nextFlashcards = deriveFlashcards(cards);
      const nextQuizQuestions = deriveQuizQuestions(cards);

      setFlashcards(nextFlashcards);
      setQuizQuestions(nextQuizQuestions);
      setActiveQuizQuestions(nextQuizQuestions);
      setCurrentCardIndex(0);
      setQuizAttempt(0);
      setQuizResults(null);
      setMode('flashcards');
    } catch (err) {
      if (currentRequestIdRef.current !== requestId) return; // stale response protection

      setError(err instanceof Error ? err.message : 'Failed to generate study materials');
      setMode('error');
    } finally {
      if (currentRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  };

  const retryGenerate = () => {
    if (!lastInput) return;
    generate(lastInput);
  };

  const resetSession = () => {
    currentRequestIdRef.current = null;
    setMode('empty');
    setIsLoading(false);
    setError(null);

    setFlashcards([]);
    setQuizQuestions([]);
    setActiveQuizQuestions([]);
    setCurrentCardIndex(0);
    setQuizAttempt(0);
    setQuizResults(null);
    setLastInput(null);
  };

  const goToQuiz = () => {
    setQuizAttempt(0);
    setActiveQuizQuestions(quizQuestions);
    setQuizResults(null);
    setMode('quiz');
  };

  const handlePrevCard = () => {
    setCurrentCardIndex((idx) => Math.max(0, idx - 1));
  };

  const handleNextCard = () => {
    setCurrentCardIndex((idx) => Math.min(flashcards.length - 1, idx + 1));
  };

  const onQuizComplete = ({ scorePercent, incorrectQuestionIds }) => {
    const incorrectQuestions = activeQuizQuestions.filter((q) => incorrectQuestionIds.includes(q.id));
    const totalQuestions = activeQuizQuestions.length;
    const correctQuestionCount = Math.max(0, totalQuestions - incorrectQuestionIds.length);

    setQuizResults({
      scorePercent,
      incorrectQuestionIds,
      incorrectQuestions,
      totalQuestions,
      correctQuestionCount,
    });
    setMode('results');
  };

  const retryWrongAnswers = () => {
    if (!quizResults) return;
    if (quizResults.incorrectQuestions.length === 0) return;

    setQuizAttempt((a) => a + 1);
    setActiveQuizQuestions(quizResults.incorrectQuestions);
    setQuizResults(null);
    setMode('quiz');
  };

  const reviewFlashcards = () => {
    setMode('flashcards');
    setCurrentCardIndex(0);
  };

  return {
    mode,
    isLoading,
    error,

    flashcards,
    currentCardIndex,

    quizAttempt,
    activeQuizQuestions,
    quizResults,

    generate,
    retryGenerate,
    resetSession,

    onPrevCard: handlePrevCard,
    onNextCard: handleNextCard,

    goToQuiz,
    onQuizComplete,
    retryWrongAnswers,
    reviewFlashcards,
  };
}
