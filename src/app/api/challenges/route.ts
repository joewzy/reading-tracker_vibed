import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()

    const userId = (session.user as {id: string}).id

    // Get active challenges from library
    const activeChallenges = await prisma.challenge.findMany({
        where: {
            startDate: { lte: now },
            endDate: { gte: now },
        },
        include: {
            users: {
                where: { userId: userId }
            }
        }
    })

    return NextResponse.json(activeChallenges)
}
