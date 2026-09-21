import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess } from '@/lib/auth/requireProjectAccess';
import { assetService } from '@/server/assets/asset.service';
import { createAssetMetadataSchema } from '@/lib/validation/asset';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId, 'viewer');

    const assets = await assetService.listProjectAssets(projectId);
    return NextResponse.json({ assets });
  } catch (err: any) {
    if (err?.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (err?.name === 'ForbiddenError' || err?.name === 'NotFoundError') {
      return NextResponse.json({ error: err.message }, { status: err?.name === 'NotFoundError' ? 404 : 403 });
    }
    console.error('GET /api/projects/[projectId]/assets error:', err);
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const { user } = await requireProjectAccess(projectId, 'editor');

    const body = await req.json();
    const validated = createAssetMetadataSchema.parse(body);

    const asset = await assetService.recordAssetMetadata(projectId, user.id, validated);
    return NextResponse.json({ asset }, { status: 201 });
  } catch (err: any) {
    if (err?.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (err?.name === 'ForbiddenError' || err?.name === 'NotFoundError') {
      return NextResponse.json({ error: err.message }, { status: err?.name === 'NotFoundError' ? 404 : 403 });
    }
    if (err?.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 });
    }
    console.error('POST /api/projects/[projectId]/assets error:', err);
    return NextResponse.json({ error: 'Failed to record asset metadata' }, { status: 500 });
  }
}
