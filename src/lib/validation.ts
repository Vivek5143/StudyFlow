import { z } from 'zod';

// Frontend validation schemas
export const TopicInputSchema = z.object({
  topic: z.string()
    .min(3, 'Topic must be at least 3 characters')
    .max(200, 'Topic must not exceed 200 characters'),
  notes: z.string().max(1000, 'Notes must not exceed 1000 characters').optional(),
});

export type TopicInput = z.infer<typeof TopicInputSchema>;

export const CardSchema = z.object({
  id: z.string(),
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

export const APIResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    title: z.string().min(1),
    cards: z.array(CardSchema)
      .min(3, 'Must have at least 3 cards')
      .max(15, 'Cannot exceed 15 cards')
      .refine(
        (cards) => new Set(cards.map((c) => c.id)).size === cards.length,
        { message: 'Card ids must be unique' }
      ),
  }).optional(),
  error: z.string().optional(),
  requestId: z.string(),
  timestamp: z.string().datetime(),
});

export type APIResponse = z.infer<typeof APIResponseSchema>;
