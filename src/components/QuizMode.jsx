import { useEffect, useMemo, useRef, useState } from 'react';

export default function QuizMode({ questions, onComplete, attemptLabel = '' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submittedAnswer, setSubmittedAnswer] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [showExplanation, setShowExplanation] = useState(false);

  const isComplete = useMemo(() => {
    if (!questions || questions.length === 0) return false;
    return currentIndex >= questions.length;
  }, [currentIndex, questions]);

  const completionReportedRef = useRef(false);

  useEffect(() => {
    if (!isComplete) {
      completionReportedRef.current = false;
      return;
    }

    if (completionReportedRef.current) return;
    completionReportedRef.current = true;

    const scorePercent = Math.round(
      (Object.keys(userAnswers)
        .filter((qid) => {
          const q = questions.find((qq) => qq.id === qid);
          return q && userAnswers[qid] === q.correctAnswerIndex;
        })
        .length /
        questions.length) * 100
    );

    const incorrectQuestionIds = questions
      .filter((q) => userAnswers[q.id] !== q.correctAnswerIndex)
      .map((q) => q.id);

    onComplete({
      scorePercent,
      incorrectQuestionIds,
    });
  }, [isComplete, onComplete, questions, userAnswers]);

  if (!questions || questions.length === 0) {
    return <div className="quiz-mode empty-state">No quiz questions available.</div>;
  }

  if (isComplete) {
    return <div className="quiz-mode empty-state">Calculating results…</div>;
  }

  const currentQuestion = questions[currentIndex];
  const hasSubmitted = submittedAnswer !== null;

  const correctAnswerIndex = currentQuestion.correctAnswerIndex;
  const currentIsCorrect = hasSubmitted && submittedAnswer === correctAnswerIndex;

  const handleSelect = (optionIndex) => {
    if (hasSubmitted) return;
    setSelectedAnswer(optionIndex);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;

    setSubmittedAnswer(selectedAnswer);
    setShowExplanation(true);
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: selectedAnswer,
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setSubmittedAnswer(null);
      setShowExplanation(false);
      return;
    }

    setCurrentIndex(questions.length);
  };

  const correctOptionText = currentQuestion.options[correctAnswerIndex];

  return (
    <div className={`quiz-mode quiz-mode--${currentIsCorrect ? 'success' : 'neutral'} ${hasSubmitted ? 'quiz-mode--submitted' : ''}`}>
      <div className="quiz-header">
        <div className="quiz-progress">
          <div className="quiz-progress-top">
            <div className="quiz-progress-label" aria-label="Quiz progress">
              Question <span className="quiz-progress-strong">{currentIndex + 1}</span> of {questions.length}
            </div>
            {attemptLabel && <div className="pill quiz-attempt">{attemptLabel}</div>}
          </div>

          <div className="quiz-progress-track" aria-hidden="true">
            <div
              className="quiz-progress-track__fill"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="quiz-step" key={currentIndex}>
        <div className={`question ${hasSubmitted ? 'question--locked' : ''}`}>
          <div className="question-kicker">Choose the best answer</div>
          <h3 className="question-text">{currentQuestion.question}</h3>
        </div>

        <div className="options" role="group" aria-label="Answer choices">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrectOption = hasSubmitted && idx === correctAnswerIndex;
            const isWrongSelected = hasSubmitted && isSelected && idx !== correctAnswerIndex;

            return (
              <button
                key={idx}
                type="button"
                className={`option ${!hasSubmitted && isSelected ? 'selected' : ''} ${isCorrectOption ? 'correct' : ''} ${isWrongSelected ? 'incorrect' : ''}`}
                onClick={() => handleSelect(idx)}
                aria-label={`${String.fromCharCode(65 + idx)}. ${option}`}
                aria-pressed={isSelected}
                disabled={hasSubmitted}
              >
                <span className="option-badge" aria-hidden="true">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="option-text">{option}</span>

                {hasSubmitted && idx === correctAnswerIndex && (
                  <span className="option-state option-state--correct" aria-hidden="true">
                    ✓
                  </span>
                )}

                {hasSubmitted && isWrongSelected && (
                  <span className="option-state option-state--incorrect" aria-hidden="true">
                    ×
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {!hasSubmitted && (
          <button
            type="button"
            className="btn btn-primary submit-answer"
            onClick={handleSubmit}
            disabled={selectedAnswer === null}
          >
            Check answer
          </button>
        )}

        {hasSubmitted && (
          <div className={`quiz-feedback ${currentIsCorrect ? 'quiz-feedback--correct' : 'quiz-feedback--incorrect'}`}>
            <div className="quiz-feedback-top">
              <div className="quiz-feedback-status" aria-live="polite">
                <span className="quiz-feedback-icon" aria-hidden="true">
                  {currentIsCorrect ? '✓' : '×'}
                </span>
                <span className="quiz-feedback-title">
                  {currentIsCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>
              <div className="quiz-feedback-sub">
                {currentIsCorrect ? 'Nice — keep momentum.' : `Correct answer: ${correctOptionText}`}
              </div>
            </div>

            {showExplanation && currentQuestion.explanation && (
              <p className="quiz-feedback-explanation">{currentQuestion.explanation}</p>
            )}
          </div>
        )}

        {hasSubmitted && (
          <button type="button" className="btn btn-secondary next-question" onClick={handleNext}>
            {currentIndex < questions.length - 1 ? 'Next question' : 'Finish quiz'}
          </button>
        )}
      </div>
    </div>
  );
}
