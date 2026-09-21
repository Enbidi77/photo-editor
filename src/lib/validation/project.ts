import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Project name too long'),
  width: z.number().int().positive('Width must be positive').max(16384, 'Width exceeds maximum limit (16384px)'),
  height: z.number().int().positive('Height must be positive').max(16384, 'Height exceeds maximum limit (16384px)'),
  resolution: z.number().int().positive().default(72),
  backgroundColor: z.string().default('#ffffff'),
  colorMode: z.enum(['RGB', 'CMYK', 'Grayscale']).default('RGB'),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  width: z.number().int().positive().max(16384).optional(),
  height: z.number().int().positive().max(16384).optional(),
  resolution: z.number().int().positive().optional(),
  backgroundColor: z.string().optional(),
  document: z.record(z.any()).optional(),
  thumbnailUrl: z.string().nullable().optional(),
});

export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
