import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const FREEZE_PRICE = 500 // XP cost per freeze

export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const userId = (session.user as any).id
        const user = await (prisma as any).user.findUnique({
            where: { id: userId },
            select: { xp: true, streakFreezes: true }
        })

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
        if (user.xp < FREEZE_PRICE) return NextResponse.json({ error: 'Insufficient XP' }, { status: 400 })

        const updatedUser = await (prisma as any).user.update({
            where: { id: userId },
            data: {
                xp: { decrement: FREEZE_PRICE },
                streakFreezes: { increment: 1 }
            },
            select: { xp: true, streakFreezes: true }
        })

        return NextResponse.json({ success: true, xp: updatedUser.xp, streakFreezes: updatedUser.streakFreezes })
    } catch (err) {
        return NextResponse.json({ error: 'Failed to complete purchase' }, { status: 500 })
    }
}
