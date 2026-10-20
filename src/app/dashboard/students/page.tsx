'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import Script from 'next/script'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Student {
    id: string
    studentId: string
    fullName: string
    phone: string
    email: string
    gender: string
    courseName: string
    batchName: string
    totalFee: number
    paidFee: number
    status: string
    admissionDate: string
    fatherName: string
    parentPhone: string
    aadhaarNo?: string
    penId?: string
    aparId?: string
    samagraId?: string
    parentEmail?: string
    parentPassword?: string
    examResults?: any[]
    courseSubjects?: string[]
    scholarNo?: string
    caste?: string
    dobInWords?: string
    medium?: string
    firstAdmissionClass?: string
    firstAdmissionDate?: string
    scholarshipScheme?: string
    bankName?: string
    bankAccountNo?: string
    ifsc?: string
    dob?: string
    address?: string
    motherName?: string
    hasSiblings?: boolean
    siblingsCount?: number
    siblingGroupId?: string
}

const statusColors: Record<string, string> = {
    ACTIVE: 'badge-success',
    INACTIVE: 'badge-gray',
    DROPOUT: 'badge-danger',
    PASSED: 'badge-info',
}

export default function StudentsPage() {
    const { token, user, tenant, handleUnauthorized } = useAuth()
    const canEditOrDelete = user?.role === 'SUPER_ADMIN' || user?.role === 'COACHING_ADMIN'
    const isSuperAdmin = user?.role === 'SUPER_ADMIN'
    const [students, setStudents] = useState<Student[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState<any>({})
    const [actionLoading, setActionLoading] = useState(false)

    // Selection mode (name | scholar | classwise)
    const [selectionMode, setSelectionMode] = useState<'name' | 'scholar' | 'classwise'>('name')
    const [showModeDropdown, setShowModeDropdown] = useState(false)
    const modeDropdownRef = useRef<HTMLDivElement>(null)

    // Classwise selection state
    const [courses, setCourses] = useState<any[]>([])
    const [batches, setBatches] = useState<any[]>([])
    const [selectedCourseId, setSelectedCourseId] = useState('')
    const [selectedBatchId, setSelectedBatchId] = useState('')
    const [classwiseStudents, setClasswiseStudents] = useState<Student[]>([])
    const [classwiseLoading, setClasswiseLoading] = useState(false)
    const [classwiseFetched, setClasswiseFetched] = useState(false)

    // Sibling management state
    const [siblingList, setSiblingList] = useState<any[]>([])
    const [loadingSiblings, setLoadingSiblings] = useState(false)
    const [showAddSiblingBox, setShowAddSiblingBox] = useState(false)
    const [siblingSearchQuery, setSiblingSearchQuery] = useState('')
    const [siblingCandidates, setSiblingCandidates] = useState<any[]>([])
    const [searchingSiblings, setSearchingSiblings] = useState(false)
    const [siblingActionLoading, setSiblingActionLoading] = useState(false)
    const [siblingFeedback, setSiblingFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

    // Excel Bulk Import state
    const [showImportModal, setShowImportModal] = useState(false)
    const [importFile, setImportFile] = useState<File | null>(null)
    const [importPreviews, setImportPreviews] = useState<any[]>([])
    const [importLoading, setImportLoading] = useState(false)
    const [importStep, setImportStep] = useState<'upload' | 'preview' | 'result'>('upload')
    const [importResult, setImportResult] = useState<any>(null)
    const importFileRef = useRef<HTMLInputElement>(null)

    // Column mapping state
    const [colMap, setColMap] = useState<Record<string, string>>({})
    const [excelHeaders, setExcelHeaders] = useState<string[]>([])
    const [rawExcelRows, setRawExcelRows] = useState<any[]>([])

    const downloadPDF = (elementId: string, title: string) => {
        const original = document.getElementById(elementId)
        if (!original) return

        const clone = original.cloneNode(true) as HTMLElement
        clone.style.background = '#ffffff'
        clone.style.color = '#000000'
        clone.style.width = '210mm'
        clone.style.padding = '20mm'
        clone.style.boxSizing = 'border-box'

        const ths = clone.querySelectorAll('th')
        ths.forEach(th => {
          th.style.background = '#f1f5f9'
          th.style.color = '#000000'
          th.style.borderColor = '#000000'
        })
        const tds = clone.querySelectorAll('td')
        tds.forEach(td => {
          if (td.style.color !== 'rgb(16, 185, 129)' && td.style.color !== '#10b981') td.style.color = '#000000'
          td.style.borderColor = '#000000'
        })
        
        const allEls = clone.querySelectorAll('*')
        allEls.forEach((el: any) => {
            const color = el.style.color
            if (color === 'white' || color === 'rgb(255, 255, 255)' || color === '#94a3b8' || color === 'rgb(148, 163, 184)' || color === '#cbd5e1') el.style.color = '#000000'
            if (el.style.borderTopColor === '#334155' || el.style.borderTopColor === 'rgb(51, 65, 85)') el.style.borderTopColor = '#000000'
            if (el.style.borderBottomColor === '#334155' || el.style.borderBottomColor === 'rgb(51, 65, 85)') el.style.borderBottomColor = '#000000'
        })

        const wrapper = document.createElement('div')
        wrapper.style.position = 'absolute'
        wrapper.style.left = '-9999px'
        wrapper.style.top = '0'
        wrapper.appendChild(clone)
        document.body.appendChild(wrapper)

        const opt = {
          margin: 0,
          filename: `${title.replace(/\s+/g, '_')}_Report_Card.pdf`,
          image: { type: 'jpeg', quality: 1 },
          html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }
        
        // @ts-ignore
        window.html2pdf().set(opt).from(clone).save().then(() => document.body.removeChild(wrapper)).catch(() => document.body.removeChild(wrapper))
    }

    const fetchStudents = async () => {
        if (!token) return
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        const res = await fetch(`/api/students?${params}`, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.success) setStudents(data.data)
        setLoading(false)
    }

    const fetchCourses = async () => {
        if (!token) return
        try {
            const res = await fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } })
            const data = await res.json()
            if (data.success) setCourses(data.data)
        } catch {}
    }

    const fetchBatchesForCourse = async (courseId: string) => {
        if (!token || !courseId) { setBatches([]); return }
        try {
            const res = await fetch('/api/batches', { headers: { Authorization: `Bearer ${token}` } })
            const data = await res.json()
            if (data.success) {
                setBatches(data.data.filter((b: any) => b.courseId === courseId))
            }
        } catch {}
    }

    const fetchClasswiseStudents = async (courseIdParam?: string, batchIdParam?: string) => {
        const cId = courseIdParam !== undefined ? courseIdParam : selectedCourseId
        const bId = batchIdParam !== undefined ? batchIdParam : selectedBatchId
        if (!token || !cId) {
            setClasswiseStudents([])
            setClasswiseFetched(false)
            return
        }
        setClasswiseLoading(true)
        try {
            const params = new URLSearchParams()
            params.set('courseId', cId)
            if (bId) params.set('batchId', bId)
            const res = await fetch(`/api/students?${params}`, { headers: { Authorization: `Bearer ${token}` } })
            const data = await res.json()
            if (data.success) setClasswiseStudents(data.data)
            setClasswiseFetched(true)
        } catch {}
        setClasswiseLoading(false)
    }

    const handleCourseSelect = (courseId: string) => {
        setSelectedCourseId(courseId)
        setSelectedBatchId('')
        if (courseId) {
            fetchBatchesForCourse(courseId)
            fetchClasswiseStudents(courseId, '')
        } else {
            setBatches([])
            setClasswiseStudents([])
            setClasswiseFetched(false)
        }
    }

    const handleBatchSelect = (batchId: string) => {
        setSelectedBatchId(batchId)
        if (selectedCourseId) {
            fetchClasswiseStudents(selectedCourseId, batchId)
        }
    }

    // CSV download
    const downloadCSV = (studentsList: Student[], filename: string) => {
        const headers = ['Scholar No', 'Full Name', 'Father Name', 'Class', 'Section', 'Phone', 'Gender', 'Status', 'Admission Date', 'Total Fee', 'Paid Fee', 'Due Fee']
        const rows = studentsList.map(s => [
            s.scholarNo || '',
            s.fullName,
            s.fatherName || '',
            s.courseName,
            s.batchName || '',
            s.phone || '',
            s.gender || '',
            s.status,
            s.admissionDate ? formatDate(s.admissionDate) : '',
            s.totalFee,
            s.paidFee,
            s.totalFee - s.paidFee
        ])
        const csvContent = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${filename}.csv`; a.click()
        URL.revokeObjectURL(url)
    }

    // Excel download (XLSX via XML Spreadsheet)
    const downloadExcel = (studentsList: Student[], filename: string) => {
        const headers = ['Scholar No', 'Full Name', 'Father Name', 'Class', 'Section', 'Phone', 'Gender', 'Status', 'Admission Date', 'Total Fee', 'Paid Fee', 'Due Fee']
        const rows = studentsList.map(s => [
            s.scholarNo || '',
            s.fullName,
            s.fatherName || '',
            s.courseName,
            s.batchName || '',
            s.phone || '',
            s.gender || '',
            s.status,
            s.admissionDate ? formatDate(s.admissionDate) : '',
            s.totalFee,
            s.paidFee,
            s.totalFee - s.paidFee
        ])
        const xmlRows = [headers, ...rows].map(row =>
            `<Row>${row.map((c: any) => `<Cell><Data ss:Type="String">${String(c).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Data></Cell>`).join('')}</Row>`
        ).join('')
        const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Students"><Table>${xmlRows}</Table></Worksheet></Workbook>`
        const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${filename}.xls`; a.click()
        URL.revokeObjectURL(url)
    }

    // PDF download for classwise list
    const downloadClasswisePDF = (studentsList: Student[], className: string, batchName: string) => {
        const courseName = courses.find(c => c.id === selectedCourseId)?.name || className
        const bName = batches.find(b => b.id === selectedBatchId)?.name || batchName
        const title = bName ? `${courseName} - ${bName}` : courseName
        const tenantName = tenant?.name || 'School'

        const rows = studentsList.map((s, i) => `
            <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px 10px;">${i + 1}</td>
                <td style="padding:8px 10px;">${s.scholarNo || '-'}</td>
                <td style="padding:8px 10px;font-weight:600;">${s.fullName}</td>
                <td style="padding:8px 10px;">${s.fatherName || '-'}</td>
                <td style="padding:8px 10px;">${s.gender || '-'}</td>
                <td style="padding:8px 10px;">${s.phone || '-'}</td>
                <td style="padding:8px 10px;">${s.status}</td>
                <td style="padding:8px 10px;">${s.admissionDate ? formatDate(s.admissionDate) : '-'}</td>
            </tr>`).join('')

        const html = `
            <html><head><style>body{font-family:Arial,sans-serif;margin:20px;}table{width:100%;border-collapse:collapse;}th{background:#f1f5f9;padding:8px 10px;text-align:left;font-size:12px;}td{font-size:12px;}</style></head>
            <body>
                <div style="text-align:center;margin-bottom:20px;">
                    <h2 style="margin:0;">${tenantName}</h2>
                    <h3 style="margin:4px 0 0 0;color:#6366f1;">Student List — ${title}</h3>
                    <p style="margin:2px 0;font-size:12px;color:#64748b;">Total Students: ${studentsList.length} | Generated: ${new Date().toLocaleDateString('en-IN')}</p>
                </div>
                <table>
                    <thead><tr><th>#</th><th>Scholar No</th><th>Student Name</th><th>Father Name</th><th>Gender</th><th>Phone</th><th>Status</th><th>Admission Date</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </body></html>`

        const wrapper = document.createElement('div')
        wrapper.style.position = 'absolute'
        wrapper.style.left = '-9999px'
        wrapper.style.top = '0'
        wrapper.innerHTML = html
        document.body.appendChild(wrapper)
        const opt = {
            margin: 10,
            filename: `${title.replace(/\s+/g, '_')}_Student_List.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        }
        // @ts-ignore
        if (typeof window !== 'undefined' && window.html2pdf) {
            // @ts-ignore
            window.html2pdf().set(opt).from(wrapper).save()
                .then(() => { if (document.body.contains(wrapper)) document.body.removeChild(wrapper) })
                .catch(() => { if (document.body.contains(wrapper)) document.body.removeChild(wrapper) })
        } else {
            const printWin = window.open('', '_blank')
            if (printWin) {
                printWin.document.write(html)
                printWin.document.close()
                printWin.focus()
                printWin.print()
                printWin.close()
            }
            if (document.body.contains(wrapper)) document.body.removeChild(wrapper)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this student?')) return
        setActionLoading(true)
        try {
            const res = await fetch(`/api/students?id=${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (res.status === 401 || data?.error === 'Unauthorized') { handleUnauthorized(); return }
            if (data.success) {
                alert('Student deleted successfully')
                fetchStudents()
            } else {
                alert(data.error || 'Failed to delete student')
            }
        } catch (err) {
            alert('Error deleting student')
        }
        setActionLoading(false)
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setActionLoading(true)
        try {
            const res = await fetch('/api/students', {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify(editForm)
            })
            const data = await res.json()
            if (res.status === 401 || data?.error === 'Unauthorized') { handleUnauthorized(); return }
            if (data.success) {
                alert('Student updated successfully')
                setIsEditing(false)
                setSelectedStudent(data.data)
                fetchStudents()
            } else {
                alert(data.error || 'Failed to update student')
            }
        } catch (err) {
            alert('Error updating student')
        }
        setActionLoading(false)
    }

    const toggleBlock = async (student: Student) => {
        const newStatus = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
        if (!confirm(`Are you sure you want to ${newStatus === 'ACTIVE' ? 'unblock' : 'block'} this student?`)) return
        
        setActionLoading(true)
        try {
            const res = await fetch('/api/students', {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({ id: student.id, status: newStatus })
            })
            const data = await res.json()
            if (data.success) {
                alert(`Student ${newStatus === 'ACTIVE' ? 'unblocked' : 'blocked'} successfully`)
                if (selectedStudent?.id === student.id) setSelectedStudent(data.data)
                fetchStudents()
            }
        } catch (err) {
            alert('Error updating status')
        }
        setActionLoading(false)
    }

    const loadSiblings = async (studentId: string) => {
        if (!token) return
        setLoadingSiblings(true)
        try {
            const res = await fetch(`/api/students/siblings?studentId=${studentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success) {
                setSiblingList(data.siblings || [])
            }
        } catch {}
        setLoadingSiblings(false)
    }

    useEffect(() => {
        if (selectedStudent) {
            loadSiblings(selectedStudent.id)
            setShowAddSiblingBox(false)
            setSiblingSearchQuery('')
            setSiblingCandidates([])
            setSiblingFeedback(null)
        } else {
            setSiblingList([])
            setShowAddSiblingBox(false)
            setSiblingFeedback(null)
        }
    }, [selectedStudent?.id, token])

    const handleSiblingSearch = async (q: string) => {
        setSiblingSearchQuery(q)
        if (!q.trim() || !selectedStudent || !token) {
            setSiblingCandidates([])
            return
        }
        setSearchingSiblings(true)
        try {
            const res = await fetch(`/api/students/siblings?studentId=${selectedStudent.id}&search=${encodeURIComponent(q.trim())}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success) {
                setSiblingCandidates(data.candidates || [])
            }
        } catch {}
        setSearchingSiblings(false)
    }

    const handleAddSibling = async (siblingId: string) => {
        if (!selectedStudent || !token) return
        setSiblingActionLoading(true)
        setSiblingFeedback(null)
        try {
            const res = await fetch('/api/students/siblings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId: selectedStudent.id,
                    siblingId
                })
            })
            const data = await res.json()
            if (data.success) {
                setSiblingFeedback({ type: 'success', msg: data.message })
                setSiblingList(data.siblings || [])
                setShowAddSiblingBox(false)
                setSiblingSearchQuery('')
                setSiblingCandidates([])
                fetchStudents()
            } else {
                setSiblingFeedback({ type: 'error', msg: data.error || 'Failed to add sibling' })
            }
        } catch {
            setSiblingFeedback({ type: 'error', msg: 'Error adding sibling' })
        }
        setSiblingActionLoading(false)
    }

    const handleRemoveSibling = async (siblingId: string, siblingName: string) => {
        if (!selectedStudent || !token) return
        if (!confirm(`Are you sure you want to remove ${siblingName} from siblings?`)) return
        setSiblingActionLoading(true)
        setSiblingFeedback(null)
        try {
            const res = await fetch('/api/students/siblings', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId: selectedStudent.id,
                    siblingId
                })
            })
            const data = await res.json()
            if (data.success) {
                setSiblingFeedback({ type: 'success', msg: data.message })
                loadSiblings(selectedStudent.id)
                fetchStudents()
            } else {
                setSiblingFeedback({ type: 'error', msg: data.error || 'Failed to remove sibling' })
            }
        } catch {
            setSiblingFeedback({ type: 'error', msg: 'Error removing sibling' })
        }
        setSiblingActionLoading(false)
    }

    useEffect(() => { fetchStudents() }, [token, search])

    useEffect(() => {
        if (selectionMode === 'classwise' && token) fetchCourses()
    }, [selectionMode, token])


    // Close mode dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (modeDropdownRef.current && !modeDropdownRef.current.contains(e.target as Node)) {
                setShowModeDropdown(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Parse Excel file using SheetJS (loaded from CDN via Script tag)
    const handleExcelFile = async (file: File) => {
        setImportFile(file)
        try {
            const arrayBuffer = await file.arrayBuffer()
            // @ts-ignore
            const XLSX = window.XLSX
            if (!XLSX) { alert('Excel library still loading, please try again in a moment.'); return }
            const workbook = XLSX.read(arrayBuffer, { type: 'array' })
            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
            if (jsonData.length < 2) { alert('Excel file is empty or has no data rows.'); return }
            const headers: string[] = (jsonData[0] as string[]).map((h: string) => String(h).trim())
            const rows = jsonData.slice(1).filter((r: any[]) => r.some((c: any) => String(c).trim() !== ''))
            setExcelHeaders(headers)
            setRawExcelRows(rows)

            // Auto-detect column mapping
            const autoMap: Record<string, string> = {}
            const fieldPatterns: { field: string; patterns: string[] }[] = [
                { field: 'scholarNo', patterns: ['scholar', 'scholar no', 'scholar no.', 'scholarno'] },
                { field: 'fullName', patterns: ['student name', 'name', 'full name', 'student'] },
                { field: 'fatherName', patterns: ["father", "father name", "father's name", "fathername"] },
                { field: 'motherName', patterns: ["mother", "mother name", "mother's name", "mothername"] },
                { field: 'gender', patterns: ['gender', 'sex', 'ling', 'लिंग'] },
                { field: 'dob', patterns: ['birth date', 'dob', 'date of birth', 'd.o.b', 'birthdate', 'birth', 'd.o.b.', 'janm tithi', 'जन्म तारीख', 'जन्म दिनांक'] },
                { field: 'mobileNo', patterns: ['mobile', 'mobile no', 'mobile no.', 'phone', 'contact'] },
                { field: 'parentMobileNo', patterns: ['parent mobile', 'parent mobile no', 'parent phone', 'guardian mobile'] },
                { field: 'email', patterns: ['email', 'mail id', 'mail', 'e-mail'] },
                { field: 'caste', patterns: ['caste', 'category'] },
                { field: 'medium', patterns: ['medium'] },
                { field: 'address', patterns: ['address', 'addr'] },
                { field: 'aadhaarNo', patterns: ['adhar', 'aadhaar', 'aadhar', 'aadhar no', 'aadhaar no', 'adhar no'] },
                { field: 'penId', patterns: ['pen id', 'pen', 'penid'] },
                { field: 'aparId', patterns: ['apar id', 'apar', 'aparid'] },
                { field: 'samagraId', patterns: ['samagra', 'samagra id', 'samagram'] },
                { field: 'className', patterns: ['class', 'course', 'class (section', 'class(section', 'kaksha', 'कक्षा'] },
                { field: 'section', patterns: ['section', 'batch', 'division', 'sec'] },
                { field: 'firstAdmissionDate', patterns: ['first admission date', 'admission date', 'adm date', 'adm. date', 'admission dt', 'date of admission', 'pravesh dinank', 'प्रवेश दिनांक'] },
                { field: 'firstAdmissionClass', patterns: ['first admission class', 'first class', 'admission class', 'pravesh kaksha', 'प्रवेश कक्षा'] },
                { field: 'bankName', patterns: ['bank name', 'bank'] },
                { field: 'bankAccountNo', patterns: ['bank account', 'account no', 'account number', 'bank account no'] },
                { field: 'ifsc', patterns: ['ifsc', 'ifsc code'] },
            ]
            headers.forEach((h, idx) => {
                const hl = h.toLowerCase()
                for (const { field, patterns } of fieldPatterns) {
                    if (patterns.some(p => hl === p || hl.startsWith(p) || hl.includes(p))) {
                        if (!Object.values(autoMap).includes(String(idx))) autoMap[field] = String(idx)
                        break
                    }
                }
            })
            setColMap(autoMap)
            setImportStep('upload')
        } catch (e: any) {
            alert('Error reading file: ' + (e.message || e))
        }
    }

    const buildStudentRows = () => {
        return rawExcelRows.map(row => {
            const get = (field: string) => {
                const idx = colMap[field]
                if (idx === undefined || idx === '') return ''
                return String(row[Number(idx)] ?? '').trim()
            }
            const classRaw = get('className')
            const sectionRaw = get('section')
            // If class contains section (e.g. "10-A", "10 A", "10th A", "10th-A"), split if no separate section mapped
            let finalClass = classRaw
            let finalSection = sectionRaw
            if (!sectionRaw && classRaw) {
                const match = classRaw.trim().match(/^(.*?)[-\s]+([A-Za-z])$/)
                if (match) {
                    finalClass = match[1].trim()
                    finalSection = match[2].toUpperCase().trim()
                }
            }
            const firstAdmClass = get('firstAdmissionClass') || finalClass

            return {
                scholarNo: get('scholarNo'),
                fullName: get('fullName'),
                fatherName: get('fatherName'),
                motherName: get('motherName'),
                gender: get('gender'),
                dob: get('dob'),
                mobileNo: get('mobileNo'),
                parentMobileNo: get('parentMobileNo'),
                email: get('email'),
                caste: get('caste'),
                medium: get('medium'),
                address: get('address'),
                aadhaarNo: get('aadhaarNo'),
                penId: get('penId'),
                aparId: get('aparId'),
                samagraId: get('samagraId'),
                className: finalClass,
                section: finalSection,
                firstAdmissionDate: get('firstAdmissionDate'),
                firstAdmissionClass: firstAdmClass,
                bankName: get('bankName'),
                bankAccountNo: get('bankAccountNo'),
                ifsc: get('ifsc'),
            }
        })
    }

    const handlePreview = async () => {
        if (!rawExcelRows.length) return
        setImportLoading(true)
        try {
            const rows = buildStudentRows()
            const res = await fetch('/api/students/bulk-import', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ students: rows })
            })
            const data = await res.json()
            if (data.success) {
                setImportPreviews(data.previews)
                setImportStep('preview')
            } else {
                alert(data.error || 'Preview failed')
            }
        } catch (e: any) {
            alert('Error: ' + e.message)
        }
        setImportLoading(false)
    }

    const handleImport = async () => {
        if (!importPreviews.filter(p => p.willImport).length) return
        if (!confirm(`Import ${importPreviews.filter(p => p.willImport).length} students? This cannot be undone.`)) return
        setImportLoading(true)
        try {
            const rows = buildStudentRows()
            const res = await fetch('/api/students/bulk-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ students: rows })
            })
            const data = await res.json()
            if (data.success) {
                setImportResult(data)
                setImportStep('result')
                fetchStudents()
            } else {
                alert(data.error || 'Import failed')
            }
        } catch (e: any) {
            alert('Error: ' + e.message)
        }
        setImportLoading(false)
    }

    const closeImportModal = () => {
        setShowImportModal(false)
        setImportFile(null)
        setImportPreviews([])
        setImportStep('upload')
        setImportResult(null)
        setExcelHeaders([])
        setRawExcelRows([])
        setColMap({})
        if (importFileRef.current) importFileRef.current.value = ''
    }

    return (
        <div>
            <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" strategy="lazyOnload" />
            <Script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js" strategy="lazyOnload" />

            {/* ======================== EXCEL IMPORT MODAL ======================== */}
            {showImportModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--surface)', borderRadius: '20px', width: '100%', maxWidth: '900px',
                        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.4)', border: '1px solid var(--border)'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px 24px', borderBottom: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08))'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '44px', height: '44px', borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '22px', boxShadow: '0 4px 12px rgba(16,185,129,0.35)'
                                }}>📥</div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>Excel Bulk Import</h2>
                                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {importStep === 'upload' && 'Upload your Excel file with student data'}
                                        {importStep === 'preview' && `Preview — ${importPreviews.filter(p => p.willImport).length} will import, ${importPreviews.filter(p => !p.willImport).length} skipped/error`}
                                        {importStep === 'result' && '✅ Import complete!'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={closeImportModal} style={{
                                background: 'rgba(239,68,68,0.12)', border: 'none', color: '#ef4444',
                                width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer',
                                fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700'
                            }}>✕</button>
                        </div>

                        {/* Steps indicator */}
                        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {[{ id: 'upload', label: '1. Upload' }, { id: 'preview', label: '2. Preview' }, { id: 'result', label: '3. Done' }].map((s, i) => (
                                <React.Fragment key={s.id}>
                                    <div style={{
                                        padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                                        background: importStep === s.id ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'var(--surface-hover)',
                                        color: importStep === s.id ? 'white' : 'var(--text-muted)'
                                    }}>{s.label}</div>
                                    {i < 2 && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>›</span>}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

                            {/* STEP 1: UPLOAD */}
                            {importStep === 'upload' && (
                                <div>
                                    {/* File drop zone */}
                                    <div
                                        onClick={() => importFileRef.current?.click()}
                                        style={{
                                            border: '2px dashed var(--border)', borderRadius: '16px',
                                            padding: '40px', textAlign: 'center', cursor: 'pointer',
                                            transition: 'all 0.2s', marginBottom: '20px',
                                            background: importFile ? 'rgba(16,185,129,0.06)' : 'var(--surface-hover)',
                                            borderColor: importFile ? '#10b981' : 'var(--border)'
                                        }}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleExcelFile(f) }}
                                    >
                                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>{importFile ? '✅' : '📊'}</div>
                                        <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                                            {importFile ? importFile.name : 'Click to upload or drag & drop'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            {importFile ? `${rawExcelRows.length} data rows found` : 'Supports .xlsx, .xls, .csv files'}
                                        </div>
                                        <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
                                            onChange={e => { const f = e.target.files?.[0]; if (f) handleExcelFile(f) }} />
                                    </div>

                                    {/* Column mapping — shown after file is loaded */}
                                    {excelHeaders.length > 0 && (
                                        <div>
                                            <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px' }}>🗺️ Column Mapping</h3>
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>Columns auto-detected from your Excel headers. Adjust if needed:</p>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                                                {[
                                                    { field: 'scholarNo', label: '🏷️ Scholar No. *' },
                                                    { field: 'fullName', label: '👤 Student Name *' },
                                                    { field: 'fatherName', label: '👨 Father Name *' },
                                                    { field: 'motherName', label: '👩 Mother Name' },
                                                    { field: 'gender', label: '⚧ Gender' },
                                                    { field: 'dob', label: '🎂 Birth Date (DOB)' },
                                                    { field: 'mobileNo', label: '📱 Mobile No. *' },
                                                    { field: 'parentMobileNo', label: '📱 Parent Mobile No.' },
                                                    { field: 'email', label: '📧 Email / Mail ID' },
                                                    { field: 'caste', label: '🏷️ Caste' },
                                                    { field: 'medium', label: '📚 Medium' },
                                                    { field: 'address', label: '🏠 Address' },
                                                    { field: 'aadhaarNo', label: '🪪 Aadhaar No.' },
                                                    { field: 'penId', label: '🆔 PEN ID' },
                                                    { field: 'aparId', label: '🆔 APAR ID' },
                                                    { field: 'samagraId', label: '🆔 Samagra ID' },
                                                    { field: 'className', label: '🏫 Class *' },
                                                    { field: 'section', label: '🏫 Section/Batch' },
                                                    { field: 'firstAdmissionDate', label: '📅 First Admission Date' },
                                                    { field: 'firstAdmissionClass', label: '🏫 First Admission Class' },
                                                    { field: 'bankName', label: '🏦 Bank Name' },
                                                    { field: 'bankAccountNo', label: '🔢 Bank Account No.' },
                                                    { field: 'ifsc', label: '🔢 IFSC Code' },
                                                ].map(({ field, label }) => (
                                                    <div key={field} style={{
                                                        background: 'var(--surface-hover)', borderRadius: '10px',
                                                        padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '4px'
                                                    }}>
                                                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>{label}</label>
                                                        <select
                                                            className="input"
                                                            style={{ fontSize: '12px', padding: '6px 10px' }}
                                                            value={colMap[field] ?? ''}
                                                            onChange={e => setColMap(prev => ({ ...prev, [field]: e.target.value }))}
                                                        >
                                                            <option value="">-- Not mapped --</option>
                                                            {excelHeaders.map((h, i) => (
                                                                <option key={i} value={String(i)}>{h}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 2: PREVIEW */}
                            {importStep === 'preview' && (
                                <div>
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                        {[
                                            { label: 'Will Import', count: importPreviews.filter(p => p.willImport).length, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                                            { label: 'Skipped (Duplicate)', count: importPreviews.filter(p => !p.willImport && p.issue?.includes('Duplicate')).length, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                                            { label: 'Errors', count: importPreviews.filter(p => !p.willImport && !p.issue?.includes('Duplicate')).length, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
                                        ].map(s => (
                                            <div key={s.label} style={{
                                                padding: '10px 20px', borderRadius: '12px', background: s.bg,
                                                border: `1px solid ${s.color}40`, textAlign: 'center'
                                            }}>
                                                <div style={{ fontSize: '24px', fontWeight: '900', color: s.color }}>{s.count}</div>
                                                <div style={{ fontSize: '11px', color: s.color, fontWeight: '600' }}>{s.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--surface-hover)' }}>
                                                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700' }}>Status</th>
                                                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700' }}>Scholar No.</th>
                                                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700' }}>Student Name</th>
                                                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700' }}>Father Name</th>
                                                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700' }}>Gender / DOB</th>
                                                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700' }}>Mobile</th>
                                                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700' }}>Class → Matched</th>
                                                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700' }}>Issue</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importPreviews.map((p, i) => (
                                                    <tr key={i} style={{
                                                        borderTop: '1px solid var(--border)',
                                                        background: p.willImport ? 'rgba(16,185,129,0.04)' : (p.issue?.includes('Duplicate') ? 'rgba(245,158,11,0.04)' : 'rgba(239,68,68,0.04)')
                                                    }}>
                                                        <td style={{ padding: '8px 12px' }}>
                                                            <span style={{
                                                                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                                                                background: p.willImport ? 'rgba(16,185,129,0.15)' : (p.issue?.includes('Duplicate') ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'),
                                                                color: p.willImport ? '#10b981' : (p.issue?.includes('Duplicate') ? '#f59e0b' : '#ef4444')
                                                            }}>
                                                                {p.willImport ? '✓ Import' : (p.issue?.includes('Duplicate') ? '⏭ Skip' : '✗ Error')}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '8px 12px', fontWeight: '600' }}>{p.scholarNo || '—'}</td>
                                                        <td style={{ padding: '8px 12px' }}>{p.fullName || '—'}</td>
                                                        <td style={{ padding: '8px 12px' }}>{p.fatherName || '—'}</td>
                                                        <td style={{ padding: '8px 12px', fontSize: '11px' }}>
                                                            <span style={{ fontWeight: '600', color: p.gender === 'FEMALE' ? '#ec4899' : '#3b82f6' }}>{p.gender || '—'}</span>
                                                            {p.dob && <div style={{ color: 'var(--text-muted)' }}>{p.dob}</div>}
                                                        </td>
                                                        <td style={{ padding: '8px 12px' }}>{p.mobileNo || '—'}</td>
                                                        <td style={{ padding: '8px 12px' }}>
                                                            {p.className}{p.section ? ` / ${p.section}` : ''}
                                                            {p.matchedClass && <span style={{ color: '#10b981', marginLeft: '4px' }}>→ {p.matchedClass}</span>}
                                                        </td>
                                                        <td style={{ padding: '8px 12px', color: '#ef4444', fontSize: '11px' }}>{p.issue || ''}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: RESULT */}
                            {importStep === 'result' && importResult && (
                                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
                                    <h3 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '20px' }}>Import Complete!</h3>
                                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
                                        <div style={{ padding: '16px 28px', borderRadius: '14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                                            <div style={{ fontSize: '32px', fontWeight: '900', color: '#10b981' }}>{importResult.summary.imported}</div>
                                            <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '700' }}>Imported</div>
                                        </div>
                                        <div style={{ padding: '16px 28px', borderRadius: '14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                                            <div style={{ fontSize: '32px', fontWeight: '900', color: '#f59e0b' }}>{importResult.summary.skipped}</div>
                                            <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '700' }}>Skipped</div>
                                        </div>
                                        <div style={{ padding: '16px 28px', borderRadius: '14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                            <div style={{ fontSize: '32px', fontWeight: '900', color: '#ef4444' }}>{importResult.summary.errors}</div>
                                            <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '700' }}>Errors</div>
                                        </div>
                                    </div>
                                    <button onClick={closeImportModal} className="btn btn-primary" style={{ fontSize: '14px', padding: '12px 32px' }}>Done — View Students</button>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        {importStep !== 'result' && (
                            <div style={{
                                padding: '16px 24px', borderTop: '1px solid var(--border)',
                                display: 'flex', gap: '10px', justifyContent: 'flex-end',
                                background: 'var(--surface-hover)'
                            }}>
                                {importStep === 'preview' && (
                                    <button onClick={() => setImportStep('upload')} className="btn btn-secondary" disabled={importLoading}>← Back</button>
                                )}
                                <button onClick={closeImportModal} className="btn btn-secondary" disabled={importLoading}>Cancel</button>
                                {importStep === 'upload' && (
                                    <button
                                        onClick={handlePreview}
                                        className="btn btn-primary"
                                        disabled={importLoading || !rawExcelRows.length || !colMap['scholarNo'] || !colMap['fullName']}
                                        style={{ background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none' }}
                                    >
                                        {importLoading ? '⏳ Processing...' : '👁️ Preview Data →'}
                                    </button>
                                )}
                                {importStep === 'preview' && (
                                    <button
                                        onClick={handleImport}
                                        className="btn btn-primary"
                                        disabled={importLoading || !importPreviews.filter(p => p.willImport).length}
                                        style={{ background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none' }}
                                    >
                                        {importLoading ? '⏳ Importing...' : `📥 Import ${importPreviews.filter(p => p.willImport).length} Students`}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* ===================================================================== */}

            <div className="page-header">
                <div>
                    <h1 className="page-title">👨‍🎓 Students</h1>
                    <p className="page-subtitle">{students.length} students registered</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setShowImportModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 18px', borderRadius: '10px', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white', border: 'none', fontWeight: '700', fontSize: '14px',
                            boxShadow: '0 2px 8px rgba(16,185,129,0.35)'
                        }}
                    >📥 Import from Excel</button>
                    <Link href="/dashboard/students/add" className="btn btn-primary">➕ Add Student</Link>
                </div>
            </div>

            {/* Smart Selection Bar */}
            <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    {/* Mode Selector Dropdown */}
                    <div ref={modeDropdownRef} style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                            onClick={() => setShowModeDropdown(v => !v)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 16px', borderRadius: '10px', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: 'white', border: 'none', fontWeight: '700', fontSize: '14px',
                                whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(99,102,241,0.35)'
                            }}
                        >
                            {selectionMode === 'name' && '👤 By Name'}
                            {selectionMode === 'scholar' && '🏷️ By Scholar No.'}
                            {selectionMode === 'classwise' && '🏫 Classwise'}
                            <span style={{ fontSize: '10px', opacity: 0.85 }}>▼</span>
                        </button>
                        {showModeDropdown && (
                            <div style={{
                                position: 'absolute', top: '110%', left: 0, zIndex: 999,
                                background: 'var(--surface)', border: '1px solid var(--border)',
                                borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                                minWidth: '200px', overflow: 'hidden'
                            }}>
                                {[
                                    { id: 'name', icon: '👤', label: 'By Student Name', desc: 'Search by full name' },
                                    { id: 'scholar', icon: '🏷️', label: 'By Scholar No.', desc: 'Search by scholar number' },
                                    { id: 'classwise', icon: '🏫', label: 'Classwise Selection', desc: 'Browse by class & batch' },
                                ].map(opt => (
                                    <div
                                        key={opt.id}
                                        onClick={() => { setSelectionMode(opt.id as any); setShowModeDropdown(false); setSearch(''); }}
                                        style={{
                                            padding: '12px 16px', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center',
                                            background: selectionMode === opt.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                                            borderLeft: selectionMode === opt.id ? '3px solid #6366f1' : '3px solid transparent',
                                            transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = selectionMode === opt.id ? 'rgba(99,102,241,0.1)' : 'transparent')}
                                    >
                                        <span style={{ fontSize: '18px' }}>{opt.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>{opt.label}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{opt.desc}</div>
                                        </div>
                                        {selectionMode === opt.id && <span style={{ marginLeft: 'auto', color: '#6366f1', fontWeight: '900' }}>✓</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Search input and direct student dropdown — shown for name/scholar modes */}
                    {selectionMode !== 'classwise' && (
                        <div style={{ flex: 1, minWidth: '280px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px', display: 'flex', gap: '8px' }}>
                                <input
                                    className="input"
                                    style={{ flex: 1 }}
                                    placeholder={selectionMode === 'name' ? '🔍 Type student name or search...' : '🔍 Type scholar no. or search...'}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && fetchStudents()}
                                    list={selectionMode === 'name' ? 'students-name-datalist' : 'students-scholar-datalist'}
                                />
                                <datalist id="students-name-datalist">
                                    {students.map(s => (
                                        <option key={s.id} value={s.fullName}>
                                            {s.fullName} {s.scholarNo ? `(Sch: ${s.scholarNo})` : ''} - {s.courseName}
                                        </option>
                                    ))}
                                </datalist>
                                <datalist id="students-scholar-datalist">
                                    {students.filter(s => s.scholarNo).map(s => (
                                        <option key={s.id} value={s.scholarNo}>
                                            {s.scholarNo} - {s.fullName} ({s.courseName})
                                        </option>
                                    ))}
                                </datalist>
                                <button className="btn btn-primary" onClick={fetchStudents} style={{ whiteSpace: 'nowrap' }}>
                                    🔍 Search
                                </button>
                            </div>

                            {/* Direct Dropdown to select a student */}
                            <div style={{ minWidth: '220px' }}>
                                <select
                                    className="input"
                                    value=""
                                    onChange={e => {
                                        const selected = students.find(s => s.id === e.target.value)
                                        if (selected) {
                                            setSelectedStudent(selected)
                                            setSearch(selectionMode === 'name' ? selected.fullName : (selected.scholarNo || selected.fullName))
                                        }
                                    }}
                                >
                                    <option value="">
                                        {selectionMode === 'name' ? '👤 Select by Student Name...' : '🏷️ Select by Scholar No...'}
                                    </option>
                                    {students
                                        .slice()
                                        .sort((a, b) => selectionMode === 'name' ? a.fullName.localeCompare(b.fullName) : (a.scholarNo || '').localeCompare(b.scholarNo || ''))
                                        .map(s => (
                                            <option key={s.id} value={s.id}>
                                                {selectionMode === 'name'
                                                    ? `${s.fullName} ${s.scholarNo ? `(Sch: ${s.scholarNo})` : ''} - ${s.courseName}`
                                                    : `${s.scholarNo || 'No Sch#'} - ${s.fullName} (${s.courseName})`}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Classwise selectors */}
                    {selectionMode === 'classwise' && (
                        <div style={{ flex: 1, display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div style={{ minWidth: '180px', flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600' }}>SELECT CLASS</label>
                                <select
                                    className="input"
                                    value={selectedCourseId}
                                    onChange={e => handleCourseSelect(e.target.value)}
                                >
                                    <option value="">-- Select Class --</option>
                                    {courses.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            {selectedCourseId && (
                                <div style={{ minWidth: '160px', flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600' }}>SELECT BATCH (OPTIONAL)</label>
                                    <select
                                        className="input"
                                        value={selectedBatchId}
                                        onChange={e => handleBatchSelect(e.target.value)}
                                    >
                                        <option value="">-- All Batches --</option>
                                        {batches.map((b: any) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <button
                                className="btn btn-primary"
                                onClick={() => fetchClasswiseStudents()}
                                disabled={!selectedCourseId || classwiseLoading}
                                style={{ whiteSpace: 'nowrap', alignSelf: 'flex-end' }}
                            >
                                {classwiseLoading ? '⏳ Loading...' : '🔄 Refresh List'}
                            </button>
                        </div>
                    )}

                    <button className="btn btn-secondary" onClick={() => { setSearch(''); if (selectionMode === 'classwise') { setClasswiseStudents([]); setClasswiseFetched(false); setSelectedCourseId(''); setSelectedBatchId(''); } else { setTimeout(fetchStudents, 0); } }} style={{ whiteSpace: 'nowrap', alignSelf: 'flex-end' }}>🔄 Refresh</button>
                </div>
            </div>

            {/* Classwise Student List */}
            {selectionMode === 'classwise' && classwiseFetched && (
                <div className="card" style={{ marginBottom: '20px', padding: 0 }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                            <div style={{ fontWeight: '800', fontSize: '16px', color: 'var(--text-primary)' }}>
                                🏫 {courses.find(c => c.id === selectedCourseId)?.name || 'Class'}
                                {selectedBatchId && batches.find(b => b.id === selectedBatchId) && (
                                    <span style={{ marginLeft: '8px', fontSize: '13px', color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                                        {batches.find(b => b.id === selectedBatchId)?.name}
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {classwiseStudents.length} student{classwiseStudents.length !== 1 ? 's' : ''} found
                            </div>
                        </div>
                        {/* Download Buttons */}
                        {classwiseStudents.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => downloadCSV(classwiseStudents, `${courses.find(c => c.id === selectedCourseId)?.name || 'Class'}${selectedBatchId ? '_' + (batches.find(b => b.id === selectedBatchId)?.name || '') : ''}_Students`)}
                                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontWeight: '700', fontSize: '12px' }}
                                >
                                    📥 Download CSV
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => downloadExcel(classwiseStudents, `${courses.find(c => c.id === selectedCourseId)?.name || 'Class'}${selectedBatchId ? '_' + (batches.find(b => b.id === selectedBatchId)?.name || '') : ''}_Students`)}
                                    style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.3)', fontWeight: '700', fontSize: '12px' }}
                                >
                                    📊 Download Excel
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => downloadClasswisePDF(classwiseStudents, courses.find(c => c.id === selectedCourseId)?.name || '', batches.find(b => b.id === selectedBatchId)?.name || '')}
                                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontWeight: '700', fontSize: '12px' }}
                                >
                                    📄 Download PDF
                                </button>
                            </div>
                        )}
                    </div>
                    {classwiseLoading ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}>
                            <div className="spinner" style={{ margin: '0 auto 12px', width: '32px', height: '32px' }} />
                            <p style={{ color: 'var(--text-muted)' }}>Loading students...</p>
                        </div>
                    ) : classwiseStudents.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}>
                            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                            <p style={{ color: 'var(--text-muted)' }}>No students found for this class{selectedBatchId ? '/batch' : ''}.</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Scholar No.</th>
                                        <th>Student</th>
                                        <th>Father Name</th>
                                        <th>Gender</th>
                                        <th>Phone</th>
                                        <th>Status</th>
                                        <th>Fee Status</th>
                                        <th>Admission</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {classwiseStudents.map((s, idx) => {
                                        const owing = s.totalFee - s.paidFee
                                        const pct = s.totalFee > 0 ? Math.round((s.paidFee / s.totalFee) * 100) : 0
                                        return (
                                            <tr key={s.id}>
                                                <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{idx + 1}</td>
                                                <td>
                                                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{s.scholarNo || '-'}</span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '14px' }}>{s.fullName.charAt(0)}</div>
                                                        <div>
                                                            <div style={{ fontWeight: '600', fontSize: '13px' }}>{s.fullName}</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.studentId}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: '13px' }}>{s.fatherName || '-'}</td>
                                                <td style={{ fontSize: '13px' }}>{s.gender || '-'}</td>
                                                <td style={{ fontSize: '13px' }}>{s.phone || '-'}</td>
                                                <td><span className={`badge ${statusColors[s.status] || 'badge-gray'}`}>{s.status}</span></td>
                                                <td>
                                                    <div style={{ fontSize: '11px', color: owing > 0 ? '#f59e0b' : '#10b981', fontWeight: '600' }}>
                                                        {pct}% {owing > 0 ? `• Due: ${formatCurrency(owing)}` : '✓'}
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.admissionDate ? formatDate(s.admissionDate) : '-'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button onClick={() => setSelectedStudent(s)} className="btn btn-secondary btn-sm" title="View">👁️</button>
                                                        {canEditOrDelete && (
                                                            <button onClick={() => { setSelectedStudent(s); setEditForm(s); setIsEditing(true); }} className="btn btn-secondary btn-sm" title="Edit">✏️</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Bottom Download Options Below List */}
                    {classwiseStudents.length > 0 && (
                        <div style={{
                            padding: '16px 20px',
                            background: 'var(--surface-2)',
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px'
                        }}>
                            <div>
                                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>📥</span> Download {courses.find(c => c.id === selectedCourseId)?.name || 'Class'} Student List
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    Download all {classwiseStudents.length} students of {courses.find(c => c.id === selectedCourseId)?.name || 'Class'}{selectedBatchId ? ` (${batches.find(b => b.id === selectedBatchId)?.name})` : ''} in PDF, Excel, or CSV
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => downloadClasswisePDF(classwiseStudents, courses.find(c => c.id === selectedCourseId)?.name || '', batches.find(b => b.id === selectedBatchId)?.name || '')}
                                    style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px' }}
                                >
                                    📄 Download in PDF
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => downloadExcel(classwiseStudents, `${courses.find(c => c.id === selectedCourseId)?.name || 'Class'}${selectedBatchId ? '_' + (batches.find(b => b.id === selectedBatchId)?.name || '') : ''}_Students`)}
                                    style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.3)', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px' }}
                                >
                                    📊 Download in Excel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => downloadCSV(classwiseStudents, `${courses.find(c => c.id === selectedCourseId)?.name || 'Class'}${selectedBatchId ? '_' + (batches.find(b => b.id === selectedBatchId)?.name || '') : ''}_Students`)}
                                    style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px' }}
                                >
                                    📥 Download in CSV
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                    { label: 'Total', value: students.length, color: '#6366f1' },
                    { label: 'Active', value: students.filter(s => s.status === 'ACTIVE').length, color: '#10b981' },
                    { label: 'Dropout', value: students.filter(s => s.status === 'DROPOUT').length, color: '#ef4444' },
                    { label: 'With Dues', value: students.filter(s => s.totalFee > s.paidFee).length, color: '#f59e0b' },
                ].map(s => (
                    <div key={s.label} style={{ padding: '14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}>
                            <div className="spinner" style={{ margin: '0 auto 12px', width: '32px', height: '32px' }} />
                            <p style={{ color: 'var(--text-muted)' }}>Loading students...</p>
                        </div>
                    ) : students.length === 0 ? (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍🎓</div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '16px' }}>No students found</p>
                            <Link href="/dashboard/students/add" className="btn btn-primary">Add First Student</Link>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Scholar No.</th>
                                    <th>Student</th>
                                    <th>Class / Section</th>
                                    <th>Phone</th>
                                    <th>Parent Login</th>
                                    <th>Fee Status</th>
                                    <th>Status</th>
                                    <th>Admission</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(s => {
                                    const owing = s.totalFee - s.paidFee
                                    const pct = s.totalFee > 0 ? Math.round((s.paidFee / s.totalFee) * 100) : 0
                                    return (
                                        <tr key={s.id}>
                                            <td>
                                                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                    {s.scholarNo || '-'}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div className="avatar">
                                                        {s.fullName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            {s.hasSiblings && (
                                                                <span 
                                                                    title={`👨‍👩‍👧 Has ${s.siblingsCount || 1} Sibling(s) linked`} 
                                                                    style={{ 
                                                                        display: 'inline-flex', 
                                                                        alignItems: 'center', 
                                                                        justifyContent: 'center', 
                                                                        width: '18px', 
                                                                        height: '18px', 
                                                                        borderRadius: '50%', 
                                                                        background: 'linear-gradient(135deg, #10b981, #059669)', 
                                                                        color: 'white', 
                                                                        fontSize: '13px', 
                                                                        fontWeight: '900', 
                                                                        lineHeight: '1',
                                                                        boxShadow: '0 0 5px rgba(16, 185, 129, 0.45)',
                                                                        cursor: 'help'
                                                                    }}>
                                                                    +
                                                                </span>
                                                            )}
                                                            <span>{s.fullName}</span>
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.studentId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '13px', fontWeight: '600' }}>{s.courseName}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.batchName}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '13px' }}>{s.phone}</div>
                                                {s.parentPhone && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>P: {s.parentPhone}</div>}
                                            </td>
                                            <td>
                                                {s.parentEmail ? (
                                                    <div style={{ fontSize: '12px' }}>
                                                        <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{s.parentEmail}</div>
                                                        <div style={{ color: 'var(--text-muted)' }}>Pass: {s.parentPassword || '***'}</div>
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Not linked</div>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ marginBottom: '4px' }}>
                                                    <div className="progress-bar" style={{ height: '4px' }}>
                                                        <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? '#10b981' : pct > 50 ? '#f59e0b' : '#ef4444' }} />
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '11px', color: owing > 0 ? '#f59e0b' : '#10b981', fontWeight: '600' }}>
                                                    {pct}% paid {owing > 0 ? `• Due: ${formatCurrency(owing)}` : '✓'}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${statusColors[s.status] || 'badge-gray'}`}>{s.status}</span>
                                            </td>
                                            <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                                {s.admissionDate ? formatDate(s.admissionDate) : '-'}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button onClick={() => setSelectedStudent(s)} className="btn btn-secondary btn-sm" title="View">👁️</button>
                                                    {canEditOrDelete && (
                                                        <>
                                                            <button onClick={() => { setSelectedStudent(s); setEditForm(s); setIsEditing(true); }} className="btn btn-secondary btn-sm" title="Edit">✏️</button>
                                                            <button onClick={() => toggleBlock(s)} className={`btn btn-sm ${s.status === 'ACTIVE' ? 'btn-secondary' : 'btn-success'}`} title={s.status === 'ACTIVE' ? 'Block' : 'Unblock'}>
                                                                {s.status === 'ACTIVE' ? '🚫' : '✅'}
                                                            </button>
                                                            <button onClick={() => handleDelete(s.id)} className="btn btn-secondary btn-sm" style={{ color: '#ef4444' }} title="Delete">🗑️</button>
                                                        </>
                                                    )}
                                                    <a href={`https://wa.me/${s.parentPhone?.replace(/\D/g, '') || s.phone?.replace(/\D/g, '')}`} target="_blank" className="btn btn-sm" style={{ background: '#25d366', color: 'white', textDecoration: 'none' }} title="WhatsApp">💬</a>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Student Detail / Edit Modal */}
            {selectedStudent && (
                <div className="modal-overlay" onClick={() => { setSelectedStudent(null); setIsEditing(false); }}>
                    <div className="modal" style={{ maxWidth: isEditing ? '600px' : '750px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="avatar" style={{ width: '48px', height: '48px', fontSize: '20px' }}>{selectedStudent.fullName.charAt(0)}</div>
                                <div>
                                    <h3 style={{ fontWeight: '700', fontSize: '18px' }}>{isEditing ? 'Edit Student' : selectedStudent.fullName}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{selectedStudent.studentId}</p>
                                </div>
                            </div>
                            <button onClick={() => { setSelectedStudent(null); setIsEditing(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                            {isEditing ? (
                                <form onSubmit={handleUpdate} className="grid-cols-2" style={{ gap: '16px' }}>
                                    <div><label className="label">Scholar No.</label><input className="input" value={editForm.scholarNo || ''} onChange={e => setEditForm({...editForm, scholarNo: e.target.value})} /></div>
                                    <div><label className="label">Full Name</label><input className="input" value={editForm.fullName || ''} onChange={e => setEditForm({...editForm, fullName: e.target.value})} /></div>
                                    <div><label className="label">Phone</label><input className="input" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div>
                                    <div><label className="label">Parent Phone</label><input className="input" value={editForm.parentPhone || ''} onChange={e => setEditForm({...editForm, parentPhone: e.target.value})} /></div>
                                    <div><label className="label">Father's Name</label><input className="input" value={editForm.fatherName || ''} onChange={e => setEditForm({...editForm, fatherName: e.target.value})} /></div>
                                    <div><label className="label">Mother's Name</label><input className="input" value={editForm.motherName || ''} onChange={e => setEditForm({...editForm, motherName: e.target.value})} /></div>
                                    <div><label className="label">DOB</label><input type="date" className="input" value={editForm.dob ? new Date(editForm.dob).toISOString().split('T')[0] : ''} onChange={e => setEditForm({...editForm, dob: e.target.value})} /></div>
                                    <div><label className="label">DOB in words</label><input className="input" value={editForm.dobInWords || ''} onChange={e => setEditForm({...editForm, dobInWords: e.target.value})} /></div>
                                    <div>
                                        <label className="label">Gender</label>
                                        <select className="input" value={editForm.gender || 'MALE'} onChange={e => setEditForm({...editForm, gender: e.target.value})}>
                                            <option value="MALE">Male</option>
                                            <option value="FEMALE">Female</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Caste</label>
                                        <select className="input" value={editForm.caste || 'General'} onChange={e => setEditForm({...editForm, caste: e.target.value})}>
                                            <option value="General">General</option>
                                            <option value="SC">SC</option>
                                            <option value="ST">ST</option>
                                            <option value="OBC">OBC</option>
                                            <option value="OTHER">OTHER</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Medium</label>
                                        <select className="input" value={editForm.medium || 'Hindi'} onChange={e => setEditForm({...editForm, medium: e.target.value})}>
                                            <option value="Hindi">Hindi</option>
                                            <option value="English">English</option>
                                        </select>
                                    </div>
                                    <div><label className="label">Aadhaar No</label><input className="input" value={editForm.aadhaarNo || ''} onChange={e => setEditForm({...editForm, aadhaarNo: e.target.value})} /></div>
                                    <div><label className="label">Samagra ID</label><input className="input" value={editForm.samagraId || ''} onChange={e => setEditForm({...editForm, samagraId: e.target.value})} /></div>
                                    <div><label className="label">PEN ID</label><input className="input" value={editForm.penId || ''} onChange={e => setEditForm({...editForm, penId: e.target.value})} /></div>
                                    <div><label className="label">APAR ID</label><input className="input" value={editForm.aparId || ''} onChange={e => setEditForm({...editForm, aparId: e.target.value})} /></div>
                                    <div><label className="label">Total Fee</label><input type="number" className="input" value={editForm.totalFee || ''} onChange={e => setEditForm({...editForm, totalFee: e.target.value})} /></div>
                                    <div>
                                        <label className="label">Status</label>
                                        <select className="input" value={editForm.status || 'ACTIVE'} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                                            <option value="ACTIVE">ACTIVE</option>
                                            <option value="INACTIVE">INACTIVE</option>
                                            <option value="DROPOUT">DROPOUT</option>
                                            <option value="PASSED">PASSED</option>
                                        </select>
                                    </div>
                                    <div><label className="label">Bank Name</label><input className="input" value={editForm.bankName || ''} onChange={e => setEditForm({...editForm, bankName: e.target.value})} /></div>
                                    <div><label className="label">Bank Account No.</label><input className="input" value={editForm.bankAccountNo || ''} onChange={e => setEditForm({...editForm, bankAccountNo: e.target.value})} /></div>
                                    <div className="col-span-2"><label className="label">IFSC Code</label><input className="input" value={editForm.ifsc || ''} onChange={e => setEditForm({...editForm, ifsc: e.target.value})} /></div>
                                    
                                    {/* Sibling Management Section */}
                                    <div className="col-span-2" style={{ marginTop: '10px', padding: '16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                                                    👨‍👩‍👧 Family Siblings ({siblingList.length + 1}/3 Children)
                                                </h4>
                                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    Link up to 3 siblings studying in this school for joint ledger & fee management
                                                </p>
                                            </div>
                                            {siblingList.length + 1 < 3 ? (
                                                <button 
                                                    type="button" 
                                                    onClick={() => { setShowAddSiblingBox(!showAddSiblingBox); setSiblingFeedback(null); }}
                                                    className="btn btn-sm"
                                                    style={{ background: showAddSiblingBox ? '#334155' : 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', fontWeight: '700', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}
                                                >
                                                    {showAddSiblingBox ? '✕ Close Search' : '➕ Add Sibling'}
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>
                                                    ✓ Max 3 Siblings Linked
                                                </span>
                                            )}
                                        </div>

                                        {/* Feedback message */}
                                        {siblingFeedback && (
                                            <div style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px', fontWeight: '600', background: siblingFeedback.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: siblingFeedback.type === 'success' ? '#10b981' : '#ef4444', border: `1px solid ${siblingFeedback.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                                                {siblingFeedback.msg}
                                            </div>
                                        )}

                                        {/* Currently Linked Siblings List */}
                                        {loadingSiblings ? (
                                            <div style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>Loading siblings...</div>
                                        ) : siblingList.length === 0 ? (
                                            <div style={{ padding: '12px', textAlign: 'center', background: 'var(--surface)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>No siblings linked yet. Click "➕ Add Sibling" to search by Student Name or Scholar No.</p>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                                {siblingList.map((sib: any) => (
                                                    <div key={sib.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                                        <div>
                                                            <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span>👫 {sib.fullName}</span>
                                                                {sib.scholarNo && (
                                                                    <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                                                        Sch: {sib.scholarNo}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                                {sib.courseName} • {sib.batchName} &nbsp;|&nbsp; 👨 {sib.fatherName || 'Father N/A'}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <span style={{ fontSize: '11px', fontWeight: '700', color: sib.outstanding > 0 ? '#f59e0b' : '#10b981' }}>
                                                                {sib.outstanding > 0 ? `Due: ${formatCurrency(sib.outstanding)}` : '✓ Paid'}
                                                            </span>
                                                            <button 
                                                                type="button" 
                                                                disabled={siblingActionLoading}
                                                                onClick={() => handleRemoveSibling(sib.id, sib.fullName)}
                                                                className="btn btn-secondary btn-sm"
                                                                style={{ color: '#ef4444', fontSize: '11px', padding: '4px 8px' }}
                                                                title="Remove Sibling Link"
                                                            >
                                                                ❌ Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Search Student Box for Adding Sibling */}
                                        {showAddSiblingBox && siblingList.length + 1 < 3 && (
                                            <div style={{ marginTop: '12px', padding: '14px', background: 'var(--surface)', border: '1px solid #6366f1', borderRadius: '10px' }}>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                                                    🔍 Search Student by Scholar No. or Name:
                                                </label>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <input 
                                                        type="text"
                                                        className="input"
                                                        value={siblingSearchQuery}
                                                        onChange={e => handleSiblingSearch(e.target.value)}
                                                        placeholder="Type Scholar No or Student Name..."
                                                        style={{ flex: 1 }}
                                                        autoFocus
                                                    />
                                                    {siblingSearchQuery && (
                                                        <button type="button" onClick={() => handleSiblingSearch('')} className="btn btn-secondary btn-sm">Clear</button>
                                                    )}
                                                </div>

                                                {/* Search results */}
                                                <div style={{ marginTop: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                                                    {searchingSiblings ? (
                                                        <div style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>Searching students...</div>
                                                    ) : siblingSearchQuery && siblingCandidates.length === 0 ? (
                                                        <div style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>No students found matching "{siblingSearchQuery}"</div>
                                                    ) : (
                                                        siblingCandidates.map((candidate: any) => {
                                                            const wouldExceed = (siblingList.length + 1) + candidate.currentGroupSize > 3
                                                            return (
                                                                <div key={candidate.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                                                                    <div>
                                                                        <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                                                                            {candidate.fullName} 
                                                                            {candidate.scholarNo && <span style={{ marginLeft: '6px', color: '#818cf8' }}>(Sch: {candidate.scholarNo})</span>}
                                                                        </div>
                                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                            {candidate.courseName} • {candidate.batchName} {candidate.fatherName ? `| F: ${candidate.fatherName}` : ''}
                                                                        </div>
                                                                    </div>
                                                                    <button 
                                                                        type="button"
                                                                        disabled={siblingActionLoading || wouldExceed}
                                                                        onClick={() => handleAddSibling(candidate.id)}
                                                                        className="btn btn-primary btn-sm"
                                                                        style={{ fontSize: '11px', padding: '4px 10px', opacity: wouldExceed ? 0.5 : 1 }}
                                                                        title={wouldExceed ? 'Cannot link: total would exceed 3 siblings limit' : 'Add as Sibling'}
                                                                    >
                                                                        {wouldExceed ? 'Limit Exceeded' : '➕ Add Sibling'}
                                                                    </button>
                                                                </div>
                                                            )
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-span-2" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                        <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ flex: 1 }}>
                                            {actionLoading ? 'Saving...' : '💾 Save Changes'}
                                        </button>
                                        <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <div>
                                    <div className="grid-cols-2">
                                        {[
                                            ['🏷️ Scholar No.', selectedStudent.scholarNo || 'N/A'],
                                            ['📱 Phone', selectedStudent.phone],
                                            ['👨 Father', selectedStudent.fatherName || 'N/A'],
                                            ['📧 Email', selectedStudent.email || 'N/A'],
                                            ['📞 Parent Phone', selectedStudent.parentPhone || 'N/A'],
                                            ['📚 Class', selectedStudent.courseName],
                                            ['🕐 Section', selectedStudent.batchName],
                                            ['💰 Total Fee', formatCurrency(selectedStudent.totalFee)],
                                            ['✅ Paid', formatCurrency(selectedStudent.paidFee)],
                                            ['⚠️ Pending', formatCurrency(selectedStudent.totalFee - selectedStudent.paidFee)],
                                            ['📅 Admission', selectedStudent.admissionDate ? formatDate(selectedStudent.admissionDate) : 'N/A'],
                                            ['🚩 Status', selectedStudent.status],
                                            ['🪪 Aadhaar No.', selectedStudent.aadhaarNo || 'N/A'],
                                            ['🆔 PEN ID', selectedStudent.penId || 'N/A'],
                                            ['🆔 APAR ID', selectedStudent.aparId || 'N/A'],
                                            ['🆔 Samagra ID', selectedStudent.samagraId || 'N/A'],
                                        ].map(([label, value]) => (
                                            <div key={label} style={{ padding: '10px', background: 'var(--surface-2)', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
                                                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Linked Siblings in View Mode */}
                                    {siblingList.length > 0 && (
                                        <div style={{ marginTop: '20px', padding: '16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                👨‍👩‍👧 Linked Siblings ({siblingList.length + 1} Family Members)
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {siblingList.map((sib: any) => (
                                                    <div key={sib.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                                        <div>
                                                            <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                                                                👫 {sib.fullName} {sib.scholarNo && <span style={{ fontSize: '11px', color: '#818cf8' }}>(Sch: {sib.scholarNo})</span>}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                {sib.courseName} • {sib.batchName} {sib.fatherName ? `| Father: ${sib.fatherName}` : ''}
                                                            </div>
                                                        </div>
                                                        <span style={{ fontSize: '11px', fontWeight: '700', color: sib.outstanding > 0 ? '#f59e0b' : '#10b981' }}>
                                                            {sib.outstanding > 0 ? `Due: ${formatCurrency(sib.outstanding)}` : '✓ Cleared'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Report Cards Section */}
                            {!isEditing && selectedStudent.examResults && selectedStudent.examResults.length > 0 && (
                                <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                                    <h4 style={{ fontWeight: '700', marginBottom: '16px' }}>📑 Student Report Cards</h4>
                                    {Object.entries(
                                        selectedStudent.examResults.reduce((acc: any, er: any) => {
                                            const title = er.exam?.title || 'Unknown Exam'
                                            if (!acc[title]) acc[title] = []
                                            acc[title].push(er)
                                            return acc
                                        }, {})
                                    ).map(([examTitle, results]: any, index) => {
                                        let grandTotalMax = 0
                                        let grandTotalObtained = 0
                                        const courseSubjects = selectedStudent.courseSubjects || []
                                        
                                        const subjectRows = courseSubjects.map((subject: string) => {
                                            const res = results.find((r: any) => r.exam?.subject === subject)
                                            if (res) {
                                                grandTotalMax += res.exam?.maxMarks || 0
                                                grandTotalObtained += res.marksObtained || 0
                                            }
                                            return { subject, max: res ? res.exam?.maxMarks : '-', obtained: res ? res.marksObtained : '-', remarks: res?.remarks || '-' }
                                        })
                                        results.forEach((r: any) => {
                                            if (r.exam?.subject && !courseSubjects.includes(r.exam.subject)) {
                                                grandTotalMax += r.exam?.maxMarks || 0
                                                grandTotalObtained += r.marksObtained || 0
                                                subjectRows.push({ subject: r.exam.subject, max: r.exam.maxMarks, obtained: r.marksObtained, remarks: r.remarks || '-' })
                                            }
                                        })
                                        const percentage = grandTotalMax > 0 ? ((grandTotalObtained / grandTotalMax) * 100).toFixed(2) : 0
                                        const reportCardId = `report-card-${index}`

                                        return (
                                            <div key={examTitle} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
                                                <div id={reportCardId} style={{ padding: '24px', background: '#1e293b', color: 'white' }}>
                                                    <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid #334155', paddingBottom: '16px' }}>
                                                        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '800' }}>School Admin Report</h2>
                                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: '#10b981' }}>{examTitle}</h3>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '14px' }}>
                                                        <div>
                                                            <p style={{ margin: '4px 0' }}><strong>Student:</strong> {selectedStudent.fullName}</p>
                                                            <p style={{ margin: '4px 0' }}><strong>Class:</strong> {selectedStudent.courseName}</p>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <p style={{ margin: '4px 0' }}><strong>Section:</strong> {selectedStudent.batchName}</p>
                                                            <p style={{ margin: '4px 0' }}><strong>ID:</strong> {selectedStudent.studentId || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', border: '1px solid #334155' }}>
                                                        <thead>
                                                            <tr style={{ background: 'rgba(99,102,241,0.1)' }}>
                                                                <th style={{ padding: '10px', border: '1px solid #334155', textAlign: 'left', color: '#cbd5e1', fontSize: '12px' }}>Subject</th>
                                                                <th style={{ padding: '10px', border: '1px solid #334155', textAlign: 'center', color: '#cbd5e1', fontSize: '12px' }}>Max</th>
                                                                <th style={{ padding: '10px', border: '1px solid #334155', textAlign: 'center', color: '#cbd5e1', fontSize: '12px' }}>Obtained</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {subjectRows.map((row: any, i: number) => (
                                                                <tr key={i}>
                                                                    <td style={{ padding: '10px', border: '1px solid #334155', fontSize: '13px', fontWeight: '600' }}>{row.subject}</td>
                                                                    <td style={{ padding: '10px', border: '1px solid #334155', fontSize: '13px', textAlign: 'center' }}>{row.max}</td>
                                                                    <td style={{ padding: '10px', border: '1px solid #334155', fontSize: '13px', textAlign: 'center', fontWeight: '700', color: row.obtained !== '-' ? '#10b981' : 'inherit' }}>{row.obtained}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot>
                                                            <tr style={{ background: 'rgba(16,185,129,0.1)' }}>
                                                                <td style={{ padding: '10px', border: '1px solid #334155', fontWeight: '800', textAlign: 'right', fontSize: '13px' }}>TOTAL ({percentage}%)</td>
                                                                <td style={{ padding: '10px', border: '1px solid #334155', textAlign: 'center', fontWeight: '800', fontSize: '13px' }}>{grandTotalMax}</td>
                                                                <td style={{ padding: '10px', border: '1px solid #334155', textAlign: 'center', fontWeight: '800', color: '#10b981', fontSize: '13px' }}>{grandTotalObtained}</td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                                <div style={{ padding: '12px', background: '#0f172a', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end' }}>
                                                    <button onClick={() => downloadPDF(reportCardId, `${selectedStudent.fullName}_${examTitle}`)} className="btn btn-secondary btn-sm" style={{ background: '#ef4444', color: 'white', border: 'none' }}>
                                                        📄 Download PDF
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                        </div>
                        {!isEditing && (
                            <div className="modal-footer">
                                {canEditOrDelete && (
                                    <button onClick={() => { setEditForm(selectedStudent); setIsEditing(true); }} className="btn btn-secondary">✏️ Edit Details</button>
                                )}
                                <button onClick={() => downloadPDF('admission-form-content', `${selectedStudent.fullName}_Admission_Form`)} className="btn btn-primary">📄 Admission Form</button>
                                <a href={`https://wa.me/${(selectedStudent.parentPhone || selectedStudent.phone)?.replace(/\D/g, '')}?text=Dear Parent, This is regarding ${selectedStudent.fullName} from our school.`} target="_blank" className="btn btn-success">💬 WhatsApp Parent</a>
                                <button onClick={() => setSelectedStudent(null)} className="btn btn-secondary">Close</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Hidden Admission Form for PDF */}
            {selectedStudent && (
                <div style={{ display: 'none' }}>
                    <div id="admission-form-content" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
                            {tenant?.logo && <img src={tenant.logo} alt="Logo" style={{ height: '60px', marginBottom: '10px' }} />}
                            <h1 style={{ margin: 0, fontSize: '24px', textTransform: 'uppercase' }}>{tenant?.name || 'SCHOOL NAME'}</h1>
                            <p style={{ margin: '5px 0' }}>{tenant?.address || 'School Address'}</p>
                            <p style={{ margin: '0' }}>Phone: {tenant?.phone || '-'} | Email: {tenant?.email || '-'}</p>
                            <h2 style={{ marginTop: '15px', textDecoration: 'underline' }}>ADMISSION FORM</h2>
                        </div>
                        
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '8px', width: '25%', fontWeight: 'bold' }}>Scholar No.</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', width: '25%' }}>{selectedStudent.scholarNo || '-'}</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', width: '25%', fontWeight: 'bold' }}>Admission Date</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', width: '25%' }}>{selectedStudent.admissionDate ? formatDate(selectedStudent.admissionDate) : '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Student Name</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={3}>{selectedStudent.fullName}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Date of Birth</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedStudent.dob ? formatDate(selectedStudent.dob) : '-'}</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>DOB (In Words)</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedStudent.dobInWords || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Gender</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedStudent.gender || '-'}</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Caste / Medium</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{(selectedStudent.caste || '-') + ' / ' + (selectedStudent.medium || '-')}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Class & Section</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedStudent.courseName} - {selectedStudent.batchName}</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Phone Number</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedStudent.phone || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Father's Name</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedStudent.fatherName || '-'}</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Mother's Name</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedStudent.motherName || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Parent Phone</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedStudent.parentPhone || '-'}</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Aadhaar / Samagra</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{(selectedStudent.aadhaarNo || '-') + ' / ' + (selectedStudent.samagraId || '-')}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Bank Name</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedStudent.bankName || '-'}</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>A/C & IFSC</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{(selectedStudent.bankAccountNo || '-') + ' / ' + (selectedStudent.ifsc || '-')}</td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', padding: '0 20px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ borderBottom: '1px solid #000', width: '150px', marginBottom: '5px' }}></div>
                                <p style={{ margin: 0 }}>Parent/Guardian Signature</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ borderBottom: '1px solid #000', width: '150px', marginBottom: '5px' }}></div>
                                <p style={{ margin: 0 }}>Authorized Signatory</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
