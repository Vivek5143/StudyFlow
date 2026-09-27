import { useState } from 'react';

export default function FlashcardViewer({
  flashcards,
  currentCardIndex,
  onPrev,
  onNext,
  onMarkKnown,
  onMarkUnknown,
  cardKnowledgeById,
  difficultCardIds,
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [navigationDirection, setNavigationDirection] = useState(null);

  const card = flashcards[currentCardIndex];
  const isDifficult = difficultCardIds?.has(card.id);
  const isMarked = Boolean(cardKnowledgeById?.[card.id]);
  const lastIndex = flashcards.length - 1;

  const difficultyTag = !card?.tags || card.tags.length === 0 ? null : card.tags[0];

  const difficultyMeta = (() => {
    if (!difficultyTag) return null;
    if (difficultyTag === 'easy') return { icon: '🌿', label: 'Easy' };
    if (difficultyTag === 'medium') return { icon: '⟡', label: 'Medium' };
    return { icon: '🔥', label: 'Hard' };
  })();

  const progressPct = flashcards.length > 0
    ? Math.round(((currentCardIndex + 1) / flashcards.length) * 100)
    : 0;

  const isShowingBack = isFlipped;

  if (!flashcards || flashcards.length === 0) {
    return <div className="empty-state">No flashcards available.</div>;
  }

  const handleToggle = () => {
    setIsFlipped((previous) => !previous);
  };

  const handlePrev = () => {
    setNavigationDirection('backward');
    setIsFlipped(false);
    onPrev();
  };

  const handleNext = () => {
    setNavigationDirection('forward');
    setIsFlipped(false);
    onNext();
  };

  const canGoPrev = currentCardIndex > 0;
  const canGoNext = currentCardIndex < lastIndex && isShowingBack;
  const canMark = isShowingBack && !isMarked;

  const difficultyPillClass = (() => {
    if (!difficultyTag) return '';
    if (difficultyTag === 'easy') return 'pill-difficulty pill-difficulty--easy';
    if (difficultyTag === 'medium') return 'pill-difficulty pill-difficulty--medium';
    return 'pill-difficulty pill-difficulty--hard';
  })();

  return (
    <div className={`flashcard-viewer ${navigationDirection ? `flashcard-viewer--${navigationDirection}` : ''}`}>
      <div className="flashcard-header">
        <div className="flashcard-header-left">
          <div className="flashcard-counter flashcard-counter--big">
            Card {currentCardIndex + 1} of {flashcards.length}
          </div>
        </div>

        <div className="flashcard-meta">
          {difficultyTag && difficultyMeta && (
            <span className={`pill ${difficultyPillClass} flashcard-difficulty-pill`}>
              <span className="flashcard-difficulty-icon" aria-hidden="true">
                {difficultyMeta.icon}
              </span>
              Difficulty: {difficultyMeta.label}
            </span>
          )}

          {isDifficult && <span className="pill pill-danger">Needs extra practice</span>}
        </div>
      </div>

      <div
        key={currentCardIndex}
        className={`flashcard ${isShowingBack ? 'is-flipped' : ''}`}
      >
        <button
          type="button"
          className="flashcard-face"
          onClick={handleToggle}
          aria-label={isShowingBack ? 'Show question' : 'Reveal answer'}
        >
          <div className="flashcard-inner" aria-live="polite">
            <div className="flashcard-front">
              <div className="flashcard-side-label">
                <span className="side-dot" /> Question
              </div>
              <div className="flashcard-content">{card.front}</div>
              <div className="flip-hint">
                <span className="flip-hint__icon" aria-hidden="true">
                  ⤾
                </span>
                Tap to reveal answer
              </div>
            </div>
            <div className="flashcard-back">
              <div className="flashcard-side-label">
                <span className="side-dot side-dot--back" /> Answer
              </div>
              <div className="flashcard-content">{card.back}</div>
              <div className="flip-hint">Tap to flip back</div>
            </div>
          </div>
        </button>
      </div>

      <div className="flashcard-footer">
        <button type="button" className="btn btn-ghost" onClick={handlePrev} disabled={!canGoPrev}>
          ← Previous
        </button>
        <div className="flashcard-progress-meter flashcard-progress-meter--footer" aria-label="Flashcard progress">
          <div className="flashcard-progress-row">
            <span>Progress</span>
            <span className="progress-number">{currentCardIndex + 1} of {flashcards.length}</span>
          </div>
          <div className="progress-bar" aria-hidden="true">
            <div className="progress-bar__fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        {currentCardIndex < lastIndex && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleNext}
            disabled={!canGoNext}
            title={!isShowingBack ? 'Reveal the answer first' : undefined}
          >
            Next →
          </button>
        )}
      </div>

      <div className="flashcard-marking" aria-label="Mark your answer">
        <span className="flashcard-marking-label">How did that feel?</span>
        <div className="flashcard-marking-actions">
          <button
            type="button"
            className="flashcard-mark-btn flashcard-mark-btn--known"
            onClick={() => onMarkKnown(card.id)}
            disabled={!canMark}
          >
            Got it
          </button>
          <button
            type="button"
            className="flashcard-mark-btn flashcard-mark-btn--unknown"
            onClick={() => onMarkUnknown(card.id)}
            disabled={!canMark}
          >
            Didn't know
          </button>
        </div>
      </div>

      {card.tags && card.tags.length > 0 && (
        <div className="flashcard-tags" aria-label="Card tags">
          {card.tags.map((tag, idx) => (
            <span key={idx} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
