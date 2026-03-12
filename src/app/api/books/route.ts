import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const books = await prisma.book.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            include: { sessions: true },
        })
        return NextResponse.json(books)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const json = await request.json()
        const { title, author, totalPages } = json

        if (!title || !author || !totalPages) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const book = await prisma.book.create({
            data: {
                title,
                author,
                totalPages: parseInt(totalPages),
                userId: session.user.id,
            },
        })

        return NextResponse.json(book)
    } catch (error: any) {
        console.error("DEBUG BOOK CREATION ERROR:", error)
        return NextResponse.json({ error: 'Failed to create book', details: error?.message || String(error) }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) return NextResponse.json({ error: 'Missing book ID' }, { status: 400 })

        await prisma.book.delete({
            where: { id, userId: session.user.id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 })
    }
}
