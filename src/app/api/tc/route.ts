import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/app/api/middleware'

export async function POST(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  // Only SUPER_ADMIN can generate TC
  if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'COACHING_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized. Only Super Admin can generate TC.' }, { status: 403 })
  }

  try {
      const body = await req.json()
      const { studentId, tcDetails } = body

      if (!studentId) {
          return NextResponse.json({ success: false, error: 'Student ID is required' }, { status: 400 })
      }

      // Check if student exists and TC is already generated
      const student = await prisma.student.findFirst({
          where: { id: studentId, tenantId: user.tenantId }
      })

      if (!student) {
          return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 })
      }

      if (student.tcGenerated) {
          return NextResponse.json({ success: false, error: 'TC already generated for this student' }, { status: 400 })
      }

      // Update student to mark TC as generated
      const updatedStudent = await prisma.student.update({
          where: { id: studentId },
          data: {
              tcGenerated: true,
              tcDetails: tcDetails || {},
              status: 'PASSED' // Assuming generating TC means they leave
          }
      })

      return NextResponse.json({ success: true, data: updatedStudent })
  } catch (error: any) {
      console.error('TC API Error:', error)
      return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 })
  }
}
