'use client'
import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface AIGeneratorModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function AIGeneratorModal({ isOpen, onClose }: AIGeneratorModalProps) {
    const { token } = useAuth()
    const [prompt, setPrompt] = useState('')
    const [contentType, setContentType] = useState('Notes')
    const [generating, setGenerating] = useState(false)
    const [result, setResult] = useState('')
    const [error, setError] = useState('')
    const contentRef = useRef<HTMLDivElement>(null)

    if (!isOpen) return null

    const handleGenerate = async () => {
        if (!prompt) {
            setError('Please describe what you want to generate.')
            return
        }
        setGenerating(true)
        setError('')
        setResult('')

        try {
            const res = await fetch('/api/ai/generate-content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ prompt, contentType, format: 'Text (well formatted with newlines)' }),
            })
            const data = await res.json()
            if (data.success) {
                setResult(data.data)
            } else {
                setError(data.error || 'Failed to generate content')
            }
        } catch (err) {
            setError('Network error: ' + (err as Error).message)
        }
        setGenerating(false)
    }

    const handleDownloadPDF = async () => {
        if (!result || !contentRef.current) return;
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const element = contentRef.current;
            const opt = {
                margin: 10,
                filename: `${contentType.replace(/\s+/g, '_').toLowerCase()}_generated.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const }
            };
            html2pdf().set(opt).from(element).save();
        } catch (err) {
            console.error('Failed to download PDF:', err);
            setError('Failed to download PDF. Please try again.');
        }
    }

    const handleDownloadWord = () => {
        if (!result || !contentRef.current) return;
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + contentRef.current.innerHTML + footer;

        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = `${contentType.replace(/\s+/g, '_').toLowerCase()}_generated.doc`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
    }

    const handleDownloadExcel = () => {
        if (!result || !contentRef.current) return;
        const header = '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>';
        const footer = '</body></html>';
        const sourceHTML = header + contentRef.current.innerHTML + footer;

        const source = 'data:application/vnd.ms-excel;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = `${contentType.replace(/\s+/g, '_').toLowerCase()}_generated.xls`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
    }

    // Modal styles
    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
    }

    const modalStyle: React.CSSProperties = {
        background: 'var(--surface-1, #fff)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
    }

    const headerStyle: React.CSSProperties = {
        padding: '20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--surface-2)'
    }

    const bodyStyle: React.CSSProperties = {
        padding: '20px',
        overflowY: 'auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    }

    return (
        <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <style>{`
                .ai-modal-scroll::-webkit-scrollbar { width: 12px; }
                .ai-modal-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); border-radius: 10px; }
                .ai-modal-scroll::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.5); border-radius: 10px; border: 3px solid transparent; background-clip: padding-box; }
                .ai-modal-scroll::-webkit-scrollbar-thumb:hover { background-color: rgba(99,102,241,0.9); }
            `}</style>
            <div style={modalStyle}>
                <div style={headerStyle}>
                    <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '24px' }}>✨</span> AI Assistant
                    </h2>
                    <button
                        onClick={onClose}
                        title="Close AI Assistant"
                        style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', width: '36px', height: '36px', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                    >✕</button>
                </div>

                <div style={bodyStyle} className="ai-modal-scroll">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Content Type</label>
                            <select
                                value={contentType}
                                onChange={(e) => setContentType(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)' }}
                            >
                                <option value="Notes">Notes / Summary</option>
                                <option value="Question Paper">Question Paper / Test</option>
                                <option value="Syllabus">Syllabus Outline</option>
                                <option value="Doubt Explanation">Doubt Explanation</option>
                                <option value="Study Schedule">Study Schedule</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Prompt / Topic details</label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="E.g., Generate a 5-question MCQ test for Class 10 Physics on Newton's Laws of Motion..."
                                style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', resize: 'vertical' }}
                            />
                        </div>

                        {error && (
                            <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            style={{
                                padding: '14px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                fontSize: '16px',
                                cursor: 'pointer',
                                opacity: generating ? 0.7 : 1,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {generating ? 'Generating Content...' : '🪄 Generate Content'}
                        </button>
                    </div>

                    {result && (
                        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0, fontSize: '18px' }}>✅ Preview {contentType}</h3>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={handleDownloadPDF}
                                        style={{ padding: '8px 12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                                    >⬇️ PDF</button>
                                    <button
                                        onClick={handleDownloadWord}
                                        style={{ padding: '8px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                                    >⬇️ DOCX</button>
                                    <button
                                        onClick={handleDownloadExcel}
                                        style={{ padding: '8px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                                    >⬇️ Excel</button>
                                </div>
                            </div>

                            <div
                                className="ai-modal-scroll"
                                style={{
                                    padding: '20px',
                                    background: '#f8fafc',
                                    color: '#0f172a',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    maxHeight: '400px',
                                    overflowY: 'auto'
                                }}
                            >
                                <div
                                    ref={contentRef}
                                    style={{ fontFamily: 'inherit', lineHeight: '1.6', fontSize: '15px', color: 'black' }}
                                    dangerouslySetInnerHTML={{ __html: result }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
