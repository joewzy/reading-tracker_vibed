import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const bookId = searchParams.get('bookId')
    if (!bookId) return NextResponse.json({ error: 'Missing bookId' }, { status: 400 })

    const notes = await prisma.note.findMany({
        where: { bookId, userId: session.user.id },
        orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(notes)
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { bookId, content } = await request.json()
        if (!bookId || !content?.trim()) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

        const note = await prisma.note.create({
            data: { content: content.trim(), bookId, userId: session.user.id },
        })
        return NextResponse.json(note)
    } catch {
        return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await prisma.note.delete({ where: { id, userId: session.user.id } })
    return NextResponse.json({ success: true })
}
