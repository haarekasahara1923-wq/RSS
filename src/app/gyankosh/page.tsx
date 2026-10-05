'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Share2 } from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default function GyankoshMarketplace() {
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedProduct, setSelectedProduct] = useState<any>(null)
    const [showBumpModal, setShowBumpModal] = useState(false)
    const [selectedBumps, setSelectedBumps] = useState<string[]>([])

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/marketplace/products')
            const data = await res.json()
            if (data.products) setProducts(data.products)
            setLoading(false)
        } catch (error) { console.error(error); setLoading(false) }
    }

    const addToCart = (product: any, bumpIds: string[] = []) => {
        try {
            const currentCart = JSON.parse(localStorage.getItem('gyankosh_cart') || '[]')
            
            // Check if product already exists with same bumps, or just update it
            const existingIndex = currentCart.findIndex((item: any) => item.productId === product.id)
            if (existingIndex > -1) {
                currentCart[existingIndex].orderBumpIds = bumpIds
            } else {
                currentCart.push({ 
                    productId: product.id, 
                    orderBumpIds: bumpIds,
                    title: product.title,
                    price: product.price - (product.price * (product.discount / 100)),
                    imageUrl: product.imageUrl,
                    bumps: product.orderBumps?.filter((b: any) => bumpIds.includes(b.id)) 
                })
            }
            
            localStorage.setItem('gyankosh_cart', JSON.stringify(currentCart))
            window.dispatchEvent(new Event('gyankosh_cart_updated'))
            alert(`${product.title} added to cart!`)
            setShowBumpModal(false)
        } catch (e) { console.error(e) }
    }

    const handleBuyNow = (product: any) => {
        if (product.orderBumps && product.orderBumps.length > 0) {
            setSelectedProduct(product)
            setSelectedBumps([])
            setShowBumpModal(true)
        } else {
            addToCart(product)
            window.location.href = '/gyankosh/cart'
        }
    }

    const proceedToCheckout = () => {
        addToCart(selectedProduct, selectedBumps)
        window.location.href = '/gyankosh/cart'
    }

    const filteredProducts = products.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color, #0f0f1a)', color: 'white', fontFamily: 'Inter, sans-serif' }}>
            <Navbar />

            {/* Hero Section */}
            <div style={{
                background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 15, 26, 0) 100%)',
                padding: '80px 24px 40px', textAlign: 'center'
            }}>
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: '800', marginBottom: '16px', background: 'linear-gradient(135deg, #fff 0%, #a5f3fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Gyankosh Digital Store
                </motion.h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '18px', maxWidth: '600px', margin: '0 auto 32px' }}>
                    Premium study materials, notes, and digital resources for your educational success.
                </p>

                {/* Search & Action Bar */}
                <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', flex: '1', minWidth: '280px' }}>
                        <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search products, notes, categories..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                width: '100%', padding: '14px 14px 14px 48px', borderRadius: '12px',
                                background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'white', fontSize: '16px', outline: 'none', transition: 'border-color 0.2s'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px' }}>Loading marketplace...</div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '24px'
                    }} className="mobile-grid">
                        {filteredProducts.map((product) => {
                            const finalPrice = product.price - (product.price * (product.discount / 100))
                            const hasBonuses = product.bonuses && product.bonuses.length > 0

                            return (
                                <motion.div
                                    key={product.id}
                                    whileHover={{ y: -5 }}
                                    onClick={() => setSelectedProduct(product)}
                                    style={{
                                        background: 'var(--surface, #1e1e2e)', borderRadius: '16px', overflow: 'hidden',
                                        border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column',
                                        cursor: 'pointer', position: 'relative'
                                    }}>
                                    
                                    {hasBonuses && (
                                        <div style={{ 
                                            position: 'absolute', top: '12px', right: '12px', zIndex: 10,
                                            background: '#10b981', color: 'white', padding: '4px 10px', 
                                            borderRadius: '20px', fontSize: '10px', fontWeight: 'bold',
                                            boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                                        }}>
                                            🎁 +{product.bonuses.length} FREE BONUSES
                                        </div>
                                    )}

                                    <div style={{ height: '200px', position: 'relative', overflow: 'hidden' }}>
                                        <img src={product.imageUrl || 'https://via.placeholder.com/400x200'}
                                            alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <div style={{ padding: '16px', flex: '1', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600', marginBottom: '4px' }}>{product.category.replace('_', ' ')}</div>
                                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'white' }}>{product.title}</h3>
                                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {product.description}
                                        </p>

                                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div>
                                                    {product.discount > 0 && <span style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'line-through', marginRight: '8px' }}>₹{product.price}</span>}
                                                    <span style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>₹{finalPrice}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                                                    style={{
                                                        flex: 1, background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)', 
                                                        padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '12px'
                                                    }}>
                                                    Add to Cart
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleBuyNow(product); }}
                                                    style={{
                                                        flex: 1, background: '#10b981', color: 'white', border: 'none', 
                                                        padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px'
                                                    }}>
                                                    Buy Now
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Product Detail Modal */}
            <AnimatePresence>
                {selectedProduct && !showBumpModal && (
                    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setSelectedProduct(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: '#1e1e2e', width: '90%', maxWidth: '800px', borderRadius: '24px',
                                overflow: 'hidden', position: 'relative', maxHeight: '90vh', display: 'flex', flexDirection: 'column'
                            }}>
                            <button onClick={() => setSelectedProduct(null)} style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>

                            <div style={{ overflowY: 'auto', padding: '32px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }} className="modal-grid">
                                    <div>
                                        <img src={selectedProduct.imageUrl} style={{ width: '100%', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} />
                                        <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <h4 style={{ color: '#10b981', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>SHARE THIS PRODUCT</h4>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <input readOnly value={`${window.location.origin}/gyankosh/checkout/${selectedProduct.id}`} style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: 'none', color: 'var(--text-muted)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' }} />
                                                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/gyankosh/checkout/${selectedProduct.id}`); alert('Link copied!'); }} style={{ background: '#10b981', border: 'none', color: 'white', padding: '0 12px', borderRadius: '8px', cursor: 'pointer' }}><Share2 size={16} /></button>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '14px', color: '#10b981', fontWeight: '700' }}>{selectedProduct.category.replace('_', ' ')}</span>
                                        <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '8px 0 16px' }}>{selectedProduct.title}</h2>
                                        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>{selectedProduct.description}</p>

                                        {/* Bonuses Section */}
                                        {selectedProduct.bonuses && selectedProduct.bonuses.length > 0 && (
                                            <div style={{ marginBottom: '24px' }}>
                                                <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981', marginBottom: '12px' }}>🎁 INCLUDED FREE BONUSES:</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {selectedProduct.bonuses.map((bonus: any, i: number) => (
                                                        <div key={i} style={{ display: 'flex', gap: '12px', background: 'rgba(16,185,129,0.05)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.1)' }}>
                                                            {bonus.imageUrl && <img src={bonus.imageUrl} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />}
                                                            <div>
                                                                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{bonus.title}</div>
                                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                    <span style={{ textDecoration: 'line-through' }}>₹{bonus.originalPrice}</span>
                                                                    <span style={{ color: '#10b981', marginLeft: '6px', fontWeight: 'bold' }}>FREE</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ marginTop: 'auto', padding: '24px', background: 'rgba(16,185,129,0.1)', borderRadius: '20px', border: '1px solid rgba(16,185,129,0.2)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>Price:</span>
                                                <div>
                                                    {selectedProduct.discount > 0 && <span style={{ fontSize: '16px', color: 'var(--text-muted)', textDecoration: 'line-through', marginRight: '8px' }}>₹{selectedProduct.price}</span>}
                                                    <span style={{ fontSize: '32px', fontWeight: '800', color: '#10b981' }}>₹{selectedProduct.price - (selectedProduct.price * (selectedProduct.discount / 100))}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => handleBuyNow(selectedProduct)} style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }}>Buy Now Securely</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Order Bump Modal */}
            <AnimatePresence>
                {showBumpModal && selectedProduct && (
                    <div className="modal-overlay" style={{ zIndex: 1100, background: 'rgba(0,0,0,0.85)' }}>
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            style={{ background: '#1e1e2e', width: '90%', maxWidth: '500px', borderRadius: '24px', padding: '32px', border: '2px solid #10b981' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: '900', textAlign: 'center', marginBottom: '8px' }}>WAIT! SPECIAL OFFER 🔥</h2>
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '24px' }}>Add these highly discounted products to your order now!</p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                                {selectedProduct.orderBumps.map((bump: any) => (
                                    <div key={bump.id} 
                                        onClick={() => {
                                            if (selectedBumps.includes(bump.id)) setSelectedBumps(selectedBumps.filter(id => id !== bump.id))
                                            else setSelectedBumps([...selectedBumps, bump.id])
                                        }}
                                        style={{ 
                                            display: 'flex', gap: '16px', padding: '16px', background: selectedBumps.includes(bump.id) ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                                            borderRadius: '16px', border: `2px solid ${selectedBumps.includes(bump.id) ? '#10b981' : 'rgba(255,255,255,0.05)'}`,
                                            cursor: 'pointer', transition: 'all 0.2s'
                                        }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', border: '2px solid #10b981', background: selectedBumps.includes(bump.id) ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                            {selectedBumps.includes(bump.id) && '✓'}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ fontSize: '15px', fontWeight: 'bold' }}>{bump.title}</h4>
                                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>
                                                ₹{bump.discountedPrice} <span style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'line-through', marginLeft: '6px' }}>₹{bump.originalPrice}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button onClick={proceedToCheckout} style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
                                {selectedBumps.length > 0 ? `Add Selected & Checkout` : `Proceed to Checkout`}
                            </button>
                            <button onClick={() => { setShowBumpModal(false); window.location.href = `/gyankosh/checkout/${selectedProduct.id}` }} style={{ width: '100%', background: 'none', border: 'none', color: 'var(--text-muted)', padding: '12px', marginTop: '8px', cursor: 'pointer', fontSize: '14px' }}>No thanks, I'll skip this</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx>{`
                .modal-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.8); display: flex; align-items: center;
                    justify-content: center; padding: 20px;
                }
                @media (max-width: 768px) {
                    .mobile-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
                    .mobile-grid h3 { font-size: 14px !important; }
                    .mobile-grid p { display: none !important; }
                }
            `}</style>
        </div>
    )
}
