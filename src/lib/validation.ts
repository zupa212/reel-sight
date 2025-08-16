import { z } from 'zod';

export const addModelSchema = z.object({
  username: z.string()
    .min(1, 'Username is required')
    .regex(/^[a-zA-Z0-9._]+$/, 'Invalid username format')
    .transform(val => val.replace(/^@+/, '')), // Remove @ symbols
  displayName: z.string().optional()
});

export const reelFiltersSchema = z.object({
  modelId: z.string().optional(),
  dateRange: z.enum(['7', '30', '90']).optional(),
  minViews: z.number().min(0).optional(),
  searchTerm: z.string().optional()
});

export const logEventSchema = z.object({
  event: z.string().min(1),
  level: z.enum(['info', 'warn', 'error', 'debug']).default('info'),
  context: z.record(z.string(), z.any()).default({}),
  page: z.string().optional()
});

export type AddModelInput = z.infer<typeof addModelSchema>;
export type ReelFiltersInput = z.infer<typeof reelFiltersSchema>;
export type LogEventInput = z.infer<typeof logEventSchema>;