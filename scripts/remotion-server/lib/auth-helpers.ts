// lib/auth-helpers.ts
import { cookies } from "next/headers"
import { verifyJWT, signJWT } from "./crypto"

export interface SessionUser {
    id: string;
    email: string;
    role: 'admin' | 'user';
    status: 'pending' | 'approved' | 'rejected' | 'blocked';
    full_name?: string;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('darktube_session')?.value
        if (!token) return null
        return await verifyJWT(token) as SessionUser | null
    } catch (error) {
        console.error("Error retrieving user from session cookie:", error)
        return null
    }
}

export async function createSession(user: SessionUser) {
    const token = await signJWT(user)
    const cookieStore = await cookies()
    cookieStore.set('darktube_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/'
    })
}

export async function deleteSession() {
    const cookieStore = await cookies()
    cookieStore.delete('darktube_session')
}
