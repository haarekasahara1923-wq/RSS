'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
    id: string
    name: string
    email: string
    role: string
    tenantId: string
    phone?: string
    studentId?: string
}

interface Tenant {
    id: string
    name: string
    logo?: string
    themeColor: string
    phone?: string
    email?: string
    address?: string
    schoolCode?: string
    directorSign?: string
}

interface Subscription {
    plan: string
    status: string
    trialEndsAt?: string
    amount?: number
}

interface AuthContextType {
    user: User | null
    tenant: Tenant | null
    subscription: Subscription | null
    token: string | null
    login: (email: string, password: string, role?: string, tenantId?: string) => Promise<{ success: boolean; error?: string }>
    logout: () => void
    handleUnauthorized: () => void
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [tenant, setTenant] = useState<Tenant | null>(null)
    const [subscription, setSubscription] = useState<Subscription | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Support both scalevo_ (new) and udba_ (legacy) keys for smooth migration
        const storedToken = localStorage.getItem('scalevo_token') || localStorage.getItem('udba_token')
        const storedUser = localStorage.getItem('scalevo_user') || localStorage.getItem('udba_user')
        const storedTenant = localStorage.getItem('scalevo_tenant') || localStorage.getItem('udba_tenant')
        const storedSub = localStorage.getItem('scalevo_subscription') || localStorage.getItem('udba_subscription')

        if (storedToken && storedUser) {
            setToken(storedToken)
            setUser(JSON.parse(storedUser))
            if (storedTenant) setTenant(JSON.parse(storedTenant))
            if (storedSub) setSubscription(JSON.parse(storedSub))
        }
        setIsLoading(false)
    }, [])

    const login = async (email: string, password: string, role?: string, tenantId?: string) => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role, tenantId }),
            })
            const data = await res.json()

            if (!data.success) {
                return { success: false, error: data.error || 'Login failed' }
            }

            setToken(data.accessToken)
            setUser(data.user)
            setTenant(data.tenant)
            setSubscription(data.subscription)

            localStorage.setItem('scalevo_token', data.accessToken)
            localStorage.setItem('scalevo_user', JSON.stringify(data.user))
            localStorage.setItem('scalevo_tenant', JSON.stringify(data.tenant))
            localStorage.setItem('scalevo_subscription', JSON.stringify(data.subscription))
            localStorage.setItem('scalevo_refresh', data.refreshToken)

            return { success: true }
        } catch {
            return { success: false, error: 'Network error' }
        }
    }

    const logout = () => {
        setUser(null)
        setTenant(null)
        setSubscription(null)
        setToken(null)
        // Clear both new and legacy keys
        localStorage.removeItem('scalevo_token')
        localStorage.removeItem('scalevo_user')
        localStorage.removeItem('scalevo_tenant')
        localStorage.removeItem('scalevo_subscription')
        localStorage.removeItem('scalevo_refresh')
        localStorage.removeItem('udba_token')
        localStorage.removeItem('udba_user')
        localStorage.removeItem('udba_tenant')
        localStorage.removeItem('udba_subscription')
        localStorage.removeItem('udba_refresh')
        window.location.href = '/login'
    }

    // Call this when any API returns 401 — clears stale token and redirects to login
    const handleUnauthorized = () => {
        setUser(null)
        setTenant(null)
        setSubscription(null)
        setToken(null)
        localStorage.removeItem('scalevo_token')
        localStorage.removeItem('scalevo_user')
        localStorage.removeItem('scalevo_tenant')
        localStorage.removeItem('scalevo_subscription')
        localStorage.removeItem('scalevo_refresh')
        localStorage.removeItem('udba_token')
        localStorage.removeItem('udba_user')
        localStorage.removeItem('udba_tenant')
        localStorage.removeItem('udba_subscription')
        localStorage.removeItem('udba_refresh')
        window.location.href = '/login'
    }

    return (
        <AuthContext.Provider value={{ user, tenant, subscription, token, login, logout, handleUnauthorized, isLoading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}

export function useApi() {
    const { token } = useAuth()

    const fetcher = async (url: string, options?: RequestInit) => {
        const res = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...options?.headers,
            },
        })
        return res.json()
    }

    return { fetcher }
}
