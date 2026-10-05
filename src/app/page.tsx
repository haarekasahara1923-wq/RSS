'use client'
import Link from 'next/link'
import { useState } from 'react'

const features = [
  { icon: '👨‍🎓', title: 'Student Management', desc: 'Admissions, profiles, class management with digital records & ID cards', color: '#8b5cf6' },
  { icon: '💰', title: 'Fee Collection', desc: 'Installment plans, UPI/Cash/Bank receipts with automated reminders', color: '#6366f1' },
  { icon: '📊', title: 'Live Analytics', desc: 'Real-time revenue, attendance & academic performance dashboards', color: '#7c3aed' },
  { icon: '📝', title: 'Exams & Tests', desc: 'MCQ + descriptive tests, auto evaluation, rank & digital report cards', color: '#4f46e5' },
  { icon: '✅', title: 'Attendance System', desc: 'Daily class attendance, bulk marking, instant parent WhatsApp alerts', color: '#8b5cf6' },
  { icon: '🤖', title: 'AI Question Generator', desc: 'Generate MCQs & descriptive questions for any subject instantly', color: '#6366f1' },
  { icon: '💬', title: 'WhatsApp Automation', desc: 'Fee reminders, attendance alerts & notices via WhatsApp', color: '#25d366' },
  { icon: '📈', title: 'Lead / Enquiry CRM', desc: 'Enquiries, follow-ups, conversion tracking & pipeline analytics', color: '#7c3aed' },
  { icon: '👩‍🏫', title: 'Teacher Portal', desc: 'Staff profiles, homework, attendance & salary management', color: '#4f46e5' },
  { icon: '💼', title: 'Expense Tracking', desc: 'Rent, salary, utilities & operational expenses with P&L reports', color: '#8b5cf6' },
  { icon: '🚌', title: 'Transport Management', desc: 'Vehicle tracking, route management & driver coordination', color: '#6366f1' },
  { icon: '🔒', title: 'Role-Based Access', desc: 'Admin, Teacher, Student, Parent & Driver — 5 dedicated portals', color: '#7c3aed' },
]

