import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth, requireWriteAccess, checkPlanLimit } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const { search, course, courseId, batch, batchId, status } = Object.fromEntries(
            new URL(req.url).searchParams.entries()
        )

        const where: any = { tenantId: user!.tenantId }
        const resolvedCourseId = course || courseId
        const resolvedBatchId = batch || batchId
        if (resolvedCourseId) where.courseId = resolvedCourseId
        if (resolvedBatchId) where.batchId = resolvedBatchId
        if (status) where.status = status
        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { studentId: { contains: search, mode: 'insensitive' } },
            ]
        }

        const students = await prisma.student.findMany({
            where,
            include: {
                course: { select: { name: true, subjects: true } },
                batch: { select: { name: true } },
                parentLinks: { include: { user: { select: { email: true, plainPassword: true } } } },
                examResults: { include: { exam: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        const data = students.map(s => ({
            ...s,
            courseName: s.course.name,
            courseSubjects: s.course.subjects || [],
            batchName: s.batch.name,
            parentEmail: s.parentLinks?.[0]?.user?.email || null,
            parentPassword: s.parentLinks?.[0]?.user?.plainPassword || null,
        }))

        // Total count for plan limit
        const totalCount = await prisma.student.count({ where: { tenantId: user!.tenantId } })
        const limitCheck = await checkPlanLimit(user!.tenantId, 'maxStudents', totalCount)

        return NextResponse.json({
            success: true,
            data,
            total: data.length,
            planInfo: {
                limit: limitCheck.limit,
                used: totalCount,
                currentPlan: limitCheck.currentPlan,
                canAdd: limitCheck.allowed,
            },
        })
    } catch (err) {
        console.error('Fetch students error:', err)
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const currentCount = await prisma.student.count({ where: { tenantId: user!.tenantId } })
        const limitCheck = await checkPlanLimit(user!.tenantId, 'maxStudents', currentCount)

        if (!limitCheck.allowed) {
            return NextResponse.json({
                error: limitCheck.message,
                code: 'PLAN_LIMIT_REACHED',
                currentPlan: limitCheck.currentPlan,
                limit: limitCheck.limit,
                used: currentCount,
            }, { status: 403 })
        }

        const body = await req.json()
        const { 
            fullName, phone, courseId, batchId, fatherName, motherName, parentPhone, email, address, gender, dob, 
            admissionDate, feePlan, totalFee, notes, aadhaarNo, penId, aparId, samagraId,
            scholarNo, caste, dobInWords, medium, firstAdmissionClass, firstAdmissionDate, scholarshipScheme, 
            bankName, bankAccountNo, ifsc, subjectGroup, photo
        } = body

        if (!fullName || !phone || !courseId || !batchId) {
            return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
        }

        const course = await prisma.course.findUnique({
            where: { id: courseId, tenantId: user!.tenantId }
        })

        if (!course) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 })
        }

        const student = await prisma.student.create({
            data: {
                tenantId: user!.tenantId,
                courseId,
                batchId,
                studentId: `STU${String(currentCount + 1).padStart(3, '0')}`,
                fullName,
                fatherName: fatherName || '',
                motherName: motherName || '',
                phone,
                parentPhone: parentPhone || '',
                email: email || '',
                address: address || '',
                gender: gender as any || 'MALE',
                dob: dob ? new Date(dob) : null,
                admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
                feePlan: feePlan || '',
                totalFee: parseFloat(totalFee) || course.fees || 0,
                paidFee: 0,
                status: 'ACTIVE',
                notes: notes || '',
                aadhaarNo: aadhaarNo || '',
                penId: penId || '',
                aparId: aparId || '',
                samagraId: samagraId || '',
                scholarNo: scholarNo || '',
                caste: caste || '',
                dobInWords: dobInWords || '',
                medium: medium || '',
                firstAdmissionClass: firstAdmissionClass || '',
                firstAdmissionDate: firstAdmissionDate ? new Date(firstAdmissionDate) : null,
                scholarshipScheme: scholarshipScheme || '',
                bankName: bankName || '',
                bankAccountNo: bankAccountNo || '',
                ifsc: ifsc || '',
                subjectGroup: subjectGroup || '',
                photo: photo || null,
            }
        })

        // Create 6 Fee installments (blank slots as requested by user)
        const admDate = admissionDate ? new Date(admissionDate) : new Date()

        for (let i = 0; i < 6; i++) {
            const dueDate = new Date(admDate)
            dueDate.setMonth(dueDate.getMonth() + i)
            
            await prisma.fee.create({
                data: {
                    tenantId: user!.tenantId,
                    studentId: student.id,
                    amount: 0,
                    dueDate,
                    status: 'PENDING',
                    notes: `Installment ${i + 1}`
                }
            })
        }

        return NextResponse.json({ success: true, data: student }, { status: 201 })
    } catch (err) {
        console.error('Create student error:', err)
        return NextResponse.json({ error: 'Failed to create student' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    const { error, user } = requireWriteAccess(req)
    if (error) return error

    try {
        const body = await req.json()
        const { 
            id, fullName, phone, courseId, batchId, status, fatherName, motherName, parentPhone, email, 
            totalFee, admissionDate, notes, scholarNo, dob, dobInWords, gender, caste, medium, 
            aadhaarNo, samagraId, penId, aparId, bankName, bankAccountNo, ifsc, subjectGroup, photo
        } = body

        if (!id) return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })

        const student = await prisma.student.update({
            where: { id, tenantId: user!.tenantId },
            data: {
                fullName,
                phone,
                courseId,
                batchId,
                status: status as any,
                fatherName,
                motherName,
                parentPhone,
                email,
                totalFee: totalFee !== undefined ? parseFloat(totalFee) : undefined,
                admissionDate: admissionDate ? new Date(admissionDate) : undefined,
                notes,
                scholarNo: scholarNo !== undefined ? scholarNo : undefined,
                dob: dob ? new Date(dob) : undefined,
                dobInWords: dobInWords !== undefined ? dobInWords : undefined,
                gender: gender as any,
                caste: caste !== undefined ? caste : undefined,
                medium: medium !== undefined ? medium : undefined,
                aadhaarNo: aadhaarNo !== undefined ? aadhaarNo : undefined,
                samagraId: samagraId !== undefined ? samagraId : undefined,
                penId: penId !== undefined ? penId : undefined,
                aparId: aparId !== undefined ? aparId : undefined,
                bankName: bankName !== undefined ? bankName : undefined,
                bankAccountNo: bankAccountNo !== undefined ? bankAccountNo : undefined,
                ifsc: ifsc !== undefined ? ifsc : undefined,
                subjectGroup: subjectGroup !== undefined ? subjectGroup : undefined,
                photo: photo !== undefined ? photo : undefined,
            }
        })

        return NextResponse.json({ success: true, data: student })
    } catch (err) {
        console.error('Update student error:', err)
        return NextResponse.json({ error: 'Failed to update student' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const { error, user } = requireWriteAccess(req)
    if (error) return error

    try {
        const { id } = Object.fromEntries(new URL(req.url).searchParams.entries())
        if (!id) return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })

        // Check if student has payments or dependencies
        const payments = await prisma.payment.count({ where: { studentId: id } })
        if (payments > 0) {
            return NextResponse.json({ error: 'Cannot delete student with payment history. Block them instead.' }, { status: 400 })
        }

        await prisma.student.delete({
            where: { id, tenantId: user!.tenantId }
        })

        return NextResponse.json({ success: true, message: 'Student deleted' })
    } catch (err) {
        console.error('Delete student error:', err)
        return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 })
    }
}
