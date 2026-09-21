import 'server-only';
import { db, isDatabaseConfigured } from '@/db';
import { projectAssets, ProjectAssetRow } from '@/db/schema';
import { CreateAssetMetadataDto } from '@/lib/validation/asset';
import { eq, desc } from 'drizzle-orm';

export class AssetService {
  async recordAssetMetadata(
    projectId: string,
    userId: string,
    input: CreateAssetMetadataDto
  ): Promise<ProjectAssetRow | null> {
    if (!isDatabaseConfigured()) {
      return null;
    }

    const [record] = await db
      .insert(projectAssets)
      .values({
        projectId,
        storagePath: input.storagePath,
        filename: input.filename,
        mimeType: input.mimeType,
        width: input.width || null,
        height: input.height || null,
        sizeBytes: input.sizeBytes || null,
        createdBy: userId,
      })
      .returning();

    return record;
  }

  async listProjectAssets(projectId: string): Promise<ProjectAssetRow[]> {
    if (!isDatabaseConfigured()) {
      return [];
    }

    return await db.query.projectAssets.findMany({
      where: eq(projectAssets.projectId, projectId),
      orderBy: [desc(projectAssets.createdAt)],
    });
  }

  async deleteAssetMetadata(assetId: string): Promise<void> {
    if (!isDatabaseConfigured()) return;

    await db.delete(projectAssets).where(eq(projectAssets.id, assetId));
  }
}

export const assetService = new AssetService();
