import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAccess } from '@/lib/auth/requireProjectAccess';
import { memberService } from '@/server/members/member.service';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId, 'editor');

    const invites = await memberService.listProjectInvites(projectId);
    return NextResponse.json({ invites });
  } catch (err: any) {
    if (err?.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (err?.name === 'ForbiddenError' || err?.name === 'NotFoundError') {
      return NextResponse.json({ error: err.message }, { status: err?.name === 'NotFoundError' ? 404 : 403 });
    }
    console.error('GET /api/projects/[projectId]/invites error:', err);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    await requireProjectAccess(projectId, 'owner');

    const { searchParams } = new URL(req.url);
    const inviteId = searchParams.get('inviteId');

    if (!inviteId) {
      return NextResponse.json({ error: 'inviteId is required' }, { status: 400 });
    }

    await memberService.cancelProjectInvite(projectId, inviteId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (err?.name === 'ForbiddenError' || err?.name === 'NotFoundError') {
      return NextResponse.json({ error: err.message }, { status: err?.name === 'NotFoundError' ? 404 : 403 });
    }
    console.error('DELETE /api/projects/[projectId]/invites error:', err);
    return NextResponse.json({ error: 'Failed to cancel invite' }, { status: 500 });
  }
}
