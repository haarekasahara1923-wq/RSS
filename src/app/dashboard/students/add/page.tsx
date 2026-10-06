'use client'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Script from 'next/script'

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <label className="label">{label}</label>
        {children}
    </div>
)

export default function AddStudentPage() {
    const { token, handleUnauthorized, tenant } = useAuth()
    const router = useRouter()
    const formRef = useRef<HTMLDivElement>(null)
    const [isPdfReady, setIsPdfReady] = useState(false)
    const [courses, setCourses] = useState<{ id: string; name: string; fees: number; installmentCount: number; classGroup?: string; subjectGroup?: string }[]>([])
    const [batches, setBatches] = useState<{ id: string; name: string; courseId: string }[]>([])
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [toast, setToast] = useState('')
    const [metadataLoading, setMetadataLoading] = useState(true)
    const [showDocModal, setShowDocModal] = useState(false)

    const [form, setForm] = useState({
        scholarNo: '', fullName: '', fatherName: '', motherName: '', phone: '', parentPhone: '',
        email: '', address: '', gender: 'MALE', dob: '', dobInWords: '', caste: 'General', medium: 'Hindi',
        courseId: '', batchId: '',
        admissionDate: new Date().toISOString().split('T')[0],
        firstAdmissionClass: '', firstAdmissionDate: '', scholarshipScheme: '',
        feePlan: 'Annual', totalFee: '', feeWaiver: '', notes: '',
        aadhaarNo: '', penId: '', aparId: '', samagraId: '',
        bankName: '', bankAccountNo: '', ifsc: '', subjectGroup: '', photo: '',
        aadhaarFront: '', aadhaarBack: '', samagraIdDoc: '', aparIdDoc: '', penIdDoc: '', bankPassbook: ''
    })

    const handleDocUpload = (field: string, type: 'Camera' | 'Gallery') => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        if (type === 'Camera') {
            input.capture = 'environment';
        }
        input.onchange = (ev: any) => {
            const file = ev.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re: any) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const maxSize = 800; // slightly larger for documents
                        let w = img.width;
                        let h = img.height;
                        if (w > h) {
                            if (w > maxSize) { h *= maxSize / w; w = maxSize; }
                        } else {
                            if (h > maxSize) { w *= maxSize / h; h = maxSize; }
                        }
                        canvas.width = w;
                        canvas.height = h;
                        ctx?.drawImage(img, 0, 0, w, h);
                        setForm(prev => ({...prev, [field]: canvas.toDataURL('image/jpeg', 0.8)}));
                    };
                    img.src = re.target.result;
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }

    useEffect(() => {
        if (!token) return
        setMetadataLoading(true)
        Promise.all([
            fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
            fetch('/api/batches', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        ]).then(([c, b]) => {
            if (c.success) setCourses(c.data)
            if (b.success) setBatches(b.data)
            setMetadataLoading(false)
        }).catch(err => {
            console.error('Failed to fetch metadata:', err)
            setToast('Failed to load courses and batches. Please refresh.')
            setMetadataLoading(false)
        })
    }, [token])

    const filteredBatches = batches.filter(b => !form.courseId || b.courseId === form.courseId)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const res = await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(form),
        })
        const data = await res.json()
        setLoading(false)
        if (data.success) {
            setSuccess(true)
            setToast('Student added successfully!')
            setTimeout(() => router.push('/dashboard/students'), 1500)
        } else if (res.status === 401 || data?.error === 'Unauthorized') {
            // Token expired or invalid — clear and redirect to login
            handleUnauthorized()
        } else {
            if (data.error === 'student added previously') {
                alert('student added previously');
            }
            setToast(data.error || 'Failed to add student')
        }
    }

    const downloadPDF = () => {
        if (!isPdfReady || !formRef.current) return
        const opt = {
            margin: [5, 5, 5, 5],
            filename: `Admission_Form_${form.fullName || 'Student'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }
        
        // Temporarily make it visible for rendering
        const originalDisplay = formRef.current.style.display
        formRef.current.style.display = 'block'
        
        ;(window as any).html2pdf().set(opt).from(formRef.current).save().then(() => {
            if (formRef.current) formRef.current.style.display = originalDisplay
        })
    }

    const downloadDOC = () => {
        if (!formRef.current) return
        
        const originalDisplay = formRef.current.style.display
        formRef.current.style.display = 'block'
        
        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Admission Form</title>
            <style>
                body { font-family: 'Arial', sans-serif; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                td, th { padding: 8px; border: 1px solid #ddd; }
            </style>
            </head><body>
            ${formRef.current.innerHTML}
            </body></html>
        `
        
        formRef.current.style.display = originalDisplay
        
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `Admission_Form_${form.fullName || 'Student'}.doc`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return (
        <div>
            <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" strategy="lazyOnload" onLoad={() => setIsPdfReady(true)} />
            <div className="page-header">
                <div>
                    <h1 className="page-title">➕ Add New Student</h1>
                    <p className="page-subtitle">Fill in the student details below</p>
                </div>
            </div>

            {toast && (
                <div className={`toast ${success ? 'toast-success' : 'toast-error'}`} style={{ position: 'relative', marginBottom: '16px', maxWidth: '100%' }}>
                    {success ? '✓' : '⚠️'} {toast}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Personal Info */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '16px', color: 'var(--primary-light)' }}>👤 Personal Information</h3>
                    <div style={{ marginBottom: '16px' }}>
                        <Field label="Student Photo">
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                {form.photo ? (
                                    <div style={{ position: 'relative' }}>
                                        <img src={form.photo} alt="Preview" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                                        <button 
                                            type="button" 
                                            onClick={() => setForm({...form, photo: ''})}
                                            style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', width: 20, height: 20, border: 'none', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >✕</button>
                                    </div>
                                ) : (
                                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '24px', border: '2px dashed var(--border)' }}>
                                        👤
                                    </div>
                                )}
                                <div>
                                    <select 
                                        className="input" 
                                        style={{ width: 'auto', minWidth: '150px' }}
                                        onChange={e => {
                                            const type = e.target.value;
                                            e.target.value = '';
                                            if (!type) return;
                                            
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            if (type === 'Camera') {
                                                input.capture = 'environment';
                                            }
                                            input.onchange = (ev: any) => {
                                                const file = ev.target.files[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (re: any) => {
                                                        const img = new Image();
                                                        img.onload = () => {
                                                            const canvas = document.createElement('canvas');
                                                            const ctx = canvas.getContext('2d');
                                                            const maxSize = 300;
                                                            let w = img.width;
                                                            let h = img.height;
                                                            if (w > h) {
                                                                if (w > maxSize) { h *= maxSize / w; w = maxSize; }
                                                            } else {
                                                                if (h > maxSize) { w *= maxSize / h; h = maxSize; }
                                                            }
                                                            canvas.width = w;
                                                            canvas.height = h;
                                                            ctx?.drawImage(img, 0, 0, w, h);
                                                            setForm({...form, photo: canvas.toDataURL('image/jpeg', 0.8)});
                                                        };
                                                        img.src = re.target.result;
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            };
                                            input.click();
                                        }}
                                    >
                                        <option value="">Upload Photo</option>
                                        <option value="Camera">📷 Take Photo (Camera)</option>
                                        <option value="Gallery">📁 Upload from Gallery</option>
                                    </select>
                                </div>
                            </div>
                        </Field>
                    </div>
                    <div className="grid-cols-2">
                        <Field label="Scholar No. *">
                            <input className="input" placeholder="1001" value={form.scholarNo} onChange={e => setForm({ ...form, scholarNo: e.target.value })} required />
                        </Field>
                        <Field label="Full Name *">
                            <input className="input" placeholder="Arjun Sharma" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
                        </Field>
                        <Field label="Phone Number *">
                            <input className="input" type="tel" placeholder="917879337770" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
                        </Field>
                        <Field label="Father's Name">
                            <input className="input" placeholder="Ramesh Sharma" value={form.fatherName} onChange={e => setForm({ ...form, fatherName: e.target.value })} />
                        </Field>
                        <Field label="Mother's Name">
                            <input className="input" placeholder="Sunita Sharma" value={form.motherName} onChange={e => setForm({ ...form, motherName: e.target.value })} />
                        </Field>
                        <Field label="Parent Phone">
                            <input className="input" type="tel" placeholder="9876543211" value={form.parentPhone} onChange={e => setForm({ ...form, parentPhone: e.target.value })} />
                        </Field>
                        <Field label="Email">
                            <input className="input" type="email" placeholder="student@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                        </Field>
                        <Field label="Gender">
                            <select className="input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </Field>
                        <Field label="Date of Birth">
                            <input className="input" type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
                        </Field>
                        <Field label="Date of Birth (in words)">
                            <input className="input" placeholder="First January Two Thousand" value={form.dobInWords} onChange={e => setForm({ ...form, dobInWords: e.target.value })} />
                        </Field>
                        <Field label="Caste">
                            <select className="input" value={form.caste} onChange={e => setForm({ ...form, caste: e.target.value })}>
                                <option value="General">General</option>
                                <option value="SC">SC</option>
                                <option value="ST">ST</option>
                                <option value="OBC">OBC</option>
                                <option value="OTHER">OTHER</option>
                            </select>
                        </Field>
                        <Field label="Medium">
                            <select className="input" value={form.medium} onChange={e => setForm({ ...form, medium: e.target.value })}>
                                <option value="Hindi">Hindi</option>
                                <option value="English">English</option>
                            </select>
                        </Field>
                    </div>
                    <div style={{ marginTop: '16px' }}>
                        <Field label="Address">
                            <textarea className="input" placeholder="Full address with city and pin code" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} style={{ resize: 'none' }} />
                        </Field>
                    </div>
                </div>

                {/* Government IDs */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '16px', color: 'var(--primary-light)' }}>🪪 Government IDs</h3>
                    <div className="grid-cols-2">
                        <Field label="Aadhaar Number">
                            <input className="input" placeholder="1234 5678 9012" value={form.aadhaarNo} onChange={e => setForm({ ...form, aadhaarNo: e.target.value })} />
                        </Field>
                        <Field label="PEN ID No.">
                            <input className="input" placeholder="PEN ID" value={form.penId} onChange={e => setForm({ ...form, penId: e.target.value })} />
                        </Field>
                        <Field label="APAR ID No.">
                            <input className="input" placeholder="APAR ID" value={form.aparId} onChange={e => setForm({ ...form, aparId: e.target.value })} />
                        </Field>
                        <Field label="Samagra ID No.">
                            <input className="input" placeholder="Samagra ID" value={form.samagraId} onChange={e => setForm({ ...form, samagraId: e.target.value })} />
                        </Field>
                        <Field label="Bank Name">
                            <input className="input" placeholder="State Bank of India" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} />
                        </Field>
                        <Field label="Bank Account No.">
                            <input className="input" placeholder="Account Number" value={form.bankAccountNo} onChange={e => setForm({ ...form, bankAccountNo: e.target.value })} />
                        </Field>
                        <Field label="IFSC Code">
                            <input className="input" placeholder="IFSC Code" value={form.ifsc} onChange={e => setForm({ ...form, ifsc: e.target.value })} />
                        </Field>
                    </div>
                </div>

                {/* Academic Info */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '16px', color: 'var(--primary-light)' }}>📚 Academic Details</h3>
                    <div className="grid-cols-2">
                        <Field label="Class *">
                            <select 
                                className="input" 
                                value={form.courseId} 
                                onChange={e => {
                                    const courseId = e.target.value;
                                    const selectedCourse = courses.find(c => c.id === courseId);
                                    const classFee = selectedCourse ? selectedCourse.fees : 0;
                                    let waiver = parseFloat(form.feeWaiver) || 0;
                                    let newFeeWaiver = form.feeWaiver;
                                    if (form.scholarshipScheme.toUpperCase() === 'RT') {
                                        waiver = classFee;
                                        newFeeWaiver = classFee.toString();
                                    }
                                    setForm({ 
                                        ...form, 
                                        courseId, 
                                        batchId: '', 
                                        feeWaiver: newFeeWaiver,
                                        totalFee: selectedCourse ? Math.max(0, classFee - waiver).toString() : '' 
                                    });
                                }} 
                                required 
                                disabled={metadataLoading}
                            >
                                <option value="">{metadataLoading ? '⌛ Loading classes...' : 'Select Class'}</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.installmentCount} Installments)</option>)}
                            </select>
                            {form.courseId && courses.find(c => c.id === form.courseId) && (
                                <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '4px', fontWeight: 'bold' }}>
                                    Fees will be split into {courses.find(c => c.id === form.courseId)?.installmentCount} installments automatically.
                                </div>
                            )}
                        </Field>
                        <Field label="Section *">
                            <select className="input" value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })} required disabled={metadataLoading}>
                                <option value="">{metadataLoading ? '⌛ Loading sections...' : 'Select Section'}</option>
                                {filteredBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Admission Date">
                            <input className="input" type="date" value={form.admissionDate} onChange={e => setForm({ ...form, admissionDate: e.target.value })} />
                        </Field>
                        <Field label="First Admission Class">
                            <input className="input" placeholder="e.g. 1st Grade" value={form.firstAdmissionClass} onChange={e => setForm({ ...form, firstAdmissionClass: e.target.value })} />
                        </Field>
                        <Field label="First Admission Date">
                            <input className="input" type="date" value={form.firstAdmissionDate} onChange={e => setForm({ ...form, firstAdmissionDate: e.target.value })} />
                        </Field>
                        <Field label="Scholarship Scheme">
                            <input className="input" placeholder="e.g. RT" value={form.scholarshipScheme} onChange={e => {
                                const val = e.target.value;
                                if (val.toUpperCase() === 'RT') {
                                     const selectedCourse = courses.find(c => c.id === form.courseId);
                                     const classFee = selectedCourse ? selectedCourse.fees : 0;
                                     setForm({...form, scholarshipScheme: val, feeWaiver: classFee.toString(), totalFee: '0' });
                                } else {
                                     setForm({...form, scholarshipScheme: val});
                                }
                            }} />
                        </Field>
                        <Field label="Fee Plan">
                            <select className="input" value={form.feePlan} onChange={e => setForm({ ...form, feePlan: e.target.value })}>
                                <option>Annual</option>
                                <option>Quarterly</option>
                                <option>Monthly</option>
                                <option>Custom</option>
                            </select>
                        </Field>
                        <Field label="Fee Waiver (₹)">
                            <input className="input" type="number" placeholder="0" value={form.feeWaiver} onChange={e => {
                                const waiverStr = e.target.value;
                                const waiver = parseFloat(waiverStr) || 0;
                                const selectedCourse = courses.find(c => c.id === form.courseId);
                                const classFee = selectedCourse ? selectedCourse.fees : (parseFloat(form.totalFee) + (parseFloat(form.feeWaiver) || 0));
                                setForm({ 
                                    ...form, 
                                    feeWaiver: waiverStr,
                                    totalFee: selectedCourse ? Math.max(0, classFee - waiver).toString() : form.totalFee
                                });
                            }} />
                        </Field>
                        <Field label="Subject Group">
                            {(() => {
                                const selectedCourse = courses.find(c => c.id === form.courseId);
                                const isSenior = selectedCourse?.classGroup === 'Senior Hr Secondary';
                                return (
                                    <select
                                        className="input"
                                        value={form.subjectGroup}
                                        onChange={e => setForm({ ...form, subjectGroup: e.target.value })}
                                        disabled={!isSenior}
                                        style={{ opacity: isSenior ? 1 : 0.5, cursor: isSenior ? 'pointer' : 'not-allowed' }}
                                    >
                                        <option value="">{isSenior ? 'Select Subject Group' : 'Only for Class 11 & 12'}</option>
                                        <option value="Science Bio">Science Bio</option>
                                        <option value="Science Maths">Science Maths</option>
                                        <option value="Arts">Arts</option>
                                        <option value="Commerce">Commerce</option>
                                    </select>
                                );
                            })()}
                        </Field>
                        <Field label="Total Course Fee (₹) [After Waiver]">
                            <input className="input" type="number" placeholder="45000" value={form.totalFee} onChange={e => setForm({ ...form, totalFee: e.target.value })} />
                        </Field>
                    </div>
                </div>

                {/* Notes */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '16px', color: 'var(--primary-light)' }}>📝 Additional Notes</h3>
                    <textarea className="input" placeholder="Any important notes about this student..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} style={{ resize: 'none' }} />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => router.back()} className="btn btn-secondary">Cancel</button>
                    
                    <button type="button" onClick={downloadDOC} className="btn" style={{ background: '#2563eb', color: 'white', border: 'none' }}>
                        📄 Download DOC
                    </button>
                    
                    <button type="button" onClick={downloadPDF} disabled={!isPdfReady} className="btn" style={{ background: '#dc2626', color: 'white', border: 'none', opacity: isPdfReady ? 1 : 0.6 }}>
                        ⬇️ Download PDF
                    </button>

                    <button type="button" onClick={() => setShowDocModal(true)} className="btn" style={{ background: '#10b981', color: 'white', border: 'none' }}>
                        📸 Upload Govt IDs
                    </button>
                    
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ paddingLeft: '24px', paddingRight: '24px' }}>
                        {loading ? <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> Saving...</> : '💾 Add Student'}
                    </button>
                </div>
            </form>

            {/* Document Upload Modal */}
            {showDocModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontWeight: '700', fontSize: '18px' }}>📸 Upload Government IDs</h3>
                            <button type="button" onClick={() => setShowDocModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'white' }}>✕</button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                            {[
                                { key: 'aadhaarFront', label: 'Aadhaar Card (Front)' },
                                { key: 'aadhaarBack', label: 'Aadhaar Card (Back)' },
                                { key: 'samagraIdDoc', label: 'Samagra ID' },
                                { key: 'aparIdDoc', label: 'Apar ID' },
                                { key: 'penIdDoc', label: 'PEN ID' },
                                { key: 'bankPassbook', label: 'Bank Passbook (First Page)' },
                            ].map(doc => (
                                <div key={doc.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', padding: '16px', borderRadius: '12px' }}>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{doc.label}</div>
                                        {form[doc.key as keyof typeof form] ? (
                                            <span style={{ fontSize: '12px', color: '#10b981' }}>✓ Uploaded</span>
                                        ) : (
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Not uploaded yet</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button type="button" onClick={() => handleDocUpload(doc.key, 'Camera')} className="btn" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: '12px', padding: '6px 12px' }}>📷 Camera</button>
                                        <button type="button" onClick={() => handleDocUpload(doc.key, 'Gallery')} className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '12px', padding: '6px 12px' }}>📁 Gallery</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <button type="button" onClick={() => setShowDocModal(false)} className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }}>
                            Done Uploading
                        </button>
                    </div>
                </div>
            )}

            {/* Hidden Printable Admission Form */}
            <div style={{ display: 'none' }}>
                <div ref={formRef} style={{ width: '100%', maxWidth: '210mm', background: 'white', color: 'black', padding: '30px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
                    
                    {/* Header Branding */}
                    <div style={{ borderBottom: '3px solid #1a5c38', paddingBottom: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            {tenant?.logo && <img src={tenant.logo} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />}
                            <div>
                                <h1 style={{ margin: '0', fontSize: '26px', color: '#0f3d26', textTransform: 'uppercase' }}>{tenant?.name || 'RSS PUBLIC SCHOOL'}</h1>
                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#444' }}>{tenant?.address || 'Ayodhya Nagari, Gwalior (MP)'}</p>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#444' }}>Phone: {tenant?.phone || '917489315077'} | Email: {tenant?.email || 'rsspublic1979@gmail.com'}</p>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '11px', color: '#333' }}>
                            {tenant?.schoolCode && <div style={{ marginBottom: '3px' }}><strong>App ID:</strong> {tenant.schoolCode}</div>}
                            {tenant?.registrationCode && <div style={{ marginBottom: '3px' }}><strong>Reg No:</strong> {tenant.registrationCode}</div>}
                            {tenant?.diseCode && <div><strong>DISE Code:</strong> {tenant.diseCode}</div>}
                        </div>
                    </div>

                    <h2 style={{ textAlign: 'center', margin: '0 0 20px 0', fontSize: '20px', textTransform: 'uppercase', color: '#333', textDecoration: 'underline' }}>Admission Form (Session {new Date().getFullYear()}-{new Date().getFullYear() + 1})</h2>

                    {/* Top Row: Info & Photo */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ flex: 1, paddingRight: '20px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '6px', border: '1px solid #ccc', fontWeight: 'bold', width: '40%' }}>Scholar No.</td>
                                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>{form.scholarNo || '_________________'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '6px', border: '1px solid #ccc', fontWeight: 'bold' }}>Admission Date</td>
                                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>{form.admissionDate ? new Date(form.admissionDate).toLocaleDateString('en-IN') : '_________________'}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '6px', border: '1px solid #ccc', fontWeight: 'bold' }}>Course / Class</td>
                                        <td style={{ padding: '6px', border: '1px solid #ccc' }}>{courses.find(c => c.id === form.courseId)?.name || '_________________'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div style={{ width: '120px', height: '140px', border: '2px dashed #999', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {form.photo ? <img src={form.photo} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#999', fontSize: '11px', textAlign: 'center' }}>Affix Recent<br/>Passport Size<br/>Photograph</span>}
                        </div>
                    </div>

                    {/* Main Details Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
                        <tbody>
                            <tr>
                                <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold', width: '30%', backgroundColor: '#f9f9f9' }}>Full Name of Student</td>
                                <td style={{ padding: '8px', border: '1px solid #ccc' }} colSpan={3}>{form.fullName?.toUpperCase() || ''}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>Date of Birth</td>
                                <td style={{ padding: '8px', border: '1px solid #ccc' }}>{form.dob ? new Date(form.dob).toLocaleDateString('en-IN') : ''}</td>
                                <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>Gender</td>
                                <td style={{ padding: '8px', border: '1px solid #ccc' }}>{form.gender}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>DOB (In Words)</td>
                                <td style={{ padding: '8px', border: '1px solid #ccc' }} colSpan={3}>{form.dobInWords || ''}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>Father's Name</td>
                                <td style={{ padding: '8px', border: '1px solid #ccc' }} colSpan={3}>{form.fatherName || ''}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>Mother's Name</td>
                                <td style={{ padding: '8px', border: '1px solid #ccc' }} colSpan={3}>{form.motherName || ''}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>Caste / Category</td>
                                <td style={{ padding: '8px', border: '1px solid #ccc' }}>{form.caste}</td>
                                <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>Medium</td>
                                <td style={{ padding: '8px', border: '1px solid #ccc' }}>{form.medium}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>Aadhaar No.</td>
                                <td style={{ padding: '8px', border: '1px solid #ccc' }}>{form.aadhaarNo || ''}</td>
                                <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>Samagra ID</td>
                                <td style={{ padding: '8px', border: '1px solid #ccc' }}>{form.samagraId || ''}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>Contact Numbers</td>
                                <td style={{ padding: '8px', border: '1px solid #ccc' }} colSpan={3}>{form.phone} {form.parentPhone ? `/ ${form.parentPhone}` : ''}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>Residential Address</td>
                                <td style={{ padding: '8px', border: '1px solid #ccc' }} colSpan={3}>{form.address || ''}</td>
                            </tr>
                            {form.subjectGroup && (
                                <tr>
                                    <td style={{ padding: '8px', border: '1px solid #ccc', fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>Subject Group</td>
                                    <td style={{ padding: '8px', border: '1px solid #ccc' }} colSpan={3}>{form.subjectGroup}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Declaration */}
                    <div style={{ marginTop: '30px', fontSize: '12px', lineHeight: '1.6', color: '#444' }}>
                        <p><strong>Declaration:</strong> I hereby declare that all the information provided above is true to the best of my knowledge and belief. I agree to abide by the rules and regulations of the school. In case any information is found incorrect, the school holds the right to cancel the admission of my ward.</p>
                    </div>

                    {/* Signatures */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '70px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ borderTop: '1px solid #000', width: '180px', paddingTop: '5px' }}>
                                Signature of Parent / Guardian
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ borderTop: '1px solid #000', width: '180px', paddingTop: '5px' }}>
                                Authorised Signatory / Principal
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    )
}
