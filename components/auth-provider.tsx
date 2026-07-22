"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUserAction, logoutAction } from "@/app/actions"

type AuthUser = {
    id: string
    email: string
    role: 'admin' | 'user'
    status: 'pending' | 'approved' | 'rejected' | 'blocked'
    full_name?: string
    avatar_url?: string
}

type AuthSession = {
    user: {
        id: string
        email: string
        user_metadata: {
            full_name: string
            avatar_url: string
            picture: string
        }
    }
}

type AuthContextType = {
    user: AuthUser | null
    session: AuthSession | null
    profile: AuthUser | null
    loading: boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [session, setSession] = useState<AuthSession | null>(null)
    const [profile, setProfile] = useState<AuthUser | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const fetchUser = async () => {
        try {
            const currentUser = await getCurrentUserAction() as AuthUser | null
            if (currentUser) {
                setUser(currentUser)
                setProfile(currentUser)
                setSession({
                    user: {
                        id: currentUser.id,
                        email: currentUser.email,
                        user_metadata: {
                            full_name: currentUser.full_name || '',
                            avatar_url: currentUser.avatar_url || '',
                            picture: currentUser.avatar_url || '',
                        }
                    }
                })
            } else {
                setUser(null)
                setProfile(null)
                setSession(null)
            }
        } catch (error) {
            console.error("Error fetching current user in AuthProvider:", error)
            setUser(null)
            setProfile(null)
            setSession(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUser()
        
        // Listen to window focus/visibility events to keep session in sync
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchUser()
            }
        }
        
        window.addEventListener('focus', fetchUser)
        document.addEventListener('visibilitychange', handleVisibilityChange)
        
        return () => {
            window.removeEventListener('focus', fetchUser)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [])

    const signOut = async () => {
        await logoutAction()
        setUser(null)
        setProfile(null)
        setSession(null)
        router.push('/login')
    }

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
