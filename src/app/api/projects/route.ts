import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/requireUser';
import { projectService } from '@/server/projects/project.service';
import { createProjectSchema } from '@/lib/validation/project';

export async function GET() {
  try {
    const user = await requireUser();
    const projects = await projectService.listUserProjects(user.id);
    return NextResponse.json({ projects });
  } catch (err: any) {
    if (err?.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('GET /api/projects error:', err);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const validated = createProjectSchema.parse(body);

    const created = await projectService.createProject(user.id, validated);
    return NextResponse.json({ project: created }, { status: 201 });
  } catch (err: any) {
    if (err?.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (err?.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid project data', details: err.errors }, { status: 400 });
    }
    console.error('POST /api/projects error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create project' }, { status: 500 });
  }
}
