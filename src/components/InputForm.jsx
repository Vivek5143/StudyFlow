import { useState } from 'react';

const noteExamples = [
  { label: 'Paste lecture notes', value: 'Key lecture notes: definitions, main concepts, and examples to review.' },
  { label: 'Exam revision', value: 'Exam revision topics: key terms, important processes, and common mistakes.' },
  { label: 'Study a topic', value: 'Help me study the core ideas, vocabulary, and relationships in this topic.' },
];

export default function InputForm({ onSubmit, isLoading }) {
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [cardCount, setCardCount] = useState(8);
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    if (topic.length < 3) {
      setErrors({ topic: 'Topic must be at least 3 characters' });
      return;
    }

    onSubmit({ topic, notes, cardCount });
  };

  return (
    <form onSubmit={handleSubmit} className="input-form">
      <div className="form-group">
        <label htmlFor="topic">What are you learning?</label>
        <input
          id="topic"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter a topic to study..."
          disabled={isLoading}
          maxLength={200}
        />
        {errors.topic && <span className="error">{errors.topic}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="notes">Add context <span>(optional)</span></label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Paste lecture notes, key concepts, or a topic to explore..."
          disabled={isLoading}
          maxLength={1000}
          rows={4}
        />
        <div className="notes-meta">
          <span className="notes-examples-label">Try an example</span>
          <span className="notes-counter" aria-live="polite">{notes.length} / 1000</span>
        </div>
        <div className="notes-examples" aria-label="Example note prompts">
          {noteExamples.map((example) => (
            <button
              key={example.label}
              type="button"
              className="notes-example-chip"
              onClick={() => setNotes(example.value)}
              disabled={isLoading}
            >
              {example.label}
            </button>
          ))}
        </div>
      </div>

      <fieldset className="form-group card-count-group" disabled={isLoading}>
        <legend>Number of cards</legend>
        <p className="card-count-help">Choose the depth of your study session</p>
        <div className="card-count-options" role="radiogroup" aria-label="Number of cards">
          {[3, 5, 8, 10, 15].map((count) => (
            <button
              key={count}
              type="button"
              className={`card-count-option ${cardCount === count ? 'is-selected' : ''}`}
              role="radio"
              aria-checked={cardCount === count}
              onClick={() => setCardCount(count)}
            >
              {count}
            </button>
          ))}
        </div>
      </fieldset>

      <button type="submit" className="btn btn-primary" disabled={isLoading}>
        <span>{isLoading ? 'Generating...' : 'Generate study set'}</span>
        {!isLoading && <span className="button-arrow" aria-hidden="true">↗</span>}
      </button>
    </form>
  );
}