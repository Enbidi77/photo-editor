import { z } from 'zod';

export const createAssetMetadataSchema = z.object({
  storagePath: z.string().min(1),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  sizeBytes: z.number().int().nonnegative().nullable().optional(),
});

export type CreateAssetMetadataDto = z.infer<typeof createAssetMetadataSchema>;
