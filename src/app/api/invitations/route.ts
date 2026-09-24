import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/requireUser';
import { memberService } from '@/server/members/member.service';

export async function GET() {
  try {
    const user = await requireUser();
    if (!user.email) {
      return NextResponse.json({ invitations: [] });
    }

    const invitations = await memberService.listUserPendingInvitations(user.email);
    return NextResponse.json({ invitations });
  } catch (err: any) {
    if (err?.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('GET /api/invitations error:', err);
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }
}
