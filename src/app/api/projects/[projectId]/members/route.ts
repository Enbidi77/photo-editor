import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess } from '@/lib/auth/requireProjectAccess';
import { memberService } from '@/server/members/member.service';
import { inviteMemberSchema } from '@/lib/validation/member';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId, 'viewer');

    const members = await memberService.listMembers(projectId);
    return NextResponse.json({ members });
  } catch (err: any) {
    if (err?.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (err?.name === 'ForbiddenError' || err?.name === 'NotFoundError') {
      return NextResponse.json({ error: err.message }, { status: err?.name === 'NotFoundError' ? 404 : 403 });
    }
    console.error('GET /api/projects/[projectId]/members error:', err);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const { user } = await requireProjectAccess(projectId, 'editor');

    const body = await req.json();
    const validated = inviteMemberSchema.parse(body);

    const result = await memberService.addOrInviteMember(projectId, validated.email, validated.role, user.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to invite member' }, { status: 400 });
    }
    return NextResponse.json(result);
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
    console.error('POST /api/projects/[projectId]/members error:', err);
    return NextResponse.json({ error: 'Failed to invite member' }, { status: 500 });
  }
}
