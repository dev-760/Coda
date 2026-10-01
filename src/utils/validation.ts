import { z } from 'zod';
import { ParseError } from '../http/errors';

export function validateSchema<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
    throw new ParseError(`Parse error: ${issues}`);
  }
  return result.data;
}
