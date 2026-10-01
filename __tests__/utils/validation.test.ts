import { z } from 'zod';
import { validateSchema } from '../../src/utils/validation';
import { AppError } from '../../src/http/errors';

describe('Validation Utils', () => {
  const TestSchema = z.object({
    id: z.string(),
    count: z.number(),
  });

  it('should return valid data', () => {
    const data = { id: 'test', count: 42, extra: true };
    const result = validateSchema(TestSchema, data);
    
    expect(result).toEqual({ id: 'test', count: 42 });
  });

  it('should throw AppError on validation failure', () => {
    const data = { id: 'test', count: '42' }; // count should be number
    
    expect(() => validateSchema(TestSchema, data)).toThrow(AppError);
    expect(() => validateSchema(TestSchema, data)).toThrow(/Parse error/);
  });
});
