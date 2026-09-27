// Backend Zod validation schemas
const { z } = require('zod');

// Request validation (assignment contract)
// POST /api/generate
// { input: string }
const GenerateRequestSchema = z.object({
  input: z.string().min(1, 'Input must be a non-empty string').max(4000, 'Input is too long'),
});

// Assignment data contract (LLM output)
const CardSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

const StudySetSchema = z.object({
  title: z.string().min(1),
  cards: z.array(CardSchema)
    .min(3, 'Must have at least 3 cards')
    .max(15, 'Cannot exceed 15 cards')
    .refine(
      (cards) => new Set(cards.map((c) => c.id)).size === cards.length,
      { message: 'Card ids must be unique' }
    ),
});

function validateGenerateRequest(data) {
  return GenerateRequestSchema.parse(data);
}

function validateStudySet(data) {
  return StudySetSchema.parse(data);
}

module.exports = {
  validateGenerateRequest,
  validateStudySet,
  GenerateRequestSchema,
  StudySetSchema,
  CardSchema,
};
