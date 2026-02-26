import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const book = await prisma.book.findUnique({
            where: { id },
            include: { sessions: true },
        })

        if (!book) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 })
        }

        return NextResponse.json(book)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch book' }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const json = await request.json()
        const book = await prisma.book.update({
            where: { id },
            data: json,
        })
        return NextResponse.json(book)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update book' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.book.delete({
            where: { id },
        })
        return new NextResponse(null, { status: 204 })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 })
    }
}
