import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth, requireWriteAccess, checkPlanLimit } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'
import { cleanGovtId, convertDateToWords } from '@/lib/utils'

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
        if (resolvedBatchId && resolvedBatchId !== 'all') {
            const batchStudentCount = await prisma.student.count({
                where: { tenantId: user!.tenantId, batchId: resolvedBatchId, status: status ? (status as any) : undefined }
            })
            if (batchStudentCount > 0) {
                where.batchId = resolvedBatchId
            } else if (resolvedCourseId) {
                // Students enrolled in this course with batchId: null or matching
                where.courseId = resolvedCourseId
            } else {
                where.batchId = resolvedBatchId
            }
        }
        if (status) where.status = status
        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { studentId: { contains: search, mode: 'insensitive' } },
                { scholarNo: { contains: search, mode: 'insensitive' } },
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

        // Find sibling group counts
        const groupIds = Array.from(new Set(students.map(s => s.siblingGroupId).filter(Boolean) as string[]))
        const groupCounts: Record<string, number> = {}
        if (groupIds.length > 0) {
            const counts = await prisma.student.groupBy({
                by: ['siblingGroupId'],
                where: { tenantId: user!.tenantId, siblingGroupId: { in: groupIds } },
                _count: { id: true },
            })
            counts.forEach(c => {
                if (c.siblingGroupId) groupCounts[c.siblingGroupId] = c._count.id
            })
        }

        const data = students.map(s => {
            const groupSize = s.siblingGroupId ? (groupCounts[s.siblingGroupId] || 0) : 0
            const hasSiblings = groupSize > 1
            return {
                ...s,
                courseName: s.course?.name || '',
                courseSubjects: s.course?.subjects || [],
                batchName: s.batch?.name || '',
                dobInWords: s.dobInWords || (s.dob ? convertDateToWords(s.dob) : ''),
                aadhaarNo: cleanGovtId(s.aadhaarNo),
                penId: cleanGovtId(s.penId),
                aparId: cleanGovtId(s.aparId),
                samagraId: cleanGovtId(s.samagraId),
                parentEmail: s.parentLinks?.[0]?.user?.email || null,
                parentPassword: s.parentLinks?.[0]?.user?.plainPassword || null,
                hasSiblings,
                siblingsCount: hasSiblings ? groupSize - 1 : 0,
            }
        })

        // Total count for stats
        const totalCount = await prisma.student.count({ where: { tenantId: user!.tenantId } })

        return NextResponse.json({
            success: true,
            data,
            total: data.length,
            planInfo: {
                limit: -1,
                used: totalCount,
                currentPlan: 'UNLIMITED',
                canAdd: true,
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

        const body = await req.json()
        const { 
            fullName, phone, courseId, batchId, fatherName, motherName, parentPhone, email, address, gender, dob, 
            admissionDate, feePlan, totalFee, previousDueFee, notes, aadhaarNo, penId, aparId, samagraId,
            scholarNo, caste, dobInWords, medium, firstAdmissionClass, firstAdmissionDate, scholarshipScheme, 
            bankName, bankAccountNo, ifsc, subjectGroup, photo,
            aadhaarFront, aadhaarBack, samagraIdDoc, aparIdDoc, penIdDoc, bankPassbook
        } = body

        const trimmedScholarNo = scholarNo ? String(scholarNo).trim() : ''
        const trimmedFullName = fullName ? String(fullName).trim() : ''
        const trimmedFatherName = fatherName ? String(fatherName).trim() : ''

        if (!trimmedFullName || !phone || !courseId || !trimmedScholarNo || !trimmedFatherName) {
            return NextResponse.json({ 
                success: false,
                error: 'Required fields missing: Name, Phone, Course, Scholar No, and Father Name are mandatory.' 
            }, { status: 400 })
        }

        // STRICT RESTRICTION 1: Check by Scholar No. FIRST
        // No duplicate Scholar No. allowed within the tenant/school
        const existingStudentByScholar = await prisma.student.findFirst({
            where: {
                tenantId: user!.tenantId,
                scholarNo: {
                    equals: trimmedScholarNo,
                    mode: 'insensitive'
                }
            },
            include: {
                course: { select: { name: true } },
                batch: { select: { name: true } }
            }
        });

        if (existingStudentByScholar) {
            const classText = existingStudentByScholar.course?.name 
                ? ` [Class: ${existingStudentByScholar.course.name}${existingStudentByScholar.batch?.name ? ` - ${existingStudentByScholar.batch.name}` : ''}]` 
                : ''
            return NextResponse.json({ 
                success: false,
                duplicate: true,
                error: `Duplicate Entry! Scholar No. "${trimmedScholarNo}" already exists for student "${existingStudentByScholar.fullName}"${classText}. Duplicate student database me save nahi ho sakta.` 
            }, { status: 400 });
        }

        // RESTRICTION 2: Also check if student with same Name and Father Name already exists
        const existingStudentByNameAndFather = await prisma.student.findFirst({
            where: {
                tenantId: user!.tenantId,
                fullName: { equals: trimmedFullName, mode: 'insensitive' },
                fatherName: { equals: trimmedFatherName, mode: 'insensitive' }
            },
            include: {
                course: { select: { name: true } }
            }
        });

        if (existingStudentByNameAndFather) {
            return NextResponse.json({
                success: false,
                duplicate: true,
                error: `Duplicate Entry! Student "${trimmedFullName}" with Father's Name "${trimmedFatherName}" already exists with Scholar No. "${existingStudentByNameAndFather.scholarNo || 'N/A'}". Duplicate student database me save nahi ho sakta.`
            }, { status: 400 });
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
                batchId: batchId ? batchId : undefined,
                studentId: `STU${String(currentCount + 1).padStart(3, '0')}`,
                fullName: trimmedFullName,
                fatherName: trimmedFatherName,
                motherName: motherName ? String(motherName).trim() : '',
                phone,
                parentPhone: parentPhone || '',
                email: email || '',
                address: address || '',
                gender: gender as any || 'MALE',
                dob: dob ? new Date(dob) : undefined,
                admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
                feePlan: feePlan || '',
                previousDueFee: previousDueFee && !isNaN(parseFloat(previousDueFee)) ? parseFloat(previousDueFee) : 0,
                totalFee: totalFee && !isNaN(parseFloat(totalFee)) 
                    ? parseFloat(totalFee) 
                    : ((course.fees || 0) + (previousDueFee && !isNaN(parseFloat(previousDueFee)) ? parseFloat(previousDueFee) : 0)),
                paidFee: 0,
                status: 'ACTIVE',
                notes: notes || '',
                aadhaarNo: cleanGovtId(aadhaarNo),
                penId: cleanGovtId(penId),
                aparId: cleanGovtId(aparId),
                samagraId: cleanGovtId(samagraId),
                scholarNo: trimmedScholarNo,
                caste: caste || '',
                dobInWords: dobInWords || (dob ? convertDateToWords(dob) : ''),
                medium: medium || '',
                firstAdmissionClass: firstAdmissionClass || '',
                firstAdmissionDate: firstAdmissionDate ? new Date(firstAdmissionDate) : undefined,
                scholarshipScheme: scholarshipScheme || '',
                bankName: bankName || '',
                bankAccountNo: bankAccountNo || '',
                ifsc: ifsc || '',
                subjectGroup: subjectGroup || '',
                photo: photo || undefined,
                aadhaarFront: aadhaarFront || undefined,
                aadhaarBack: aadhaarBack || undefined,
                samagraIdDoc: samagraIdDoc || undefined,
                aparIdDoc: aparIdDoc || undefined,
                penIdDoc: penIdDoc || undefined,
                bankPassbook: bankPassbook || undefined,
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
    } catch (err: any) {
        console.error('Create student error:', err)
        return NextResponse.json({ error: 'Failed to create student: ' + (err.message || err.toString()) }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    const { error, user } = requireWriteAccess(req)
    if (error) return error

    try {
        const body = await req.json()
        const { 
            id, fullName, phone, courseId, batchId, status, fatherName, motherName, parentPhone, email, 
            totalFee, previousDueFee, admissionDate, notes, scholarNo, dob, dobInWords, gender, caste, medium, 
            aadhaarNo, samagraId, penId, aparId, bankName, bankAccountNo, ifsc, subjectGroup, photo,
            aadhaarFront, aadhaarBack, samagraIdDoc, aparIdDoc, penIdDoc, bankPassbook, scholarshipScheme
        } = body

        if (!id) return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })

        const existingStudent = await prisma.student.findUnique({
            where: { id, tenantId: user!.tenantId }
        })
        if (!existingStudent) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 })
        }

        let updatedPreviousDueFee: number | undefined = undefined
        if (previousDueFee !== undefined) {
            updatedPreviousDueFee = previousDueFee === '' ? 0 : (parseFloat(previousDueFee) || 0)
        }

        let updatedTotalFee: number | undefined = undefined
        const { baseFee } = body
        if (baseFee !== undefined && previousDueFee !== undefined) {
            const b = baseFee === '' ? 0 : (parseFloat(baseFee) || 0)
            const p = previousDueFee === '' ? 0 : (parseFloat(previousDueFee) || 0)
            updatedTotalFee = b + p
        } else if (totalFee !== undefined) {
            updatedTotalFee = parseFloat(totalFee) || 0
        } else if (updatedPreviousDueFee !== undefined) {
            const oldPrev = existingStudent.previousDueFee || 0
            const currentBase = Math.max(0, (existingStudent.totalFee || 0) - oldPrev)
            updatedTotalFee = currentBase + updatedPreviousDueFee
        }

        if (scholarNo !== undefined) {
            const trimmedScholar = scholarNo ? String(scholarNo).trim() : ''
            if (trimmedScholar) {
                const duplicateScholar = await prisma.student.findFirst({
                    where: {
                        tenantId: user!.tenantId,
                        scholarNo: { equals: trimmedScholar, mode: 'insensitive' },
                        NOT: { id: id }
                    }
                })
                if (duplicateScholar) {
                    return NextResponse.json({
                        success: false,
                        duplicate: true,
                        error: `Duplicate Entry! Scholar No. "${trimmedScholar}" is already assigned to "${duplicateScholar.fullName}". Duplicate student record save nahi ho sakta.`
                    }, { status: 400 })
                }
            }
        }

        const student = await prisma.student.update({
            where: { id, tenantId: user!.tenantId },
            data: {
                fullName: fullName !== undefined ? (fullName ? String(fullName).trim() : '') : undefined,
                phone,
                courseId,
                batchId: batchId !== undefined ? (batchId || null) : undefined,
                status: status as any,
                fatherName: fatherName !== undefined ? (fatherName ? String(fatherName).trim() : '') : undefined,
                motherName,
                parentPhone,
                email,
                totalFee: updatedTotalFee !== undefined ? updatedTotalFee : undefined,
                previousDueFee: updatedPreviousDueFee !== undefined ? updatedPreviousDueFee : undefined,
                admissionDate: admissionDate ? new Date(admissionDate) : undefined,
                notes,
                scholarNo: scholarNo !== undefined ? (scholarNo ? String(scholarNo).trim() : '') : undefined,
                dob: dob ? new Date(dob) : undefined,
                dobInWords: dobInWords !== undefined 
                    ? (dobInWords ? String(dobInWords).trim() : '') 
                    : (dob ? convertDateToWords(dob) : undefined),
                gender: gender as any,
                caste: caste !== undefined ? caste : undefined,
                medium: medium !== undefined ? medium : undefined,
                aadhaarNo: aadhaarNo !== undefined ? cleanGovtId(aadhaarNo) : undefined,
                samagraId: samagraId !== undefined ? cleanGovtId(samagraId) : undefined,
                penId: penId !== undefined ? cleanGovtId(penId) : undefined,
                aparId: aparId !== undefined ? cleanGovtId(aparId) : undefined,
                bankName: bankName !== undefined ? bankName : undefined,
                bankAccountNo: bankAccountNo !== undefined ? bankAccountNo : undefined,
                ifsc: ifsc !== undefined ? ifsc : undefined,
                subjectGroup: subjectGroup !== undefined ? subjectGroup : undefined,
                photo: photo !== undefined ? photo : undefined,
                aadhaarFront: aadhaarFront !== undefined ? aadhaarFront : undefined,
                aadhaarBack: aadhaarBack !== undefined ? aadhaarBack : undefined,
                samagraIdDoc: samagraIdDoc !== undefined ? samagraIdDoc : undefined,
                aparIdDoc: aparIdDoc !== undefined ? aparIdDoc : undefined,
                penIdDoc: penIdDoc !== undefined ? penIdDoc : undefined,
                bankPassbook: bankPassbook !== undefined ? bankPassbook : undefined,
                scholarshipScheme: scholarshipScheme !== undefined ? (scholarshipScheme || '') : undefined,
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
