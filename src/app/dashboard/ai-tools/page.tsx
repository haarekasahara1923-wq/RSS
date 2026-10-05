'use client'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { FeatureGate } from '../layout'

interface GeneratedQuestion {
    subject: string
    topic: string
    questionText: string
    type: string
    options?: string[]
    correctAnswer?: string
    marks: number
    difficulty: string
    explanation: string
}

export default function AIToolsPage() {
    const { token } = useAuth()
    const [activeTab, setActiveTab] = useState('questions')

    // Question Generator State
    const [qForm, setQForm] = useState({ subject: 'Physics', topic: '', count: '5', difficulty: 'MEDIUM', type: 'MCQ' })
    const [generating, setGenerating] = useState(false)
    const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
    const [qError, setQError] = useState('')

    // Performance Analysis State
    const [studentId, setStudentId] = useState('')
    const [analyzing, setAnalyzing] = useState(false)
    const [analysis, setAnalysis] = useState<{ weakTopics: string[]; suggestions: string[]; summary: string } | null>(null)

    const SUBJECTS = ['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'History', 'Geography', 'Economics', 'Accounts']

    const generateQuestions = async () => {
        setGenerating(true)
        setQError('')
        setQuestions([])
        try {
            const res = await fetch('/api/ai/generate-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(qForm),
            })
            const data = await res.json()
            if (data.success) {
                setQuestions(data.data)
            } else {
                setQError(data.error || 'Failed to generate questions')
            }
        } catch {
            setQError('Network error')
        }
        setGenerating(false)
    }

    const mockAnalysis = () => {
        setAnalyzing(true)
        setTimeout(() => {
            setAnalysis({
                weakTopics: ['Thermodynamics', 'Organic Chemistry', 'Calculus Integration', 'Modern Physics'],
                suggestions: [
                    'Focus more practice on Thermodynamics — attempt 10 extra MCQs daily',
                    'Revise Organic Chemistry reaction mechanisms with visual flowcharts',
                    'Practice integration by substitution problems daily for 2 weeks',
                    'Watch video lectures on Modern Physics (Photoelectric effect)',
                    'Take full mock tests on weekends to build exam temperament',
                ],
                summary: 'Student is performing well in Biology and basic Physics, but needs significant improvement in Chemistry and advanced Maths topics. Overall performance trend is positive with 15% improvement over last month.',
            })
            setAnalyzing(false)
        }, 2000)
    }

    const difficultyColors: Record<string, string> = { EASY: '#10b981', MEDIUM: '#f59e0b', HARD: '#ef4444' }

    return (
        <FeatureGate feature="aiTools">
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">🤖 AI-Powered Tools</h1>
                        <p className="page-subtitle">Powered by Groq AI (Llama 3.3 70B)</p>
                    </div>
                    <div style={{ padding: '6px 14px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', fontSize: '13px', color: '#a78bfa', fontWeight: '600' }}>
                        ✨ AI Active
                    </div>
                </div>

                {/* Tab Nav */}
                <div className="tabs" style={{ marginBottom: '24px' }}>
                    {[
                        { key: 'questions', label: '❓ Question Generator' },
                        { key: 'analysis', label: '📊 Performance Analysis' },
                        { key: 'voice', label: '🎙️ Voice to Text' },
                        { key: 'chatbot', label: '💬 WhatsApp Chatbot' },
                    ].map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)} className={`tab ${activeTab === t.key ? 'active' : ''}`}>{t.label}</button>
                    ))}
                </div>

                {/* Question Generator */}
                {activeTab === 'questions' && (
                    <div>
                        <div className="card" style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '16px' }}>❓ AI Question Generator</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                                <div>
                                    <label className="label">Subject</label>
                                    <select className="input" value={qForm.subject} onChange={e => setQForm({ ...qForm, subject: e.target.value })}>
                                        {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Topic (optional)</label>
                                    <input className="input" placeholder="e.g. Newton's Laws" value={qForm.topic} onChange={e => setQForm({ ...qForm, topic: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">Question Type</label>
                                    <select className="input" value={qForm.type} onChange={e => setQForm({ ...qForm, type: e.target.value })}>
                                        <option value="MCQ">MCQ</option>
                                        <option value="DESCRIPTIVE">Descriptive</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Difficulty</label>
                                    <select className="input" value={qForm.difficulty} onChange={e => setQForm({ ...qForm, difficulty: e.target.value })}>
                                        <option value="EASY">Easy</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HARD">Hard</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Count</label>
                                    <select className="input" value={qForm.count} onChange={e => setQForm({ ...qForm, count: e.target.value })}>
                                        {['3', '5', '10', '15', '20'].map(n => <option key={n}>{n}</option>)}
                                    </select>
                                </div>
                            </div>

                            <button onClick={generateQuestions} className="btn btn-primary" disabled={generating} style={{ fontSize: '15px', padding: '12px 28px' }}>
                                {generating ? <><div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> Generating with AI...</> : '🤖 Generate Questions'}
                            </button>

                            {qError && <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', color: '#fca5a5', fontSize: '14px' }}>⚠️ {qError}</div>}
                        </div>

                        {questions.length > 0 && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ fontWeight: '700', fontSize: '16px' }}>✅ {questions.length} Questions Generated</h3>
                                    <button className="btn btn-success btn-sm" onClick={() => {
                                        const text = questions.map((q, i) => `Q${i + 1}. ${q.questionText}\n${q.options?.map((o, j) => `   ${String.fromCharCode(65 + j)}) ${o}`).join('\n') || ''}\nAns: ${q.correctAnswer || ''}\nExplanation: ${q.explanation}`).join('\n\n---\n\n')
                                        const blob = new Blob([text], { type: 'text/plain' })
                                        const url = URL.createObjectURL(blob)
                                        const a = document.createElement('a')
                                        a.href = url; a.download = 'questions.txt'; a.click()
                                    }}>⬇️ Export</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {questions.map((q, i) => (
                                        <div key={i} className="card" style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                                <span style={{ fontSize: '13px', color: 'var(--primary-light)', fontWeight: '700' }}>Q{i + 1}. {q.subject} • {q.topic}</span>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: `${difficultyColors[q.difficulty] || '#6366f1'}20`, color: difficultyColors[q.difficulty] || '#818cf8' }}>{q.difficulty}</span>
                                                    <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>{q.marks} marks</span>
                                                </div>
                                            </div>
                                            <p style={{ fontWeight: '600', marginBottom: q.options && q.options.length > 0 ? '12px' : '0', fontSize: '15px', lineHeight: '1.6' }}>{q.questionText}</p>
                                            {q.options && q.options.length > 0 && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                                                    {q.options.map((opt, j) => (
                                                        <div key={j} style={{
                                                            padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
                                                            background: `${String.fromCharCode(65 + j)}` === q.correctAnswer ? 'rgba(16,185,129,0.15)' : 'var(--surface-2)',
                                                            border: `1px solid ${`${String.fromCharCode(65 + j)}` === q.correctAnswer ? '#10b981' : 'var(--border)'}`,
                                                            color: `${String.fromCharCode(65 + j)}` === q.correctAnswer ? '#10b981' : 'var(--text-secondary)',
                                                            fontWeight: `${String.fromCharCode(65 + j)}` === q.correctAnswer ? '700' : '400',
                                                        }}>
                                                            {String.fromCharCode(65 + j)}) {opt} {`${String.fromCharCode(65 + j)}` === q.correctAnswer ? '✓' : ''}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {q.explanation && (
                                                <div style={{ padding: '8px 12px', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    💡 <strong>Explanation:</strong> {q.explanation}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Performance Analysis */}
                {activeTab === 'analysis' && (
                    <div>
                        <div className="card" style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '16px' }}>📊 AI Performance Analyzer</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>Get AI-powered insights on student performance, weak areas, and personalized improvement suggestions.</p>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="label">Student Name / ID</label>
                                    <input className="input" placeholder="Enter student name or select..." value={studentId} onChange={e => setStudentId(e.target.value)} />
                                </div>
                                <button onClick={mockAnalysis} className="btn btn-primary" disabled={analyzing} style={{ padding: '10px 24px' }}>
                                    {analyzing ? <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> Analyzing...</> : '🤖 Analyze'}
                                </button>
                            </div>
                        </div>

                        {analysis && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="card">
                                    <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '15px', color: '#ef4444' }}>⚠️ Weak Topics Detected</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {analysis.weakTopics.map((t, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                                                <span style={{ color: '#ef4444', fontWeight: '700' }}>{i + 1}.</span>
                                                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{t}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="card">
                                    <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '15px', color: '#10b981' }}>💡 AI Suggestions</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {analysis.suggestions.map((s, i) => (
                                            <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px', background: 'rgba(16,185,129,0.08)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                                                <span style={{ color: '#10b981', fontWeight: '700', flexShrink: 0 }}>→</span>
                                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{s}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="card" style={{ gridColumn: '1/-1' }}>
                                    <h3 style={{ fontWeight: '700', marginBottom: '12px', fontSize: '15px' }}>📋 Performance Summary</h3>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: '14px' }}>{analysis.summary}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Voice to Text */}
                {activeTab === 'voice' && (
                    <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎙️</div>
                        <h3 style={{ fontWeight: '800', fontSize: '24px', marginBottom: '12px' }}>Voice to Text Feedback</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '15px', maxWidth: '400px', margin: '0 auto 28px' }}>Teachers can dictate feedback, remarks, and notes — automatically converted to text</p>
                        <button className="btn btn-primary btn-lg" style={{ margin: '0 auto' }}>🎙️ Start Voice Recording</button>
                        <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>Supports Hindi + English • Powered by Web Speech API</p>
                    </div>
                )}

                {/* Chatbot */}
                {activeTab === 'chatbot' && (
                    <div>
                        <div className="card">
                            <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '16px' }}>💬 WhatsApp AI Chatbot Setup</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>Configure auto-replies for common inquiries on WhatsApp</p>
                            {[
                                { trigger: 'Course Information', reply: 'We offer JEE, NEET, Class 10 Board preparation. Reply with your interest!', active: true },
                                { trigger: 'Fee Structure', reply: 'Our course fees start from ₹25,000. Contact us for personalized plans.', active: true },
                                { trigger: 'Demo Class', reply: 'Book a free demo class! Reply DEMO to schedule your slot.', active: true },
                                { trigger: 'Admission Inquiry', reply: 'We\'d love to have you! Our admission process is simple. Call us now.', active: false },
                            ].map((bot, i) => (
                                <div key={i} style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: '12px', marginBottom: '12px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <div style={{ fontWeight: '700', fontSize: '14px' }}>👉 {bot.trigger}</div>
                                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: bot.active ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: bot.active ? '#10b981' : '#94a3b8' }}>
                                            {bot.active ? '✅ Active' : '⏸️ Paused'}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '10px', background: '#25d36610', borderRadius: '8px', borderLeft: '3px solid #25d366' }}>
                                        💬 Bot: {bot.reply}
                                    </div>
                                </div>
                            ))}
                            <button className="btn btn-primary" style={{ marginTop: '8px' }}>➕ Add New Auto-Reply</button>
                        </div>
                    </div>
                )}
            </div>
        </FeatureGate>
    )
}
