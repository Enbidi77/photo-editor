import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess } from '@/lib/auth/requireProjectAccess';
import { operationService } from '@/server/operations/operation.service';
import { batchOperationsSchema } from '@/lib/validation/operation';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId, 'viewer');

    const searchParams = req.nextUrl.searchParams;
    const after = parseInt(searchParams.get('afterSequence') || '0', 10);

    const ops = await operationService.getRecentOperations(projectId, after);
    return NextResponse.json({ operations: ops });
  } catch (err: any) {
    if (err?.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (err?.name === 'ForbiddenError' || err?.name === 'NotFoundError') {
      return NextResponse.json({ error: err.message }, { status: err?.name === 'NotFoundError' ? 404 : 403 });
    }
    console.error('GET /api/projects/[projectId]/operations error:', err);
    return NextResponse.json({ error: 'Failed to fetch operations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const { user } = await requireProjectAccess(projectId, 'editor');

    const body = await req.json();
    const validated = batchOperationsSchema.parse(body);

    await operationService.persistBatchOperations(
      projectId,
      user.id,
      validated.operations
    );

    return NextResponse.json({ success: true });
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
    console.error('POST /api/projects/[projectId]/operations error:', err);
    return NextResponse.json({ error: 'Failed to persist operations' }, { status: 500 });
  }
}
