'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { hasFeature, NAV_FEATURE_MAP, PlanFeatures } from '@/lib/planLimits'
import AIGeneratorModal from '@/components/AIGeneratorModal'

const navItems = [
    {
        group: 'OVERVIEW', items: [
            { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
            { href: '/dashboard/analytics', icon: '📊', label: 'Analytics' },
            { href: '/dashboard/reports', icon: '📑', label: 'Reports' },
        ]
    },
    {
        group: 'STUDENTS', items: [
            { href: '/dashboard/courses', icon: '🏫', label: 'Classes & Batches' },
            { href: '/dashboard/students', icon: '👨‍🎓', label: 'All Students' },
            { href: '/dashboard/students/add', icon: '➕', label: 'Add Student' },
            { href: '/dashboard/students/tc', icon: '📄', label: 'Generate TC' },
            { href: '/dashboard/attendance', icon: '✅', label: 'Attendance' },
        ]
    },
    {
        group: 'ACADEMICS', items: [
            { href: '/dashboard/mock-tests', icon: '📝', label: 'Mock Tests' },
            { href: '/dashboard/exams', icon: '📑', label: 'Exams & Marks' },
            { href: '/dashboard/admit-cards', icon: '🎫', label: 'Admit Cards' },
            { href: '/dashboard/ai-tools', icon: '🤖', label: 'AI Tools' },
        ]
    },
    {
        group: 'FINANCE', items: [
            { href: '/dashboard/fees', icon: '💰', label: 'Fee Management' },
            { href: '/dashboard/reports/fee-ledger', icon: '📒', label: 'Fee Ledger' },
            { href: '/dashboard/payments', icon: '💳', label: 'Payments / Receipts' },
            { href: '/dashboard/expenses', icon: '📉', label: 'Expenses' },
            { href: '/dashboard/accounts/ledger', icon: '📗', label: 'School Ledger' },
            { href: '/dashboard/accounts/pnl', icon: '📊', label: 'P&L Account' },
        ]
    },
    {
        group: 'MANAGEMENT', items: [
            { href: '/dashboard/teachers', icon: '👩‍🏫', label: 'Teachers & Staff' },
            { href: '/dashboard/leads', icon: '📈', label: 'Enquiry / Leads' },
            { href: '/dashboard/transport', icon: '🚌', label: 'Transport' },
            { href: '/dashboard/whatsapp', icon: '💬', label: 'WhatsApp' },
            { href: '/dashboard/notices', icon: '📢', label: 'Notices' },
        ]
    },
    {
        group: 'SETTINGS', items: [
            { href: '/dashboard/profile', icon: '🏢', label: 'School Profile' },
        ]
    },
]

// Navigation items allowed for sub-admin roles
const adminOperationNav = [
    {
        group: 'STUDENTS', items: [
            { href: '/dashboard/courses', icon: '🏫', label: 'Classes & Batches' },
            { href: '/dashboard/students', icon: '👨‍🎓', label: 'All Students' },
            { href: '/dashboard/students/add', icon: '➕', label: 'Add Student' },
            { href: '/dashboard/students/tc', icon: '📄', label: 'Generate TC' },
            { href: '/dashboard/attendance', icon: '✅', label: 'Attendance' },
        ]
    },
    {
        group: 'FINANCE', items: [
            { href: '/dashboard/fees', icon: '💰', label: 'Fee Management' },
            { href: '/dashboard/reports/fee-ledger', icon: '📒', label: 'Fee Ledger' },
            { href: '/dashboard/payments', icon: '💳', label: 'Payments' },
        ]
    },
    {
        group: 'MANAGEMENT', items: [
            { href: '/dashboard/teachers', icon: '👩‍🏫', label: 'Teachers & Staff' },
        ]
    },
]

const adminLibraryNav = [
    {
        group: 'LIBRARY', items: [
            { href: '/dashboard/library', icon: '📚', label: 'Library' },
        ]
    },
]

const adminSportsNav = [
    {
        group: 'SPORTS', items: [
            { href: '/dashboard/sports', icon: '🏆', label: 'Sports' },
        ]
    },
]

const adminTransportNav = [
    {
        group: 'TRANSPORT', items: [
            { href: '/dashboard/transport', icon: '🚌', label: 'Transport' },
        ]
    },
]

const getNavForRole = (role: string) => {
    if (role === 'SUPER_ADMIN' || role === 'COACHING_ADMIN') {
        const nav = JSON.parse(JSON.stringify(navItems))
        const overviewGroup = nav.find((g: any) => g.group === 'OVERVIEW')
        if (overviewGroup) {
            const analyticsIdx = overviewGroup.items.findIndex((item: any) => item.href === '/dashboard/analytics')
            overviewGroup.items.splice(analyticsIdx !== -1 ? analyticsIdx + 1 : overviewGroup.items.length, 0, { href: '/dashboard/super-admin/manage-admins', icon: '👥', label: 'Manage Admins' })
        }
        return nav
    }
    if (role === 'ADMIN_OPERATION') return adminOperationNav
    if (role === 'ADMIN_LIBRARY') return adminLibraryNav
    if (role === 'ADMIN_SPORTS') return adminSportsNav
    if (role === 'ADMIN_TRANSPORT') return adminTransportNav
    return navItems
}

function DashboardSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
    const pathname = usePathname()
    const { user, tenant, logout } = useAuth()
    const isSuperAdmin = user?.role === 'SUPER_ADMIN'
    const allNavItems = getNavForRole(user?.role || 'COACHING_ADMIN')

    return (
        <>
            {open && (
                <div 
                    onClick={onClose} 
                    style={{ 
                        position: 'fixed', 
                        inset: 0, 
                        background: 'rgba(0,0,0,0.7)', 
                        backdropFilter: 'blur(4px)',
                        zIndex: 2000 
                    }} 
                    className="hide-desktop" 
                />
            )}
            <aside className={`sidebar ${open ? 'open' : ''}`} style={{ zIndex: 2001 }}>
                {/* Logo & Close Button */}
                <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="sidebar-logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {isSuperAdmin ? '👑' : <img src="/logo.png" alt="RSS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>RSS Public School</div>
                            <div style={{ fontSize: '10px', color: '#10b981', fontWeight: '700', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {isSuperAdmin ? '⚡ SUPER ADMIN PORTAL' : (tenant?.name || 'School Management')}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="hide-desktop"
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: 'white',
                            borderRadius: '8px',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: 0,
                        }}
                        aria-label="Close menu"
                    >
                        ✕
                    </button>
                </div>

                {/* Nav */}
                <nav className="sidebar-nav" style={{ paddingBottom: '20px' }}>
                    {allNavItems.map((group: any) => (
                        <div key={group.group}>
                            <div className="sidebar-section-title">{group.group}</div>
                            {group.items.map((item: any) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                                    onClick={onClose}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                        <span style={{ fontSize: '16px' }}>{item.icon}</span>
                                        <span>{item.label}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ))}

                    {/* User info + Logout */}
                    <div style={{ padding: '14px 10px', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <div className="avatar" style={{ width: '34px', height: '34px', fontSize: '13px' }}>
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user?.role?.replace('_', ' ')}</div>
                            </div>
                        </div>
                        <button onClick={logout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '9px', fontSize: '13px' }}>
                            🚪 Logout
                        </button>
                    </div>
                </nav>
            </aside>
        </>
    )
}

function SuperAdminSwitcher({ token }: { token: string }) {
    const { user } = useAuth()
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [superAdmins, setSuperAdmins] = useState<any[]>([])
    const [switching, setSwitching] = useState<string | null>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!token) return
        fetch('/api/super-admin/switch-list', {
            headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()).then(d => {
            if (d.success) setSuperAdmins(d.superAdmins || [])
        }).catch(() => {})
    }, [token])

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    const handleSwitch = async (targetUserId: string) => {
        if (targetUserId === user?.id) { setOpen(false); return }
        setSwitching(targetUserId)
        try {
            const res = await fetch('/api/super-admin/switch-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ targetUserId }),
            })
            const data = await res.json()
            if (data.success) {
                localStorage.setItem('scalevo_token', data.accessToken)
                localStorage.setItem('scalevo_user', JSON.stringify(data.user))
                localStorage.setItem('scalevo_tenant', JSON.stringify(data.tenant))
                localStorage.setItem('scalevo_subscription', JSON.stringify(data.subscription))
                localStorage.setItem('scalevo_refresh', data.refreshToken)
                window.location.href = '/dashboard'
            }
        } catch {}
        setSwitching(null)
        setOpen(false)
    }

    if (superAdmins.length === 0) return null

    const currentAdmin = superAdmins.find(a => a.id === user?.id)
    const otherAdmin = superAdmins.find(a => a.id !== user?.id)

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '7px 12px',
                    background: open ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)',
                    border: '1px solid rgba(139,92,246,0.35)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                }}
            >
                <span style={{ fontSize: '16px' }}>👑</span>
                <span className="hide-mobile" style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentAdmin?.name || user?.name || 'Super Admin'}
                </span>
                <span style={{ fontSize: '11px', opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    background: 'var(--surface)',
                    border: '1px solid rgba(139,92,246,0.25)',
                    borderRadius: '14px',
                    padding: '8px',
                    minWidth: '280px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    zIndex: 9999,
                }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', padding: '6px 10px 10px' }}>Switch Super Admin Account</div>

                    {superAdmins.map(admin => {
                        const isCurrent = admin.id === user?.id
                        const isLoading = switching === admin.id
                        return (
                            <button
                                key={admin.id}
                                onClick={() => handleSwitch(admin.id)}
                                style={{
                                    width: '100%',
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: isCurrent ? '1px solid rgba(139,92,246,0.35)' : '1px solid transparent',
                                    background: isCurrent ? 'rgba(139,92,246,0.12)' : 'transparent',
                                    cursor: isCurrent ? 'default' : 'pointer',
                                    marginBottom: '4px',
                                    transition: 'all 0.2s',
                                    textAlign: 'left',
                                }}
                                onMouseEnter={e => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                                onMouseLeave={e => { if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                            >
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '50%',
                                    background: isCurrent ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'rgba(255,255,255,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '16px', flexShrink: 0,
                                    boxShadow: isCurrent ? '0 4px 12px rgba(139,92,246,0.35)' : 'none',
                                }}>👑</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin.name}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin.tenant?.name || 'School'}</div>
                                </div>
                                {isCurrent && (
                                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#a78bfa', background: 'rgba(139,92,246,0.15)', padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>Active</span>
                                )}
                                {!isCurrent && isLoading && (
                                    <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.6s linear infinite', flexShrink: 0 }} />
                                )}
                                {!isCurrent && !isLoading && (
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Switch →</span>
                                )}
                            </button>
                        )
                    })}

                    <div style={{ borderTop: '1px solid var(--border)', marginTop: '6px', paddingTop: '8px', padding: '10px 12px 4px' }}>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', lineHeight: '1.5', margin: 0 }}>
                            🔒 Yeh feature sirf Super Admin panel mein available hai.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

