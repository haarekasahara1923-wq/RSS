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
            {open && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1049 }} className="hide-desktop" />}
            <aside className={`sidebar ${open ? 'open' : ''}`}>
                {/* Logo */}
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {isSuperAdmin ? '👑' : <img src="/logo.png" alt="UDBA Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>RSS Public School</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {isSuperAdmin ? 'Super Admin' : (tenant?.name || 'School Management')}
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="sidebar-nav">
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                        <span style={{ fontSize: '16px' }}>{item.icon}</span>
                                        <span>{item.label}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ))}

                    {/* User info + Logout */}
                    <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{user?.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{user?.role?.replace('_', ' ')}</div>
                            </div>
                        </div>
                        <button onClick={logout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '8px', fontSize: '13px' }}>
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
        }
        return map[pathname] || 'Dashboard'
    }

    return (
        <header className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button onClick={onMenuClick} className="hide-desktop" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px', padding: '4px' }} id="mobile-menu-btn">
                    ☰
                </button>
                <div className="header-title-container">
                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{getPageTitle()}</h2>
                </div>
            </div>

            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, justifyContent: 'flex-end', padding: '0 16px' }}>
                <button
                    onClick={onAiOpen}
                    className="btn btn-primary ai-btn"
                    style={{ background: 'linear-gradient(135deg, #1a5c38 0%, #0f3d26 100%)', border: 'none', gap: '6px', padding: '8px 16px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                >
                    ✨ <span className="hide-mobile">AI Assistant</span>
                </button>
                {/* Global Student Search Bar */}
                <div
                    className="search-input-container"
                    style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-2)', padding: '6px 14px', borderRadius: '12px', border: '1px solid var(--border)', maxWidth: '300px', width: '100%', gap: '8px', cursor: 'pointer' }}
                    onClick={() => {
                        if (typeof window !== 'undefined' && window.innerWidth <= 768) {
                            window.location.href = '/dashboard/students';
                        }
                    }}
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
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </div>

            <div className="header-user-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="hide-mobile" style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                    Live
                </div>

                {/* Super Admin Switcher — only visible for SUPER_ADMIN */}
                {user?.role === 'SUPER_ADMIN' && token && (
                    <SuperAdminSwitcher token={token} />
                )}

                <Link href="/dashboard/leads" style={{ position: 'relative', textDecoration: 'none' }}>
                    <div className="bell-icon" style={{ padding: '8px', background: 'var(--surface-2)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '16px' }}>🔔</div>
                </Link>
                <Link href="/dashboard/profile">
                    <div className="avatar header-avatar">
                        {tenant?.name?.charAt(0) || 'U'}
                    </div>
                </Link>
            </div>

        </header>
    )
}

function DashboardShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [aiModalOpen, setAiModalOpen] = useState(false)
    const { user, isLoading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login')
        }
    }, [user, isLoading, router, pathname])

    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [sidebarOpen])

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

    const bottomNavItems = [
        { href: '/dashboard', label: 'Home', icon: '🏠' },
        { href: '/dashboard/students', label: 'Students', icon: '👨‍🎓' },
        { href: '/dashboard/fees', label: 'Fees', icon: '💰' },
        { href: '/dashboard/reports', label: 'Reports', icon: '📊' },
    ]

    const { logout } = useAuth()

    return (
        <div>
            <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <DashboardHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} onAiOpen={() => setAiModalOpen(true)} />
            <main className="main-content" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                <div className="page-content fade-in" style={{ paddingBottom: '80px' }}>
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation Bar */}
            <nav style={{
                display: 'none',
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                width: '100%',
                zIndex: 1000,
                background: 'var(--surface)',
                borderTop: '1px solid var(--border)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
            }} className="dashboard-bottom-nav">
                {bottomNavItems.map(item => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                    return (
                        <Link key={item.href} href={item.href} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: 1,
                            padding: '8px 4px',
                            textDecoration: 'none',
                            color: isActive ? 'var(--primary-light)' : 'var(--text-muted)',
                            gap: '3px',
                            transition: 'color 0.2s',
                        }}>
                            <span style={{ fontSize: '20px', lineHeight: 1 }}>{item.icon}</span>
                            <span style={{ fontSize: '10px', fontWeight: isActive ? 600 : 400, letterSpacing: '0.3px' }}>{item.label}</span>
                            {isActive && (
                                <span style={{
                                    position: 'absolute',
                                    top: 0,
                                    width: '24px',
                                    height: '2px',
                                    background: 'var(--primary)',
                                    borderRadius: '0 0 2px 2px',
                                }} />
                            )}
                        </Link>
                    )
                })}
                {/* Logout Button in Bottom Nav */}
                <button onClick={logout} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    padding: '8px 4px',
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    gap: '3px',
                    cursor: 'pointer',
                }}>
                    <span style={{ fontSize: '20px', lineHeight: 1 }}>🚪</span>
                    <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.3px' }}>Logout</span>
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
