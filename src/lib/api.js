import axios from 'axios';
import { APIResponseSchema } from './validation';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function normalizeAxiosError(err) {
  // eslint-disable-next-line no-console
  // console.debug(err);

  if (err?.code === 'ECONNABORTED') {
    return 'Request timeout - please try again';
  }

  if (err?.response?.data?.error) {
    return err.response.data.error;
  }

  if (typeof err?.message === 'string' && err.message.length > 0) {
    // Keep messages user-friendly; don't surface provider internals.
    if (err.message.toLowerCase().includes('network')) {
      return 'Network error - please check the server is running';
    }
    return err.message;
  }

  return 'Failed to generate study materials';
}

export async function generateStudySet({ input }, { signal, timeoutMs = 30000 } = {}) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/generate`,
      {
        input,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: timeoutMs,
        signal,
      }
    );

    // Validate response shape before returning anything to React.
    const parsed = APIResponseSchema.parse(response.data);

    if (!parsed.success) {
      throw new Error(parsed.error || 'Unable to generate study set');
    }

    if (!parsed.data) {
      throw new Error('LLM response missing study data');
    }

    return parsed.data;
  } catch (err) {
    // Zod parse errors (or any other parsing errors)
    if (err?.name === 'ZodError') {
      throw new Error('Invalid AI response format - please try again');
    }

    if (axios.isAxiosError(err)) {
      throw new Error(normalizeAxiosError(err));
    }

    if (err instanceof Error) {
      throw err;
    }

    throw new Error('Failed to generate study materials');
  }
}
