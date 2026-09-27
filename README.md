# StudyFlow

AI-powered interactive study assistant built for the Flam Frontend Internship Assignment.

## Features

- Generate flashcards from study topics and notes using LLM
- Interactive flashcard viewer with flip animations
- Quiz mode with multiple-choice questions
- Retry incorrect answers
- Mobile-responsive design (390px minimum width)

## Tech Stack

- **Frontend**: React + Vite, Zod validation
- **Backend**: Node.js + Express
- **LLM Integration**: Gemini, Groq, or OpenRouter

## Setup

### Prerequisites

- Node.js 18+
- An API key from one of: Gemini, Groq, or OpenRouter

### Installation

1. Clone the repository and navigate to the project directory

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Add your LLM API key to `.env`:
```
GEMINI_API_KEY=your_key_here
# OR
GROQ_API_KEY=your_key_here
# OR
OPENROUTER_API_KEY=your_key_here
```

### Running the Application

1. Start the backend server:
```bash
npm run server
```

2. In a separate terminal, start the frontend:
```bash
npm run dev
```

3. Open http://localhost:5173 in your browser

## Project Structure

```
study-flow/
├── src/
│   ├── components/      # React components
│   │   ├── InputForm.jsx
│   │   ├── FlashcardViewer.jsx
│   │   └── QuizMode.jsx
│   ├── hooks/          # Custom React hooks
│   │   └── useStudySession.js
│   ├── lib/            # Utilities and validation
│   │   └── validation.ts
│   └── types/          # TypeScript type definitions
│       └── index.ts
└── server/             # Express backend
    └── index.js
```

## Security

⚠️ **IMPORTANT**: The LLM API key is stored in the backend and NEVER exposed to the browser. All LLM calls go through the Express server.

## Development

- Frontend runs on port 5173 (Vite default)
- Backend runs on port 3001
- CORS is configured for local development

## License

MIT