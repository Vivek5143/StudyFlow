import { useState } from 'react';

export default function InputForm({ onSubmit, isLoading }) {
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    if (topic.length < 3) {
      setErrors({ topic: 'Topic must be at least 3 characters' });
      return;
    }

    onSubmit({ topic, notes });
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
          placeholder="Add any specific notes or context..."
          disabled={isLoading}
          maxLength={1000}
          rows={4}
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={isLoading}>
        <span>{isLoading ? 'Generating...' : 'Generate study set'}</span>
        {!isLoading && <span className="button-arrow" aria-hidden="true">↗</span>}
      </button>
    </form>
  );
}