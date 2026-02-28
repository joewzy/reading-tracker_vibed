import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5&printType=books`
        )

        if (!response.ok) {
            throw new Error('Google Books API responded with an error')
        }

        const data = await response.json()

        interface GoogleBookItem {
            id: string;
            volumeInfo: {
                title: string;
                authors?: string[];
                description?: string;
                pageCount?: number;
                imageLinks?: { thumbnail?: string };
            }
        }

        // Transform the data to a simpler format for our UI
        const results = data.items?.map((item: GoogleBookItem) => ({
            id: item.id,
            title: item.volumeInfo.title,
            author: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
            description: item.volumeInfo.description || '',
            totalPages: item.volumeInfo.pageCount || 0,
            coverImage: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
        })) || []

        return NextResponse.json(results)
    } catch (error) {
        console.error('Book search error:', error)
        return NextResponse.json({ error: 'Failed to fetch books' }, { status: 500 })
    }
}
