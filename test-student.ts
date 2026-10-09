import { prisma } from './src/lib/prisma';

async function main() {
  try {
    const tenant = await prisma.tenant.findFirst();
    const course = await prisma.course.findFirst({ where: { tenantId: tenant!.id } });
    
    if (!tenant || !course) {
        console.log("No tenant or course found for testing");
        return;
    }

    const data = {
                tenantId: tenant.id,
                courseId: course.id,
                batchId: null,
                studentId: `STU001`,
                fullName: "Test",
                fatherName: "Test",
                motherName: "",
                phone: "123",
                parentPhone: "",
                email: "",
                address: "",
                gender: "MALE" as any,
                dob: null,
                admissionDate: new Date(),
                feePlan: "",
                totalFee: 0,
                paidFee: 0,
                status: "ACTIVE" as any,
                notes: "",
                aadhaarNo: "",
                penId: "",
                aparId: "",
                samagraId: "",
                scholarNo: "123",
                caste: "",
                dobInWords: "",
                medium: "",
                firstAdmissionClass: "",
                firstAdmissionDate: null,
                scholarshipScheme: "",
                bankName: "",
                bankAccountNo: "",
                ifsc: "",
                subjectGroup: "",
                photo: null,
                aadhaarFront: null,
                aadhaarBack: null,
                samagraIdDoc: null,
                aparIdDoc: null,
                penIdDoc: null,
                bankPassbook: null,
    };

    console.log("Creating student...");
    const student = await prisma.student.create({ data });
    console.log("Success:", student.id);
  } catch (err: any) {
    console.error("Error:", err.message);
  } finally {
    //
  }
}
main();