function DashboardHeader({ onMenuClick, onAiOpen }: { onMenuClick: () => void; onAiOpen: () => void }) {
    const pathname = usePathname()
    const { tenant, user, token } = useAuth()

    const getPageTitle = () => {
        const map: Record<string, string> = {
            '/dashboard': 'Dashboard',
            '/dashboard/analytics': 'Analytics',
            '/dashboard/students': 'Students',
            '/dashboard/students/add': 'Add Student',
            '/dashboard/students/tc': 'Transfer Certificate',
            '/dashboard/attendance': 'Attendance',
            '/dashboard/courses': 'Classes & Batches',
            '/dashboard/mock-tests': 'Mock Tests',
            '/dashboard/ai-tools': 'AI Tools',
            '/dashboard/fees': 'Fee Management',
            '/dashboard/payments': 'Payments',
            '/dashboard/expenses': 'Expenses',
            '/dashboard/teachers': 'Teachers & Staff',
            '/dashboard/leads': 'Enquiry / Leads',
            '/dashboard/whatsapp': 'WhatsApp Automation',
            '/dashboard/notices': 'Notices',
            '/dashboard/transport': 'Transport',
            '/dashboard/profile': 'School Profile',
            '/dashboard/reports': 'Reports',
            '/dashboard/reports/fee-ledger': 'Fee Ledger',
            '/dashboard/super-admin/manage-admins': 'Manage Admins',
        }
        return map[pathname] || 'Dashboard'
    }

    return (
        <header className="header" style={{ padding: '0 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flexShrink: 0 }}>
                {/* Mobile Hamburger Menu Button */}
                <button 
                    onClick={onMenuClick} 
                    className="hide-desktop" 
                    style={{ 
                        background: 'rgba(255,255,255,0.08)', 
                        border: '1px solid rgba(255,255,255,0.15)', 
                        color: 'var(--text-primary)', 
                        cursor: 'pointer', 
                        fontSize: '18px', 
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0
                    }} 
                    id="mobile-menu-btn"
                    aria-label="Open Super Admin Navigation Drawer"
                >
                    ☰
                </button>
                <div className="header-title-container" style={{ minWidth: 0 }}>
                    <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px', margin: 0 }}>
                        {getPageTitle()}
                    </h2>
                </div>
            </div>

            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end', padding: 0 }}>
                <button
                    onClick={onAiOpen}
                    className="btn btn-primary ai-btn hide-mobile"
                    style={{ background: 'linear-gradient(135deg, #1a5c38 0%, #0f3d26 100%)', border: 'none', gap: '6px', padding: '8px 14px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                >
                    ✨ AI Assistant
                </button>

                {/* Mobile Search Button */}
                <Link 
                    href="/dashboard/students" 
                    className="show-mobile"
                    style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '10px', 
                        background: 'var(--surface-2)', 
                        border: '1px solid var(--border)', 
                        display: 'none', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        textDecoration: 'none', 
                        fontSize: '15px',
                        flexShrink: 0
                    }}
                    title="Search Students"
                >
                    🔍
                </Link>

                {/* Desktop Global Student Search Bar */}
                <div
                    className="search-input-container hide-mobile"
                    style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-2)', padding: '6px 14px', borderRadius: '12px', border: '1px solid var(--border)', maxWidth: '280px', width: '100%', gap: '8px' }}
                >
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>🔍</span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search student..."
                        style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: '13px', width: '100%', cursor: 'text' }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const val = e.currentTarget.value;
                                if (val) {
                                    window.location.href = `/dashboard/students?search=${encodeURIComponent(val)}`;
                                }
                            }
                        }}
                    />
                </div>
            </div>

            <div className="header-user-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <div className="hide-mobile" style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                    Live
                </div>

                {/* Super Admin Switcher — only visible on desktop */}
                {user?.role === 'SUPER_ADMIN' && token && (
                    <div className="hide-mobile">
                        <SuperAdminSwitcher token={token} />
                    </div>
                )}

                <Link href="/dashboard/notices" style={{ position: 'relative', textDecoration: 'none' }}>
                    <div className="bell-icon" style={{ width: '36px', height: '36px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '15px' }}>
                        🔔
                    </div>
                </Link>
                <Link href="/dashboard/profile" style={{ textDecoration: 'none' }}>
                    <div className="avatar header-avatar" style={{ width: '36px', height: '36px', fontSize: '13px', borderRadius: '50%' }}>
                        {tenant?.name?.charAt(0) || user?.name?.charAt(0) || '👑'}
                    </div>
                </Link>
            </div>
        </header>
    )
}

function DashboardShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [aiModalOpen, setAiModalOpen] = useState(false)
    const [quickActionsOpen, setQuickActionsOpen] = useState(false)
    const { user, isLoading, logout } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login')
        }
    }, [user, isLoading, router, pathname])

    useEffect(() => {
        if (sidebarOpen || quickActionsOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [sidebarOpen, quickActionsOpen])

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px', margin: '0 auto 16px' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Loading RSS Public School Portal...</p>
                </div>
            </div>
        )
    }

    if (!user) return null

    const quickActionLinks = [
        { href: '/dashboard/students/add', label: 'Add Student', icon: '➕', color: '#10b981' },
        { href: '/dashboard/fees', label: 'Collect Fee', icon: '💰', color: '#f59e0b' },
        { href: '/dashboard/attendance', label: 'Attendance', icon: '✅', color: '#6366f1' },
        { href: '/dashboard/students/tc', label: 'Generate TC', icon: '📄', color: '#ec4899' },
        { href: '/dashboard/reports/fee-ledger', label: 'Fee Ledger', icon: '📒', color: '#3b82f6' },
        { href: '/dashboard/teachers', label: 'Teachers', icon: '👩‍🏫', color: '#8b5cf6' },
        { href: '/dashboard/transport', label: 'Transport', icon: '🚌', color: '#14b8a6' },
        { href: '/dashboard/super-admin/manage-admins', label: 'Manage Admins', icon: '👥', color: '#f97316' },
    ]

    return (
        <div>
            <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <DashboardHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} onAiOpen={() => setAiModalOpen(true)} />
            <main className="main-content" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                <div className="page-content fade-in" style={{ paddingBottom: '90px' }}>
                    {children}
                </div>
            </main>

            {/* Quick Actions Bottom Sheet Modal */}
            {quickActionsOpen && (
                <div 
                    onClick={() => setQuickActionsOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.75)',
                        backdropFilter: 'blur(6px)',
                        zIndex: 2500,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                    }}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: '520px',
                            background: '#111a0e',
                            borderTop: '2px solid rgba(26,92,56,0.4)',
                            borderRadius: '24px 24px 0 0',
                            padding: '20px 16px calc(24px + env(safe-area-inset-bottom, 0px))',
                            boxShadow: '0 -10px 40px rgba(0,0,0,0.7)',
                            animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                    >
                        <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 16px' }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '0 4px' }}>
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'white', margin: 0 }}>⚡ Quick Actions</h3>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Instant Super Admin Shortcuts</p>
                            </div>
                            <button 
                                onClick={() => setQuickActionsOpen(false)}
                                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                            {quickActionLinks.map(action => (
                                <Link
                                    key={action.href}
                                    href={action.href}
                                    onClick={() => setQuickActionsOpen(false)}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        padding: '12px 6px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        borderRadius: '14px',
                                        textDecoration: 'none',
                                        textAlign: 'center',
                                        gap: '6px',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '12px',
                                        background: `${action.color}18`,
                                        border: `1px solid ${action.color}40`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '18px',
                                    }}>
                                        {action.icon}
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                        {action.label}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Navigation Bar with Quick Action Button & Menu */}
            <nav 
                style={{
                    display: 'none',
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    width: '100%',
                    zIndex: 1000,
                    background: 'rgba(17, 26, 14, 0.96)',
                    backdropFilter: 'blur(20px)',
                    borderTop: '1px solid rgba(26, 92, 56, 0.35)',
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                    boxShadow: '0 -4px 25px rgba(0,0,0,0.6)',
                    height: '62px',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                }} 
                className="dashboard-bottom-nav"
            >
                {/* 1. Home */}
                <Link 
                    href="/dashboard" 
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                        textDecoration: 'none',
                        color: pathname === '/dashboard' ? '#10b981' : 'var(--text-muted)',
                        gap: '2px',
                    }}
                >
                    <span style={{ fontSize: '18px', lineHeight: 1 }}>🏠</span>
                    <span style={{ fontSize: '10px', fontWeight: pathname === '/dashboard' ? 700 : 500 }}>Home</span>
                </Link>

                {/* 2. Students */}
                <Link 
                    href="/dashboard/students" 
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                        textDecoration: 'none',
                        color: pathname.startsWith('/dashboard/students') ? '#10b981' : 'var(--text-muted)',
                        gap: '2px',
                    }}
                >
                    <span style={{ fontSize: '18px', lineHeight: 1 }}>👨‍🎓</span>
                    <span style={{ fontSize: '10px', fontWeight: pathname.startsWith('/dashboard/students') ? 700 : 500 }}>Students</span>
                </Link>

                {/* 3. Center Elevated Quick Action (+) Button */}
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <button
                        onClick={() => setQuickActionsOpen(!quickActionsOpen)}
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: '3px solid #111a0e',
                            boxShadow: '0 4px 16px rgba(16,185,129,0.5)',
                            color: 'white',
                            fontSize: '22px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            marginTop: '-22px',
                            transition: 'transform 0.15s ease',
                        }}
                        aria-label="Super Admin Quick Actions"
                    >
                        ⚡
                    </button>
                </div>

                {/* 4. Fees */}
                <Link 
                    href="/dashboard/fees" 
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                        textDecoration: 'none',
                        color: pathname.startsWith('/dashboard/fees') ? '#10b981' : 'var(--text-muted)',
                        gap: '2px',
                    }}
                >
                    <span style={{ fontSize: '18px', lineHeight: 1 }}>💰</span>
                    <span style={{ fontSize: '10px', fontWeight: pathname.startsWith('/dashboard/fees') ? 700 : 500 }}>Fees</span>
                </Link>

                {/* 5. Menu (Opens Super Admin Sidebar Drawer) */}
                <button
                    onClick={() => setSidebarOpen(true)}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 1,
                        background: 'none',
                        border: 'none',
                        color: sidebarOpen ? '#10b981' : 'var(--text-muted)',
                        gap: '2px',
                        cursor: 'pointer',
                        padding: 0,
                    }}
                    aria-label="Open Super Admin Menu Drawer"
                >
                    <span style={{ fontSize: '18px', lineHeight: 1 }}>☰</span>
                    <span style={{ fontSize: '10px', fontWeight: 600 }}>Menu</span>
                </button>
            </nav>
            <AIGeneratorModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} />
        </div>
    )
}

export function FeatureGate({ feature, children }: { feature: keyof PlanFeatures, children: React.ReactNode }) {
    // Feature gating disabled for UDBA
    return <>{children}</>
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <DashboardShell>{children}</DashboardShell>
        </AuthProvider>
    )
}
