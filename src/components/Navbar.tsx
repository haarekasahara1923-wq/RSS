'use client'

import { ShoppingCart, Download, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)

  const updateCartCount = () => {
    try {
      const cart = JSON.parse(localStorage.getItem('gyankosh_cart') || '[]')
      setCartCount(cart.length)
    } catch (e) { setCartCount(0) }
  }

  useEffect(() => {
    updateCartCount()
    window.addEventListener('gyankosh_cart_updated', updateCartCount)
    return () => window.removeEventListener('gyankosh_cart_updated', updateCartCount)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(15,15,26,0.9)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)', padding: '0 24px',
      height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
        <div style={{
          width: '36px', height: '36px',
          background: 'linear-gradient(135deg, #6366f1, #ec4899)',
          borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
        }}>🎓</div>
        <span style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>Coach<span style={{ color: '#818cf8' }}>Pro</span></span>
      </Link>

      <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <Link href="/#features" style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500', textDecoration: 'none' }}>Features</Link>
        <Link href="/#pricing" style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500', textDecoration: 'none' }}>Pricing</Link>
        <Link href="/gyankosh" style={{ color: '#10b981', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>Gyankosh</Link>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link href="/gyankosh/cart" style={{ position: 'relative', color: 'white', display: 'flex', alignItems: 'center' }}>
          <ShoppingCart size={22} />
          {cartCount > 0 && (
            <span style={{
              position: 'absolute', top: '-10px', right: '-10px',
              background: '#ef4444', color: 'white', fontSize: '10px',
              width: '18px', height: '18px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
            }}>{cartCount}</span>
          )}
        </Link>



        <div className="hide-mobile" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href="/login" style={{ color: 'white', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>Login</Link>
          <Link href="/register" style={{ 
            padding: '8px 18px', fontSize: '13px', background: 'var(--primary)', 
            color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none' 
          }}>Join Now 🚀</Link>
        </div>

        <div className="show-mobile" style={{ display: 'none', alignItems: 'center' }}>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ 
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', 
              color: 'white', padding: '8px', borderRadius: '8px', cursor: 'pointer' 
          }}>
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div style={{
          position: 'fixed', top: '64px', left: 0, right: 0, zIndex: 99,
          background: 'var(--surface)', borderBottom: '1px solid var(--border)',
          padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
        }}>
          <Link href="/#features" onClick={() => setMobileMenuOpen(false)} style={{ color: 'white', textDecoration: 'none' }}>Features</Link>
          <Link href="/#pricing" onClick={() => setMobileMenuOpen(false)} style={{ color: 'white', textDecoration: 'none' }}>Pricing</Link>
          <Link href="/gyankosh" onClick={() => setMobileMenuOpen(false)} style={{ color: '#10b981', textDecoration: 'none', fontWeight: 'bold' }}>Gyankosh</Link>
          <Link href="/login" onClick={() => setMobileMenuOpen(false)} style={{ color: 'white', textDecoration: 'none' }}>Login</Link>
          <Link href="/register" onClick={() => setMobileMenuOpen(false)} style={{ color: 'white', textDecoration: 'none', background: 'var(--primary)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>Register</Link>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </nav>
  )
}
