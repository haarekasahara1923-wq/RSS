import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

// Normalize class name: removes "th", "st", "nd", "rd" suffixes, "class", "std", Roman numerals, etc.
// e.g. "10th " -> "10", "10th Class" -> "10", "Class 10" -> "10", "Class X" -> "10", "1st" -> "1"
function normalizeClassName(raw: string): string {
    if (!raw) return ''
    let cleaned = raw
        .trim()
        .toLowerCase()
        .replace(/\b(class|std|standard|grade|kaksha|कक्षा)\b/gi, '')
        .replace(/(\d+)(st|nd|rd|th)\b/gi, '$1') // "10th" -> "10"
        .replace(/\s+/g, ' ')
        .trim()

    // Roman numeral mapping
    const romanMap: Record<string, string> = {
        'i': '1', 'ii': '2', 'iii': '3', 'iv': '4', 'v': '5',
        'vi': '6', 'vii': '7', 'viii': '8', 'ix': '9', 'x': '10',
        'xi': '11', 'xii': '12'
    }
    const words = cleaned.split(' ').map(w => romanMap[w] || w)
    return words.join(' ').trim()
}

function courseMatches(courseName: string, classRaw: string): boolean {
    const normCourse = normalizeClassName(courseName)
    const normClass = normalizeClassName(classRaw)
    if (!normCourse || !normClass) return false
    if (normCourse === normClass) return true

    const courseTokens = normCourse.split(/[\s\-_/]+/)
    const classTokens = normClass.split(/[\s\-_/]+/)

    // Primary token matching (e.g. "10" matches "10th", "Class 10", "10 A")
    if (courseTokens[0] && classTokens[0] && courseTokens[0] === classTokens[0]) {
        return true
    }

    // Word boundary regex check
    const escapedClass = normClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (new RegExp(`(^|\\b|\\s)${escapedClass}(\\b|\\s|$)`, 'i').test(normCourse)) return true

    const escapedCourse = normCourse.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (new RegExp(`(^|\\b|\\s)${escapedCourse}(\\b|\\s|$)`, 'i').test(normClass)) return true

    return false
}

// Parse a date string from Excel (supports DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, serial numbers)
function parseDate(val: any): Date | undefined {
    if (!val) return undefined
    if (val instanceof Date && !isNaN(val.getTime())) return val
    const s = String(val).trim()
    if (!s) return undefined

    // Excel serial number (e.g. 44562)
    if (/^\d{4,5}$/.test(s)) {
        const excelEpoch = new Date(1899, 11, 30)
        const d = new Date(excelEpoch.getTime() + Number(s) * 86400000)
        return isNaN(d.getTime()) ? undefined : d
    }

    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
    if (dmyMatch) {
        const [, d, m, y] = dmyMatch
        const year = y.length === 2 ? (Number(y) > 50 ? 1900 + Number(y) : 2000 + Number(y)) : Number(y)
        const date = new Date(year, Number(m) - 1, Number(d))
        return isNaN(date.getTime()) ? undefined : date
    }

    // YYYY/MM/DD or YYYY-MM-DD
    const ymdMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
    if (ymdMatch) {
        const [, y, m, d] = ymdMatch
        const date = new Date(Number(y), Number(m) - 1, Number(d))
        return isNaN(date.getTime()) ? undefined : date
    }

    const d = new Date(s)
    return isNaN(d.getTime()) ? undefined : d
}

