import 'server-only';
import { db, isDatabaseConfigured } from '@/db';
import { projectOperations, ProjectOperationRow } from '@/db/schema';
import { PersistOperationDto } from '@/lib/validation/operation';
import { eq, gt, and, asc } from 'drizzle-orm';

export class OperationService {
  async persistOperation(op: PersistOperationDto): Promise<ProjectOperationRow | null> {
    if (!isDatabaseConfigured()) return null;

    const [saved] = await db
      .insert(projectOperations)
      .values({
        projectId: op.projectId,
        userId: op.userId,
        operationType: op.operationType,
        payload: op.payload,
      })
      .returning();

    return saved;
  }

  async persistBatchOperations(
    projectId: string,
    userId: string,
    ops: Array<{ operationType: string; payload: Record<string, any> }>
  ): Promise<void> {
    if (!isDatabaseConfigured() || ops.length === 0) return;

    await db.insert(projectOperations).values(
      ops.map((op) => ({
        projectId,
        userId,
        operationType: op.operationType,
        payload: op.payload,
      }))
    );
  }

  async getRecentOperations(
    projectId: string,
    afterSequence = 0
  ): Promise<ProjectOperationRow[]> {
    if (!isDatabaseConfigured()) return [];

    return await db.query.projectOperations.findMany({
      where: and(
        eq(projectOperations.projectId, projectId),
        gt(projectOperations.sequence, afterSequence)
      ),
      orderBy: [asc(projectOperations.sequence)],
      limit: 1000,
    });
  }
}

export const operationService = new OperationService();
