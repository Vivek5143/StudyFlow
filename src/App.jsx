import InputForm from './components/InputForm';
import FlashcardViewer from './components/FlashcardViewer';
import QuizMode from './components/QuizMode';
import { useStudySession } from './hooks/useStudySession';
import './App.css';

export default function App() {
  const {
    mode,
    isLoading,
    error,

    flashcards,
    currentCardIndex,
    difficultCardIds,
    quizAttempt,
    activeQuizQuestions,
    quizResults,

    generate,
    retryGenerate,
    resetSession,

    onPrevCard,
    onNextCard,

    goToQuiz,
    onQuizComplete,
    retryWrongAnswers,
    reviewFlashcards,
  } = useStudySession();

  const incorrectCount = quizResults?.incorrectQuestionIds.length ?? 0;
  const quizQuestionCount = activeQuizQuestions.length;

  return (
    <main className={`studyflow-page studyflow-page--${mode}`}>
      <header className="studyflow-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span className="brand-name">StudyFlow</span>
        </div>
        <div className="header-context">
          <span className="header-context__dot" aria-hidden="true" />
          {mode === 'empty' ? 'Ready when you are' : mode === 'loading' ? 'Preparing your session' : 'Focused study mode'}
        </div>
      </header>

      {mode === 'empty' && (
        <section className="empty-workspace">
          <div className="empty-copy">
            <div className="eyebrow">Build a better memory</div>
            <h1>Turn notes into an <em>interactive</em> study session.</h1>
            <p>StudyFlow reshapes your notes into a focused loop of recall, feedback, and progress.</p>
            <div className="empty-signals" aria-label="Study set features">
              <span><b>01</b> Recall cards</span>
              <span><b>02</b> Quick quiz</span>
              <span><b>03</b> Track progress</span>
            </div>
          </div>
          <div className="empty-form-panel">
            <div className="panel-heading">
              <span className="panel-number">01</span>
              <div>
                <h2>Start a new study set</h2>
                <p>Give your session a starting point.</p>
              </div>
            </div>
            <InputForm onSubmit={generate} isLoading={isLoading} />
            <div className="hero-hint"><span className="hero-hint__dot" /> Add notes for more relevant questions.</div>
          </div>
        </section>
      )}

      {mode === 'loading' && (
        <section className="loading-workspace">
          <div className="loading-visual" aria-hidden="true">
            <div className="loading-card loading-card--one" />
            <div className="loading-card loading-card--two" />
            <div className="loading-card loading-card--three"><span /></div>
          </div>
          <div className="loading-copy">
            <div className="eyebrow">One moment</div>
            <h1>Creating your study set<span className="loading-dots">...</span></h1>
            <p>Sorting the signal from your notes and shaping it into cards you can actually remember.</p>
          </div>
        </section>
      )}

      {mode === 'error' && (
        <section className="state-workspace state-workspace--error">
          <div className="state-icon state-icon--error" aria-hidden="true">!</div>
          <div className="eyebrow">A small detour</div>
          <h1>We couldn't build that set.</h1>
          <p className="error-text">{error}</p>
          <div className="state-actions">
            <button type="button" className="btn btn-primary" onClick={retryGenerate} disabled={isLoading}>
              Retry
            </button>
            <button type="button" className="btn btn-ghost btn-new" onClick={resetSession}>
              New Study Set
            </button>
          </div>
        </section>
      )}

      {mode === 'flashcards' && flashcards.length > 0 && (
        <section className="study-workspace">
          <div className="workspace-heading">
            <div>
              <div className="eyebrow">Active study set</div>
              <h1>Recall before you review.</h1>
            </div>
          </div>

          <FlashcardViewer
            flashcards={flashcards}
            currentCardIndex={currentCardIndex}
            onPrev={onPrevCard}
            onNext={onNextCard}
            difficultCardIds={difficultCardIds}
          />

          {currentCardIndex === flashcards.length - 1 && (
            <div className="study-next-step">
              <div><span className="next-step-line" /> <span>Cards first, quiz next</span></div>
              <button type="button" className="btn btn-primary" onClick={goToQuiz}>
                Continue to quiz <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </section>
      )}

      {mode === 'quiz' && activeQuizQuestions.length > 0 && (
        <section className="quiz-workspace">
          <div className="workspace-heading workspace-heading--quiz">
            <div>
              <div className="eyebrow">Knowledge check</div>
              <h1>Make it stick.</h1>
            </div>
            <div className="quiz-heading-mark" aria-hidden="true">Q</div>
          </div>
          <QuizMode
            questions={activeQuizQuestions}
            attemptLabel={quizAttempt === 1 ? 'Quiz retry' : 'Quiz'}
            onComplete={onQuizComplete}
          />
        </section>
      )}

      {mode === 'results' && quizResults && (
        <section className="results-workspace">
          <div className="results-hero">
            <div className="eyebrow">Session complete</div>
            <h1>{quizResults.scorePercent >= 80 ? 'That knowledge is landing.' : 'A little more practice will help.'}</h1>
            <div className="results-score" aria-label="Quiz score"><strong>{quizResults.scorePercent}</strong><span>%</span></div>
          </div>
          <div className="results-breakdown">
            <div><span className="result-dot result-dot--correct" /> <strong>{quizQuestionCount - incorrectCount}</strong><span>correct</span></div>
            <div><span className="result-dot result-dot--wrong" /> <strong>{incorrectCount}</strong><span>to revisit</span></div>
            <div><span className="result-dot result-dot--total" /> <strong>{quizQuestionCount}</strong><span>questions</span></div>
          </div>

          <div className="results-actions">
            {quizAttempt < 2 && quizResults.incorrectQuestionIds.length > 0 && (
              <button type="button" className="btn btn-primary results-primary" onClick={retryWrongAnswers}>
                Retry wrong answers <span aria-hidden="true">↗</span>
              </button>
            )}

            <button type="button" className="btn btn-secondary" onClick={reviewFlashcards}>
              Review flashcards <span aria-hidden="true">↗</span>
            </button>

            <button type="button" className="btn btn-ghost btn-new" onClick={resetSession}>
              New Study Set
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
