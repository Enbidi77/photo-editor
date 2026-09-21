import { z } from 'zod';
import { Layer } from './layer';

export type OperationType =
  | 'ADD_LAYER'
  | 'DELETE_LAYER'
  | 'UPDATE_LAYER'
  | 'MOVE_LAYER'
  | 'TRANSFORM_LAYER'
  | 'REORDER_LAYER'
  | 'UPDATE_TEXT'
  | 'UPDATE_STYLE'
  | 'UPDATE_OPACITY'
  | 'UPDATE_BLEND_MODE'
  | 'UPDATE_DOCUMENT'
  | 'APPLY_FILTER'
  | 'CROP_DOCUMENT';

export interface EditorOperation<T = unknown> {
  id: string;
  projectId: string;
  userId: string;
  type: OperationType;
  timestamp: number;
  sequence?: number;
  payload: T;
}

export const EditorOperationSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  type: z.enum([
    'ADD_LAYER',
    'DELETE_LAYER',
    'UPDATE_LAYER',
    'MOVE_LAYER',
    'TRANSFORM_LAYER',
    'REORDER_LAYER',
    'UPDATE_TEXT',
    'UPDATE_STYLE',
    'UPDATE_OPACITY',
    'UPDATE_BLEND_MODE',
    'UPDATE_DOCUMENT',
    'APPLY_FILTER',
    'CROP_DOCUMENT',
  ]),
  timestamp: z.number(),
  sequence: z.number().optional(),
  payload: z.any(),
});