// Normalize gender
function parseGender(val: any): 'MALE' | 'FEMALE' | 'OTHER' {
    if (!val) return 'MALE'
    const g = String(val).trim().toLowerCase()
    if (g === 'f' || g === 'female' || g === 'girl' || g === 'महिला' || g === 'स्त्री' || g === 'लड़की') return 'FEMALE'
    if (g === 'other' || g === 'o' || g === 'others' || g === 'अन्य') return 'OTHER'
    return 'MALE'
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const body = await req.json()
        const { students } = body

        if (!Array.isArray(students) || students.length === 0) {
            return NextResponse.json({ success: false, error: 'No student data provided' }, { status: 400 })
        }

        const allCourses = await prisma.course.findMany({
            where: { tenantId: user!.tenantId },
            include: { batches: true }
        })

        const results: {
            scholarNo: string
            fullName: string
            status: 'imported' | 'skipped' | 'error'
            reason?: string
        }[] = []

        let currentCount = await prisma.student.count({ where: { tenantId: user!.tenantId } })

        for (const row of students) {
            const scholarNo = row.scholarNo ? String(row.scholarNo).trim() : ''

            // ONLY Scholar No. is mandatory! If row has no scholarNo, skip it silently
            if (!scholarNo) {
                continue
            }

            // Duplicate check by Scholar No.
            const existingByScholar = await prisma.student.findFirst({
                where: { tenantId: user!.tenantId, scholarNo: { equals: scholarNo, mode: 'insensitive' } }
            })
            if (existingByScholar) {
                results.push({ scholarNo, fullName: existingByScholar.fullName, status: 'skipped', reason: `Already exists (${existingByScholar.fullName})` })
                continue
            }

            // All other fields are completely OPTIONAL with safe defaults
            const fullName = row.fullName ? String(row.fullName).trim() : `Student ${scholarNo}`
            const fatherName = row.fatherName ? String(row.fatherName).trim() : ''
            const motherName = row.motherName ? String(row.motherName).trim() : ''
            const mobileNo = row.mobileNo ? String(row.mobileNo).trim() : ''
            const parentMobileNo = row.parentMobileNo ? String(row.parentMobileNo).trim() : ''
            const phone = mobileNo || parentMobileNo || '0000000000'
            const parentPhone = parentMobileNo || mobileNo || phone
            const classRaw = row.className ? String(row.className).trim() : ''
            const sectionRaw = row.section ? String(row.section).trim() : ''

            // Optional fields with safe fallbacks
            const dob = parseDate(row.dob)
            const gender = parseGender(row.gender)
            const parsedAdmDate = parseDate(row.firstAdmissionDate) || parseDate(row.admissionDate)
            const admissionDate = parsedAdmDate || new Date()
            const firstAdmissionClass = row.firstAdmissionClass ? String(row.firstAdmissionClass).trim() : (classRaw || '')

            // Course resolution: Never reject due to class! Auto-create if not found
            let matchedCourse: any = classRaw ? allCourses.find(c => courseMatches(c.name, classRaw)) : null
            if (!matchedCourse && classRaw) {
                try {
                    matchedCourse = await prisma.course.create({
                        data: {
                            tenantId: user!.tenantId,
                            name: classRaw,
                            fees: 0,
                            subjects: []
                        },
                        include: { batches: true }
                    })
                    allCourses.push(matchedCourse)
                } catch (e) {
                    matchedCourse = allCourses.find(c => c.name.toLowerCase() === classRaw.toLowerCase()) || allCourses[0]
                }
            }
            if (!matchedCourse) {
                if (allCourses.length > 0) {
                    matchedCourse = allCourses[0]
                } else {
                    matchedCourse = await prisma.course.create({
                        data: {
                            tenantId: user!.tenantId,
                            name: classRaw || 'General',
                            fees: 0,
                            subjects: []
                        },
                        include: { batches: true }
                    })
                    allCourses.push(matchedCourse)
                }
            }

            let matchedBatch: any = null
            if (sectionRaw && matchedCourse.batches?.length > 0) {
                matchedBatch = matchedCourse.batches.find((b: any) =>
                    b.name.toLowerCase() === sectionRaw.toLowerCase() ||
                    b.name.toLowerCase().includes(sectionRaw.toLowerCase()) ||
                    sectionRaw.toLowerCase().includes(b.name.toLowerCase())
                )
            }

            try {
                currentCount++
                const created = await prisma.student.create({
                    data: {
                        tenantId: user!.tenantId,
                        courseId: matchedCourse.id,
                        batchId: matchedBatch?.id || undefined,
                        studentId: `STU${String(currentCount).padStart(3, '0')}`,
                        scholarNo,
                        fullName,
                        fatherName,
                        motherName,
                        phone,
                        parentPhone,
                        email: row.email ? String(row.email).trim() : '',
                        address: row.address ? String(row.address).trim() : '',
                        caste: row.caste ? String(row.caste).trim() : '',
                        medium: row.medium ? String(row.medium).trim() : '',
                        aadhaarNo: row.aadhaarNo ? String(row.aadhaarNo).trim() : '',
                        penId: row.penId ? String(row.penId).trim() : '',
                        aparId: row.aparId ? String(row.aparId).trim() : '',
                        samagraId: row.samagraId ? String(row.samagraId).trim() : '',
                        bankName: row.bankName ? String(row.bankName).trim() : '',
                        bankAccountNo: row.bankAccountNo ? String(row.bankAccountNo).trim() : '',
                        ifsc: row.ifsc ? String(row.ifsc).trim() : '',
                        gender,
                        dob: dob || undefined,
                        firstAdmissionDate: admissionDate,
                        firstAdmissionClass: firstAdmissionClass || undefined,
                        admissionDate: admissionDate,
                        status: 'ACTIVE',
                        totalFee: matchedCourse.fees || 0,
                        paidFee: 0,
                        notes: '',
                        dobInWords: '',
                        subjectGroup: '',
                        scholarshipScheme: '',
                        feePlan: '',
                    }
                })

                for (let i = 0; i < 6; i++) {
                    const dueDate = new Date(admissionDate)
                    dueDate.setMonth(dueDate.getMonth() + i)
                    await prisma.fee.create({
                        data: {
                            tenantId: user!.tenantId,
                            studentId: created.id,
                            amount: 0,
                            dueDate,
                            status: 'PENDING',
                            notes: `Installment ${i + 1}`
                        }
                    })
                }

                results.push({ scholarNo, fullName, status: 'imported' })
            } catch (saveErr: any) {
                currentCount--
                results.push({ scholarNo, fullName, status: 'error', reason: saveErr.message || 'Save failed' })
            }
        }

        const imported = results.filter(r => r.status === 'imported').length
        const skipped = results.filter(r => r.status === 'skipped').length
        const errors = results.filter(r => r.status === 'error').length

        return NextResponse.json({
            success: true,
            summary: { imported, skipped, errors, total: students.length },
            results
        })
    } catch (err: any) {
        console.error('Bulk import error:', err)
        return NextResponse.json({ success: false, error: 'Bulk import failed: ' + (err.message || err.toString()) }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const body = await req.json()
        const { students } = body

        if (!Array.isArray(students) || students.length === 0) {
            return NextResponse.json({ success: false, error: 'No student data provided' }, { status: 400 })
        }

        const allCourses = await prisma.course.findMany({
            where: { tenantId: user!.tenantId },
            include: { batches: true }
        })

        const previews: any[] = []

        for (const row of students) {
            const scholarNo = row.scholarNo ? String(row.scholarNo).trim() : ''

            // Only rows with scholarNo are processed
            if (!scholarNo) continue

            const fullName = row.fullName ? String(row.fullName).trim() : `Student ${scholarNo}`
            const fatherName = row.fatherName ? String(row.fatherName).trim() : ''
            const mobileNo = row.mobileNo ? String(row.mobileNo).trim() : ''
            const classRaw = row.className ? String(row.className).trim() : ''
            const sectionRaw = row.section ? String(row.section).trim() : ''
            const gender = parseGender(row.gender)
            const dob = parseDate(row.dob)
            const parsedAdmDate = parseDate(row.firstAdmissionDate) || parseDate(row.admissionDate)
            const firstAdmissionClass = row.firstAdmissionClass ? String(row.firstAdmissionClass).trim() : classRaw

            let issue = ''
            let willImport = true
            let matchedClassName = ''

            // Duplicate check
            const dup = await prisma.student.findFirst({
                where: { tenantId: user!.tenantId, scholarNo: { equals: scholarNo, mode: 'insensitive' } }
            })
            if (dup) {
                issue = `Duplicate — already exists (${dup.fullName})`
                willImport = false
            } else {
                const matchedCourse = classRaw ? allCourses.find(c => courseMatches(c.name, classRaw)) : null
                if (matchedCourse) {
                    matchedClassName = matchedCourse.name
                } else if (classRaw) {
                    matchedClassName = `${classRaw} (Auto-create)`
                } else if (allCourses.length > 0) {
                    matchedClassName = `${allCourses[0].name} (Default)`
                } else {
                    matchedClassName = 'General (Auto-create)'
                }
            }

            previews.push({
                scholarNo,
                fullName,
                fatherName,
                mobileNo,
                className: classRaw,
                matchedClass: matchedClassName,
                section: sectionRaw,
                gender,
                dob: dob ? dob.toLocaleDateString('en-IN') : '',
                firstAdmissionDate: parsedAdmDate ? parsedAdmDate.toLocaleDateString('en-IN') : '',
                firstAdmissionClass,
                willImport,
                issue
            })
        }

        return NextResponse.json({ success: true, previews })
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
