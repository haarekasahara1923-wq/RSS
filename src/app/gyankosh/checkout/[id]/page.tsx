'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const searchParams = useSearchParams()
    const bumpIdsStr = searchParams.get('b')
    const bumpIds = bumpIdsStr ? bumpIdsStr.split(',') : []

    const [product, setProduct] = useState<any>(null)
    const [bumps, setBumps] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [formData, setFormData] = useState({
        studentName: '', email: '', phone: '', affiliateTenantId: '',
    })
    const [processing, setProcessing] = useState(false)
    const [success, setSuccess] = useState(false)
    const [downloadLink, setDownloadLink] = useState('')

    useEffect(() => {
        const storedAffiliate = localStorage.getItem('gyankosh_affiliate_id')
        if (storedAffiliate) setFormData(prev => ({ ...prev, affiliateTenantId: storedAffiliate }))

        const fetchCheckoutData = async () => {
            if (id === 'cart') {
                try {
                    const cartData = JSON.parse(localStorage.getItem('gyankosh_cart') || '[]')
                    if (cartData.length === 0) { window.location.href = '/gyankosh'; return }
                    setBumps(cartData) // Reusing bumps state for cart items list
                    setLoading(false)
                } catch (e) { window.location.href = '/gyankosh' }
                return
            }

            try {
                const res = await fetch(`/api/marketplace/products/${id}`)
                const data = await res.json()
                if (!data.error) {
                    setProduct(data)
                    if (data.orderBumps) {
                        const selectedBumps = data.orderBumps.filter((b: any) => bumpIds.includes(b.id))
                        setBumps([{ ...data, bumps: selectedBumps, productId: id }]) 
                    } else {
                        setBumps([{ ...data, bumps: [], productId: id }])
                    }
                }
                setLoading(false)
            } catch (error) { console.error(error); setLoading(false) }
        }

        fetchCheckoutData()
    }, [id])

    const calculateTotal = () => {
        if (id === 'cart') {
            return bumps.reduce((total, item) => {
                const itemTotal = item.price + (item.bumps || []).reduce((s: number, b: any) => s + b.discountedPrice, 0)
                return total + itemTotal
            }, 0)
        }
        if (!product) return 0
        const mainPrice = product.price - (product.price * (product.discount / 100))
        const bumpsPrice = (bumps[0]?.bumps || []).reduce((sum: number, b: any) => sum + b.discountedPrice, 0)
        return mainPrice + bumpsPrice
    }

    const handlePayment = async () => {
        if (!formData.studentName || !formData.email || !formData.phone) {
            alert('Please fill all mandatory fields.'); return
        }
        setProcessing(true)
        try {
            const orderItems = id === 'cart' 
                ? bumps.map(item => ({ productId: item.productId, orderBumpIds: (item.bumps || []).map((b: any) => b.id) }))
                : [{ productId: id, orderBumpIds: (bumps[0]?.bumps || []).map((b: any) => b.id) }]

            const orderRes = await fetch('/api/marketplace/create-order', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    items: orderItems,
                    ...formData 
                })
            })
            const orderData = await orderRes.json()
            if (orderData.error) { alert('Error: ' + orderData.error); setProcessing(false); return }

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
                amount: orderData.amount, currency: orderData.currency,
                name: 'Gyankosh Marketplace', 
                description: id === 'cart' ? `Cart Purchase (${orderItems.length} items)` : product.title,
                order_id: orderData.orderId,
                handler: async function (response: any) {
                    const verifyRes = await fetch('/api/marketplace/verify-order', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            dbOrderId: orderData.dbOrderId
                        })
                    })
                    const verifyData = await verifyRes.json()
                    if (verifyData.success) {
                        setSuccess(true)
                        if (id === 'cart') localStorage.removeItem('gyankosh_cart')
                        setDownloadLink(verifyData.downloadLink || '')
                    } else { alert('Payment verification failed.') }
                },
                prefill: { name: formData.studentName, email: formData.email, contact: formData.phone },
                theme: { color: '#10b981' }
            }

            const rzp = new (window as any).Razorpay(options)
            rzp.on('payment.failed', function () { alert('Payment failed') })
            rzp.open()
        } catch (error) {
            console.error(error); alert('Payment failed to initialize.')
        } finally { setProcessing(false) }
    }

    if (loading) return <div style={{ color: 'white', textAlign: 'center', marginTop: '100px' }}>Loading...</div>
    if (!product && id !== 'cart') return <div style={{ color: 'white', textAlign: 'center', marginTop: '100px' }}>Product not found.</div>

    const totalAmount = calculateTotal()

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color, #0f0f1a)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div style={{ background: 'var(--surface, #1e1e2e)', borderRadius: '16px', padding: '32px', maxWidth: '500px', width: '100%', border: '1px solid var(--border)' }}>
                <Link href={id === 'cart' ? "/gyankosh/cart" : "/gyankosh"} style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', marginBottom: '24px', display: 'inline-block' }}>
                    ← Back to {id === 'cart' ? 'Cart' : 'Gyankosh'}
                </Link>

                {success ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                        <h2 style={{ color: 'white', marginBottom: '12px' }}>Payment Successful!</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Your products are ready for download.</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>📧 Download links for all products, bonuses and added bumps have been sent to your email.</p>
                        
                        <Link href="/gyankosh" style={{ display: 'inline-block', background: '#10b981', color: 'white', padding: '14px 28px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
                            Continue Shopping
                        </Link>
                    </div>
                ) : (
                    <>
                        <h2 style={{ color: 'white', marginBottom: '8px', fontSize: '24px' }}>Checkout</h2>
                        
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            {id === 'cart' ? (
                                bumps.map((item, i) => (
                                    <div key={i} style={{ marginBottom: i < bumps.length - 1 ? '16px' : '0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>{item.title}</span>
                                            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>₹{item.price}</span>
                                        </div>
                                        {(item.bumps || []).map((b: any, bi: number) => (
                                            <div key={bi} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#10b981', paddingLeft: '12px' }}>
                                                <span>+ {b.title}</span>
                                                <span>₹{b.discountedPrice}</span>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            ) : (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{product.title}</span>
                                        <span style={{ color: 'white', fontWeight: 'bold' }}>₹{product.price - (product.price * (product.discount / 100))}</span>
                                    </div>
                                    {(bumps[0]?.bumps || []).map((b: any, bi: number) => (
                                        <div key={bi} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                                            <span style={{ color: '#10b981' }}>+ {b.title}</span>
                                            <span style={{ color: 'white' }}>₹{b.discountedPrice}</span>
                                        </div>
                                    ))}
                                </>
                            )}
                            
                            <div style={{ borderTop: '1px solid var(--border)', marginTop: '12px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'white', fontWeight: 'bold' }}>Total Amount:</span>
                                <span style={{ color: '#10b981', fontWeight: '900', fontSize: '20px' }}>₹{totalAmount}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Student Full Name *</label>
                                <input type="text" className="input" value={formData.studentName} onChange={e => setFormData({ ...formData, studentName: e.target.value })} style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Email Address *</label>
                                <input type="email" className="input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Phone Number *</label>
                                <input type="text" className="input" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>Affiliate Code (Optional)</label>
                                <input type="text" className="input" value={formData.affiliateTenantId} onChange={e => setFormData({ ...formData, affiliateTenantId: e.target.value })} style={{ width: '100%' }} placeholder="Enter coaching ID if any" />
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Support your coaching center by entering their code.</p>
                            </div>
                            <button onClick={handlePayment} disabled={processing} style={{
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: 'white', border: 'none', padding: '14px', borderRadius: '8px',
                                fontSize: '16px', fontWeight: 'bold', cursor: processing ? 'not-allowed' : 'pointer', marginTop: '16px'
                            }}>
                                {processing ? 'Processing...' : `Pay ₹${totalAmount}`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
