import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

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
            const fullName = row.fullName ? String(row.fullName).trim() : ''
            const fatherName = row.fatherName ? String(row.fatherName).trim() : ''
            const mobileNo = row.mobileNo ? String(row.mobileNo).trim() : ''
            const parentMobileNo = row.parentMobileNo ? String(row.parentMobileNo).trim() : ''
            const phone = mobileNo
            const parentPhone = parentMobileNo || mobileNo
            const classRaw = row.className ? String(row.className).trim() : ''
            const sectionRaw = row.section ? String(row.section).trim() : ''

            if (!scholarNo) { results.push({ scholarNo: '?', fullName, status: 'error', reason: 'Scholar No. missing' }); continue }
            if (!fullName) { results.push({ scholarNo, fullName: '?', status: 'error', reason: 'Student name missing' }); continue }
            if (!fatherName) { results.push({ scholarNo, fullName, status: 'error', reason: 'Father name missing' }); continue }
            if (!phone) { results.push({ scholarNo, fullName, status: 'error', reason: 'Mobile No. missing' }); continue }
            if (!classRaw) { results.push({ scholarNo, fullName, status: 'error', reason: 'Class/Course missing' }); continue }

            const existingByScholar = await prisma.student.findFirst({
                where: { tenantId: user!.tenantId, scholarNo: { equals: scholarNo, mode: 'insensitive' } }
            })
            if (existingByScholar) {
                results.push({ scholarNo, fullName, status: 'skipped', reason: `Already exists (${existingByScholar.fullName})` })
                continue
            }

            let matchedCourse = allCourses.find(c => c.name.toLowerCase() === classRaw.toLowerCase())
            if (!matchedCourse) {
                matchedCourse = allCourses.find(c =>
                    classRaw.toLowerCase().includes(c.name.toLowerCase()) ||
                    c.name.toLowerCase().includes(classRaw.toLowerCase())
                )
            }
            if (!matchedCourse) {
                results.push({ scholarNo, fullName, status: 'error', reason: `Class "${classRaw}" not found in system` })
                continue
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
                        motherName: row.motherName ? String(row.motherName).trim() : '',
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
                        gender: 'MALE',
                        status: 'ACTIVE',
                        totalFee: matchedCourse.fees || 0,
                        paidFee: 0,
                        admissionDate: new Date(),
                        notes: '',
                        dobInWords: '',
                        subjectGroup: '',
                        scholarshipScheme: '',
                        feePlan: '',
                    }
                })

                for (let i = 0; i < 6; i++) {
                    const dueDate = new Date()
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
            const fullName = row.fullName ? String(row.fullName).trim() : ''
            const fatherName = row.fatherName ? String(row.fatherName).trim() : ''
            const mobileNo = row.mobileNo ? String(row.mobileNo).trim() : ''
            const classRaw = row.className ? String(row.className).trim() : ''
            const sectionRaw = row.section ? String(row.section).trim() : ''

            let issue = ''
            let willImport = true
            let matchedClassName = ''

            if (!scholarNo) { issue = 'Scholar No. missing'; willImport = false }
            else if (!fullName) { issue = 'Student name missing'; willImport = false }
            else if (!fatherName) { issue = 'Father name missing'; willImport = false }
            else if (!mobileNo) { issue = 'Mobile No. missing'; willImport = false }
            else if (!classRaw) { issue = 'Class missing'; willImport = false }
            else {
                const dup = await prisma.student.findFirst({
                    where: { tenantId: user!.tenantId, scholarNo: { equals: scholarNo, mode: 'insensitive' } }
                })
                if (dup) { issue = `Duplicate — already exists (${dup.fullName})`; willImport = false }
                else {
                    let matchedCourse = allCourses.find(c => c.name.toLowerCase() === classRaw.toLowerCase())
                    if (!matchedCourse) matchedCourse = allCourses.find(c =>
                        classRaw.toLowerCase().includes(c.name.toLowerCase()) ||
                        c.name.toLowerCase().includes(classRaw.toLowerCase())
                    )
                    if (!matchedCourse) { issue = `Class "${classRaw}" not found in system`; willImport = false }
                    else { matchedClassName = matchedCourse.name }
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
                willImport,
                issue
            })
        }

        return NextResponse.json({ success: true, previews })
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
