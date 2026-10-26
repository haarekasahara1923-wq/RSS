import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireWriteAccess } from '@/app/api/middleware'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * GET /api/students/siblings
 * Query params:
 *   studentId - ID of student to get siblings for
 *   search    - (Optional) search other students to link as sibling by Name or Scholar No
 */
export async function GET(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId')
    const search = searchParams.get('search')?.trim() || ''

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
    }

    const currentStudent = await prisma.student.findUnique({
      where: { id: studentId, tenantId: user!.tenantId },
      include: {
        course: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true } },
        parentLinks: { select: { id: true, name: true, phone: true } },
      },
    })

    if (!currentStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // If searching for candidates to add as sibling
    if (search) {
      const existingSiblingIds = new Set<string>([studentId])
      
      if (currentStudent.siblingGroupId) {
        const groupMembers = await prisma.student.findMany({
          where: { tenantId: user!.tenantId, siblingGroupId: currentStudent.siblingGroupId },
          select: { id: true },
        })
        groupMembers.forEach(m => existingSiblingIds.add(m.id))
      }

      const candidates = await prisma.student.findMany({
        where: {
          tenantId: user!.tenantId,
          id: { notIn: Array.from(existingSiblingIds) },
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { scholarNo: { contains: search, mode: 'insensitive' } },
            { studentId: { contains: search, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          fullName: true,
          scholarNo: true,
          studentId: true,
          phone: true,
          parentPhone: true,
          fatherName: true,
          totalFee: true,
          paidFee: true,
          status: true,
          siblingGroupId: true,
          course: { select: { name: true } },
          batch: { select: { name: true } },
        },
        take: 20,
        orderBy: { fullName: 'asc' },
      })

      // Count if candidates already belong to any sibling group
      const candidatesWithGroupInfo = await Promise.all(
        candidates.map(async (c) => {
          let currentGroupSize = 1
          if (c.siblingGroupId) {
            currentGroupSize = await prisma.student.count({
              where: { tenantId: user!.tenantId, siblingGroupId: c.siblingGroupId },
            })
          }
          return {
            ...c,
            courseName: c.course?.name || '',
            batchName: c.batch?.name || '',
            currentGroupSize,
            outstanding: Math.max(0, c.totalFee - c.paidFee),
          }
        })
      )

      return NextResponse.json({
        success: true,
        candidates: candidatesWithGroupInfo,
      })
    }

    // Otherwise, fetch current student's linked siblings
    let siblings: any[] = []
    let totalInGroup = 1

    if (currentStudent.siblingGroupId) {
      const groupStudents = await prisma.student.findMany({
        where: {
          tenantId: user!.tenantId,
          siblingGroupId: currentStudent.siblingGroupId,
        },
        select: {
          id: true,
          fullName: true,
          scholarNo: true,
          studentId: true,
          phone: true,
          parentPhone: true,
          fatherName: true,
          motherName: true,
          totalFee: true,
          paidFee: true,
          status: true,
          course: { select: { name: true } },
          batch: { select: { name: true } },
        },
        orderBy: { admissionDate: 'asc' },
      })

      totalInGroup = groupStudents.length
      siblings = groupStudents
        .filter(s => s.id !== studentId)
        .map(s => ({
          ...s,
          courseName: s.course?.name || '',
          batchName: s.batch?.name || '',
          outstanding: Math.max(0, s.totalFee - s.paidFee),
        }))
    } else {
      // Fallback: check if siblings exist by shared parentProfile
      if (currentStudent.parentLinks && currentStudent.parentLinks.length > 0) {
        const parentId = currentStudent.parentLinks[0].id
        const profileChildren = await prisma.student.findMany({
          where: {
            tenantId: user!.tenantId,
            parentLinks: { some: { id: parentId } },
          },
          select: {
            id: true,
            fullName: true,
            scholarNo: true,
            studentId: true,
            phone: true,
            parentPhone: true,
            fatherName: true,
            totalFee: true,
            paidFee: true,
            course: { select: { name: true } },
            batch: { select: { name: true } },
          },
        })

        if (profileChildren.length > 1) {
          totalInGroup = profileChildren.length
          siblings = profileChildren
            .filter(s => s.id !== studentId)
            .map(s => ({
              ...s,
              courseName: s.course?.name || '',
              batchName: s.batch?.name || '',
              outstanding: Math.max(0, s.totalFee - s.paidFee),
            }))
        }
      }
    }

    return NextResponse.json({
      success: true,
      student: {
        id: currentStudent.id,
        fullName: currentStudent.fullName,
        scholarNo: currentStudent.scholarNo,
        studentId: currentStudent.studentId,
        siblingGroupId: currentStudent.siblingGroupId,
        courseName: currentStudent.course?.name || '',
        batchName: currentStudent.batch?.name || '',
      },
      siblings,
      totalInGroup,
      canAddMore: totalInGroup < 3,
      maxAllowed: 3,
    })
  } catch (err: any) {
    console.error('Fetch siblings error:', err)
    return NextResponse.json({ error: 'Failed to fetch siblings: ' + (err.message || '') }, { status: 500 })
  }
}

/**
 * POST /api/students/siblings
 * Link a sibling to student
 * Body: { studentId: string, siblingId: string }
 */
export async function POST(req: NextRequest) {
  const { error, user } = requireWriteAccess(req)
  if (error) return error

  try {
    const body = await req.json()
    const { studentId, siblingId } = body

    if (!studentId || !siblingId) {
      return NextResponse.json({ error: 'studentId and siblingId are required' }, { status: 400 })
    }

    if (studentId === siblingId) {
      return NextResponse.json({ error: 'A student cannot be added as their own sibling' }, { status: 400 })
    }

    // Fetch both students
    const [studentA, studentB] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId, tenantId: user!.tenantId },
        include: { parentLinks: true },
      }),
      prisma.student.findUnique({
        where: { id: siblingId, tenantId: user!.tenantId },
        include: { parentLinks: true },
      }),
    ])

    if (!studentA || !studentB) {
      return NextResponse.json({ error: 'One or both students not found in this school' }, { status: 404 })
    }

    // Check existing groups
    let groupStudentsA: string[] = [studentA.id]
    if (studentA.siblingGroupId) {
      const inA = await prisma.student.findMany({
        where: { tenantId: user!.tenantId, siblingGroupId: studentA.siblingGroupId },
        select: { id: true },
      })
      groupStudentsA = inA.map(s => s.id)
    }

    let groupStudentsB: string[] = [studentB.id]
    if (studentB.siblingGroupId) {
      const inB = await prisma.student.findMany({
        where: { tenantId: user!.tenantId, siblingGroupId: studentB.siblingGroupId },
        select: { id: true },
      })
      groupStudentsB = inB.map(s => s.id)
    }

    // If already in the same group
    if (
      studentA.siblingGroupId &&
      studentB.siblingGroupId &&
      studentA.siblingGroupId === studentB.siblingGroupId
    ) {
      return NextResponse.json({ error: 'These students are already linked as siblings' }, { status: 400 })
    }

    // Combine unique IDs
    const combinedUniqueIds = Array.from(new Set([...groupStudentsA, ...groupStudentsB]))

    // Enforce maximum 3 siblings rule
    if (combinedUniqueIds.length > 3) {
      return NextResponse.json({
        error: `Maximum 3 siblings allowed in a family group. Linking these would make ${combinedUniqueIds.length} siblings in total.`,
      }, { status: 400 })
    }

    // Target sibling group ID
    const targetGroupId = studentA.siblingGroupId || studentB.siblingGroupId || `sib_${randomUUID()}`

    // Assign all combined students to this targetGroupId
    await prisma.student.updateMany({
      where: {
        id: { in: combinedUniqueIds },
        tenantId: user!.tenantId,
      },
      data: {
        siblingGroupId: targetGroupId,
      },
    })

    // If one of the students has parent info, sync parentPhone to the others if missing
    const sharedParentPhone = studentA.parentPhone || studentB.parentPhone || studentA.phone || studentB.phone
    if (sharedParentPhone) {
      await prisma.student.updateMany({
        where: {
          id: { in: combinedUniqueIds },
          tenantId: user!.tenantId,
          OR: [
            { parentPhone: null },
            { parentPhone: '' },
          ],
        },
        data: {
          parentPhone: sharedParentPhone,
        },
      })
    }

    // If either student has a ParentProfile linked, also link all group members to it
    const existingParentProfile = studentA.parentLinks?.[0] || studentB.parentLinks?.[0]
    if (existingParentProfile) {
      await prisma.parentProfile.update({
        where: { id: existingParentProfile.id },
        data: {
          children: {
            connect: combinedUniqueIds.map(id => ({ id })),
          },
        },
      })
    }

    // Fetch updated siblings for studentA
    const updatedGroup = await prisma.student.findMany({
      where: { tenantId: user!.tenantId, siblingGroupId: targetGroupId },
      select: {
        id: true,
        fullName: true,
        scholarNo: true,
        studentId: true,
        phone: true,
        parentPhone: true,
        fatherName: true,
        totalFee: true,
        paidFee: true,
        course: { select: { name: true } },
        batch: { select: { name: true } },
      },
    })

    const siblingsList = updatedGroup
      .filter(s => s.id !== studentId)
      .map(s => ({
        ...s,
        courseName: s.course?.name || '',
        batchName: s.batch?.name || '',
        outstanding: Math.max(0, s.totalFee - s.paidFee),
      }))

    return NextResponse.json({
      success: true,
      message: `${studentB.fullName} successfully added as sibling!`,
      siblingGroupId: targetGroupId,
      siblings: siblingsList,
      totalInGroup: updatedGroup.length,
      canAddMore: updatedGroup.length < 3,
    })
  } catch (err: any) {
    console.error('Add sibling error:', err)
    return NextResponse.json({ error: 'Failed to add sibling: ' + (err.message || '') }, { status: 500 })
  }
}

