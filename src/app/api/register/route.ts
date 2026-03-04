import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

// Simple in-memory rate limiter: max 5 signup attempts per IP per 15 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5
const WINDOW_MS = 15 * 60 * 1000

function getRateLimit(ip: string) {
    const now = Date.now()
    const entry = rateLimitMap.get(ip)

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
        return { allowed: true }
    }

    if (entry.count >= RATE_LIMIT) {
        return { allowed: false }
    }

    entry.count++
    return { allowed: true }
}

export async function POST(request: Request) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const { allowed } = getRateLimit(ip)

    if (!allowed) {
        return NextResponse.json(
            { error: 'Too many signup attempts. Please try again later.' },
            { status: 429 }
        )
    }

    try {
        const { name, email, password } = await request.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 })
        }

        const hashedPassword = await bcrypt.hash(password, 12)

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            }
        })

        return NextResponse.json({ message: 'User created successfully', userId: user.id })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('Registration error:', message)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}


