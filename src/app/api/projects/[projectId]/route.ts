import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess } from '@/lib/auth/requireProjectAccess';
import { projectService } from '@/server/projects/project.service';
import { updateProjectSchema } from '@/lib/validation/project';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const { role, project } = await requireProjectAccess(projectId, 'viewer');
    return NextResponse.json({ project, role });
  } catch (err: any) {
    if (err?.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (err?.name === 'NotFoundError') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (err?.name === 'ForbiddenError') {
      return NextResponse.json({ error: err.message || 'Access denied' }, { status: 403 });
    }
    console.error('GET /api/projects/[projectId] error:', err);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId, 'editor');

    const body = await req.json();
    const validated = updateProjectSchema.parse(body);

    const updated = await projectService.updateProject(projectId, validated);
    return NextResponse.json({ project: updated });
  } catch (err: any) {
    if (err?.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (err?.name === 'NotFoundError') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (err?.name === 'ForbiddenError') {
      return NextResponse.json({ error: err.message || 'Access denied' }, { status: 403 });
    }
    if (err?.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 });
    }
    console.error('PATCH /api/projects/[projectId] error:', err);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId, 'owner');

    await projectService.deleteProject(projectId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (err?.name === 'NotFoundError') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (err?.name === 'ForbiddenError') {
      return NextResponse.json({ error: err.message || 'Access denied' }, { status: 403 });
    }
    console.error('DELETE /api/projects/[projectId] error:', err);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
