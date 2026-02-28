import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (session.user as { id: string }).id
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, xp: true, level: true, notificationEmail: true, streakFreezes: true, activeTheme: true, achievements: { select: { type: true } } },
    })
    return NextResponse.json(user)
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const userId = (session.user as { id: string }).id
        const { notificationEmail, name, activeTheme } = await request.json()
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(notificationEmail !== undefined && { notificationEmail }),
                ...(name !== undefined && { name }),
                ...(activeTheme !== undefined && { activeTheme }),
            },
            select: { id: true, name: true, xp: true, level: true, notificationEmail: true, streakFreezes: true, activeTheme: true, achievements: true },
        })
        return NextResponse.json(user)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }
}
