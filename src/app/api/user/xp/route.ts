import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { amount, reason } = await req.json()
        const userId = (session.user as { id: string }).id
        
        if (!amount || typeof amount !== 'number') {
            return NextResponse.json({ error: 'Invalid XP amount' }, { status: 400 })
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { xp: { increment: amount } },
            select: { xp: true, level: true, achievements: true }
        })

        // Simplistic level up check
        const XP_PER_LEVEL = 200
        const newLevel = Math.floor(user.xp / XP_PER_LEVEL) + 1
        let updatedUser = user

        if (newLevel > user.level) {
            updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { level: newLevel },
                select: { xp: true, level: true, achievements: true }
            })
        }

        return NextResponse.json({ success: true, user: updatedUser, reason })
    } catch (error: any) {
        console.error('XP Reward Error:', error)
        return NextResponse.json({ error: 'Failed to add XP', details: error.message }, { status: 500 })
    }
}
