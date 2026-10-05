'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react'
import Navbar from '@/components/Navbar'

export default function CartPage() {
    const [cart, setCart] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadCart()
    }, [])

    const loadCart = () => {
        try {
            const data = JSON.parse(localStorage.getItem('gyankosh_cart') || '[]')
            setCart(data)
        } catch (e) {
            setCart([])
        }
        setLoading(false)
    }

    const removeFromCart = (index: number) => {
        const newCart = [...cart]
        newCart.splice(index, 1)
        localStorage.setItem('gyankosh_cart', JSON.stringify(newCart))
        setCart(newCart)
        window.dispatchEvent(new Event('gyankosh_cart_updated'))
    }

    const calculateTotal = () => {
        return cart.reduce((total, item) => {
            const mainPrice = item.price
            const bumpsPrice = (item.bumps || []).reduce((sum: number, b: any) => sum + b.discountedPrice, 0)
            return total + mainPrice + bumpsPrice
        }, 0)
    }

    if (loading) return null

    const total = calculateTotal()

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color, #0f0f1a)', color: 'white', fontFamily: 'Inter, sans-serif' }}>
            <Navbar />

            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '100px 24px 40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                    <ShoppingBag size={28} style={{ color: '#10b981' }} />
                    <h1 style={{ fontSize: '32px', fontWeight: '800' }}>Your Shoping Cart</h1>
                </div>

                {cart.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 24px', background: 'var(--surface, #1e1e2e)', borderRadius: '24px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🛒</div>
                        <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>Your cart is empty</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Looks like you haven't added any premium study materials yet.</p>
                        <Link href="/gyankosh" style={{ 
                            padding: '12px 32px', background: '#10b981', color: 'white', 
                            textDecoration: 'none', borderRadius: '12px', fontWeight: 'bold', display: 'inline-block' 
                        }}>
                            Browse Store
                        </Link>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' }} className="cart-grid">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {cart.map((item, idx) => {
                                const bumpsTotal = (item.bumps || []).reduce((sum: number, b: any) => sum + b.discountedPrice, 0)
                                return (
                                    <motion.div 
                                        layout
                                        key={`${item.productId}-${idx}`}
                                        style={{ 
                                            background: 'var(--surface, #1e1e2e)', borderRadius: '20px', 
                                            padding: '20px', border: '1px solid var(--border)',
                                            display: 'flex', gap: '20px', alignItems: 'center'
                                        }}>
                                        <img src={item.imageUrl} style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover' }} />
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{item.title}</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {item.bumps && item.bumps.length > 0 && (
                                                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
                                                        + {item.bumps.length} Order Bump{item.bumps.length > 1 ? 's' : ''} added
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '16px', fontWeight: '800', color: '#10b981' }}>
                                                    ₹{item.price + bumpsTotal}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => removeFromCart(idx)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
                                            <Trash2 size={20} />
                                        </button>
                                    </motion.div>
                                )
                            })}
                            
                            <Link href="/gyankosh" style={{ color: '#10b981', textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                                ➕ Add more products
                            </Link>
                        </div>

                        <div style={{ position: 'sticky', top: '100px', height: 'fit-content' }}>
                            <div style={{ background: 'var(--surface, #1e1e2e)', borderRadius: '24px', padding: '24px', border: '1px solid var(--border)' }}>
                                <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px' }}>Order Summary</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                        <span>Subtotal ({cart.length} items)</span>
                                        <span>₹{total}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                        <span>Taxes</span>
                                        <span>₹0</span>
                                    </div>
                                    <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }}></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: '800', color: 'white' }}>
                                        <span>Total</span>
                                        <span style={{ color: '#10b981' }}>₹{total}</span>
                                    </div>
                                </div>

                                <Link href="/gyankosh/checkout/cart" style={{ 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    width: '100%', padding: '16px', background: '#10b981', color: 'white', 
                                    textDecoration: 'none', borderRadius: '16px', fontWeight: 'bold', fontSize: '18px',
                                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)'
                                }}>
                                    Secure Checkout <ArrowRight size={20} />
                                </Link>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                    <ShieldCheck size={16} /> Secure Payment Gateway
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                @media (max-width: 768px) {
                    .cart-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    )
}
