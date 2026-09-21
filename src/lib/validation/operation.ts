import { z } from 'zod';

export const persistOperationSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  operationType: z.string().min(1),
  payload: z.record(z.any()),
});

export const batchOperationsSchema = z.object({
  operations: z.array(persistOperationSchema).min(1).max(500),
});

export type PersistOperationDto = z.infer<typeof persistOperationSchema>;
export type BatchOperationsDto = z.infer<typeof batchOperationsSchema>;