/**
 * DELETE /api/students/siblings
 * Unlink a sibling from group
 * Body: { studentId: string, siblingId: string }
 */
export async function DELETE(req: NextRequest) {
  const { error, user } = requireWriteAccess(req)
  if (error) return error

  try {
    const body = await req.json()
    const { studentId, siblingId } = body

    if (!studentId || !siblingId) {
      return NextResponse.json({ error: 'studentId and siblingId are required' }, { status: 400 })
    }

    const studentToUnlink = await prisma.student.findUnique({
      where: { id: siblingId, tenantId: user!.tenantId },
      select: { id: true, siblingGroupId: true, fullName: true },
    })

    if (!studentToUnlink) {
      return NextResponse.json({ error: 'Student to unlink not found' }, { status: 404 })
    }

    const groupId = studentToUnlink.siblingGroupId
    if (groupId) {
      // Remove siblingGroupId from this student
      await prisma.student.update({
        where: { id: siblingId },
        data: { siblingGroupId: null },
      })

      // Check how many students remain in that group
      const remaining = await prisma.student.findMany({
        where: { tenantId: user!.tenantId, siblingGroupId: groupId },
        select: { id: true },
      })

      // If only 1 student remains, remove group ID as well
      if (remaining.length <= 1) {
        await prisma.student.updateMany({
          where: { tenantId: user!.tenantId, siblingGroupId: groupId },
          data: { siblingGroupId: null },
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `${studentToUnlink.fullName} removed from siblings`,
    })
  } catch (err: any) {
    console.error('Remove sibling error:', err)
    return NextResponse.json({ error: 'Failed to remove sibling: ' + (err.message || '') }, { status: 500 })
  }
}
