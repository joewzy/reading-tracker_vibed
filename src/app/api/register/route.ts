import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
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
        return NextResponse.json({ error: 'Internal Server Error', detail: message }, { status: 500 })
    }
}

