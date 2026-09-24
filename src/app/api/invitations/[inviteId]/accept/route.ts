import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/requireUser';
import { memberService } from '@/server/members/member.service';

interface RouteParams {
  params: Promise<{ inviteId: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireUser();
    if (!user.email) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    const { inviteId } = await params;
    const result = await memberService.acceptInvitation(inviteId, user.id, user.email);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to accept invitation' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    if (err?.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('POST /api/invitations/[inviteId]/accept error:', err);
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
  }
}