const roles = [
  { icon: '👑', title: 'School Admin', desc: 'Complete control — students, fees, reports, staff & settings' },
  { icon: '👩‍🏫', title: 'Teachers & Staff', desc: 'Attendance, homework, exam marking & class management' },
  { icon: '👨‍🎓', title: 'Students', desc: 'Results, attendance, notices, homework & fee status' },
  { icon: '👨‍👩‍👧', title: 'Parents', desc: "Ward's progress, attendance, fees & instant school notifications" },
  { icon: '🚌', title: 'Bus Driver', desc: 'Route updates, transport logs & pickup/drop management' },
]

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: '#06040e', color: 'white', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .hero-glow { animation: float 6s ease-in-out infinite; }
        .live-dot { animation: pulse 2s ease-in-out infinite; }
        @media (max-width: 768px) { .hide-mobile { display: none !important; } .show-mobile { display: flex !important; } }
        @media (min-width: 769px) { .show-mobile { display: none !important; } }
        .feature-card { transition: all 0.3s ease; }
        .feature-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(139,92,246,0.15); }
        .school-badge { 
          background: linear-gradient(90deg, #8b5cf6, #a78bfa, #6366f1, #8b5cf6);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      {/* Navbar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(6,4,14,0.92)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(139,92,246,0.15)',
        padding: '0 32px', height: '68px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: '0 4px 16px rgba(139,92,246,0.35)' }}>🏫</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '900', color: 'white', letterSpacing: '-0.5px', lineHeight: 1.2 }}>RSS Public School</div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px', fontWeight: '600', textTransform: 'uppercase' }}>School Management System</div>
          </div>
        </div>

        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
          {[['Features', '#features'], ['Portals', '#roles'], ['Contact', '#contact']].map(([label, href]) => (
            <a key={label} href={href} style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: '500', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.target as HTMLElement).style.color = 'white'}
              onMouseLeave={e => (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.5)'}
            >{label}</a>
          ))}
        </div>

        <div className="hide-mobile" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/login" style={{ padding: '8px 20px', fontSize: '13px', fontWeight: '600', background: 'rgba(139,92,246,0.1)', color: '#c4b5fd', borderRadius: '8px', textDecoration: 'none', border: '1px solid rgba(139,92,246,0.3)' }}>Login</Link>
          <Link href="/school-signup" style={{ padding: '9px 20px', fontSize: '13px', fontWeight: '700', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', borderRadius: '8px', textDecoration: 'none', boxShadow: '0 4px 20px rgba(139,92,246,0.35)' }}>🏫 School Signup</Link>
        </div>

        <button className="show-mobile" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', color: 'white', fontSize: '18px' }}>
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div style={{ position: 'fixed', top: '68px', left: 0, right: 0, zIndex: 99, background: '#0d0b14', borderBottom: '1px solid rgba(139,92,246,0.15)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[['Features', '#features'], ['Portals', '#roles'], ['Contact', '#contact']].map(([label, href]) => (
            <a key={label} href={href} onClick={() => setMobileMenuOpen(false)} style={{ color: 'white', fontSize: '16px', fontWeight: '600', textDecoration: 'none' }}>{label}</a>
          ))}
          <div style={{ height: '1px', background: 'rgba(139,92,246,0.15)' }} />
          <Link href="/login" onClick={() => setMobileMenuOpen(false)} style={{ padding: '12px', textAlign: 'center', background: 'rgba(139,92,246,0.1)', color: '#c4b5fd', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', border: '1px solid rgba(139,92,246,0.25)' }}>🔑 Login</Link>
          <Link href="/school-signup" onClick={() => setMobileMenuOpen(false)} style={{ padding: '12px', textAlign: 'center', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '700' }}>🏫 School Signup</Link>
        </div>
      )}

      {/* Hero */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '120px 32px 80px', maxWidth: '1200px', margin: '0 auto', gap: '64px', flexWrap: 'wrap', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15%', left: '-5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />

        {/* Left text */}
        <div style={{ flex: '1', minWidth: '300px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.35)', borderRadius: '50px', padding: '6px 16px', marginBottom: '28px' }}>
            <span className="live-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }} />
            <span style={{ fontSize: '13px', color: '#c4b5fd', fontWeight: '600' }}>🏫 RSS Public School — Digital Management Portal</span>
          </div>

          <h1 style={{ fontSize: 'clamp(34px, 5vw, 62px)', fontWeight: '900', lineHeight: '1.1', marginBottom: '24px', letterSpacing: '-1px' }}>
            RSS Public School<br />
            <span className="school-badge">
              Management System
            </span>
          </h1>

          <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.5)', maxWidth: '500px', lineHeight: '1.8', marginBottom: '36px' }}>
            RSS Public School ka complete digital management portal — students, fees, attendance, exams, transport aur parent communication sab ek jagah manage karein. Staff se lekar students tak, sab ke liye dedicated portals.
          </p>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '32px' }}>
            <Link href="/school-signup" style={{ padding: '14px 36px', fontSize: '15px', fontWeight: '700', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', borderRadius: '12px', textDecoration: 'none', boxShadow: '0 8px 32px rgba(139,92,246,0.4)', border: '1px solid rgba(139,92,246,0.4)' }}>🏫 School Portal Setup</Link>
            <Link href="/login" style={{ padding: '14px 32px', fontSize: '15px', fontWeight: '600', background: 'rgba(255,255,255,0.06)', color: 'white', borderRadius: '12px', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.12)' }}>🔑 Login →</Link>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {['Digital Records', 'AI-Powered', 'WhatsApp Alerts'].map(t => (
              <span key={t} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: '#a78bfa' }}>✓</span> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Right: dashboard mockup */}
        <div className="hero-glow" style={{ flex: '1', minWidth: '300px', position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '20px', padding: '28px', backdropFilter: 'blur(12px)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', maxWidth: '420px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🏫</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700' }}>RSS Public School</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Admin Dashboard • Live</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '5px' }}>
                {['#ef4444', '#f59e0b', '#10b981'].map(c => <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Total Students', value: '247', icon: '👨‍🎓', color: '#8b5cf6' },
                { label: 'Fee Collected', value: '₹2.4L', icon: '💰', color: '#6366f1' },
                { label: 'Present Today', value: '89%', icon: '✅', color: '#10b981' },
                { label: 'Pending Dues', value: '32', icon: '⚠️', color: '#ef4444' },
              ].map(card => (
                <div key={card.label} style={{ background: `linear-gradient(135deg, ${card.color}18, ${card.color}08)`, border: `1px solid ${card.color}30`, borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>{card.icon}</div>
                  <div style={{ fontSize: '18px', fontWeight: '800' }}>{card.value}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{card.label}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Live Activity</div>
            {[
              { msg: 'New student admission — Rahul Sharma', dot: '#10b981' },
              { msg: 'Fee collected — ₹15,000 via UPI', dot: '#8b5cf6' },
              { msg: 'Attendance marked — Class 10B (92%)', dot: '#6366f1' },
            ].map(item => (
              <div key={item.msg} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="live-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.dot, flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', flex: 1 }}>{item.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '96px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '50px', padding: '6px 16px', marginBottom: '20px' }}>
            <span style={{ fontSize: '13px', color: '#c4b5fd', fontWeight: '600' }}>All-in-One Platform</span>
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: '900', letterSpacing: '-0.5px' }}>
            Everything RSS Public School needs{' '}
            <span style={{ background: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>in one place</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '14px', fontSize: '15px' }}>12+ powerful modules to automate every aspect of school management</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {features.map(f => (
            <div key={f.title} className="feature-card"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(139,92,246,0.1)', borderRadius: '16px', padding: '24px', cursor: 'default' }}>
              <div style={{ width: '48px', height: '48px', background: `${f.color}20`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>{f.icon}</div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>{f.title}</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.7' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" style={{ padding: '80px 32px', background: 'rgba(139,92,246,0.03)', borderTop: '1px solid rgba(139,92,246,0.1)', borderBottom: '1px solid rgba(139,92,246,0.1)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 42px)', fontWeight: '900', marginBottom: '14px' }}>
              5 Dedicated{' '}
              <span style={{ background: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Role Portals</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>Har role ke liye alag, customized experience</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            {roles.map(r => (
              <div key={r.title} className="feature-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '16px', padding: '24px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>{r.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>{r.title}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.6' }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" style={{ padding: '96px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(139,92,246,0.15) 0%, transparent 70%)', pointerEvents: 'none', filter: 'blur(30px)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: '900', marginBottom: '16px', letterSpacing: '-0.5px' }}>
            RSS Public School<br />
            <span style={{ background: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Digital Portal</span>
          </h2>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.45)', marginBottom: '36px', lineHeight: '1.7' }}>
            Apne school ka poora management ek jagah karein. Students, fees, attendance, exams — sab kuch ek click mein.
          </p>

          <Link href="/school-signup" style={{ display: 'inline-block', padding: '16px 48px', fontSize: '16px', fontWeight: '700', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', borderRadius: '14px', textDecoration: 'none', boxShadow: '0 12px 40px rgba(139,92,246,0.4)' }}>
            🏫 School Portal Setup →
          </Link>
          <p style={{ marginTop: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#a78bfa', fontWeight: '700', textDecoration: 'none' }}>Sign in here</Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: 'rgba(139,92,246,0.04)', borderTop: '1px solid rgba(139,92,246,0.12)', padding: '40px 32px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏫</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: '900', fontSize: '17px', letterSpacing: '-0.5px' }}>RSS Public School</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>School Management System</div>
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)', lineHeight: '1.8' }}>
          Developed by Scalevo and copyright reserved to Scalevo.<br />
          Powered by Next.js
        </p>
      </footer>
    </div>
  )
}
