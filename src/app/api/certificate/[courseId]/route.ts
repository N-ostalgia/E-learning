// src/app/api/certificate/[courseId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/server/modules/auth/auth.config";
import { db } from "@/lib/db";
import { courseEnrollments, courses, users, communities } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { CertificatePDF } from "@/components/features/course/CertificatePDF";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { courseId } = await params;

    // Check enrollment and completion
    const enrollment = await db
      .select()
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.userId, userId),
          eq(courseEnrollments.courseId, courseId)
        )
      )
      .limit(1)
      .then((r) => r[0]);

    if (!enrollment) {
      return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
    }

    const progress = enrollment.progress ?? 0;
    if (progress < 100) {
      return NextResponse.json(
        { error: `Course not completed. Progress: ${progress}%` },
        { status: 400 }
      );
    }

    const course = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1)
      .then((r) => r[0]);

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Get community info for certificate
    const community = await db
      .select({
        name: communities.name,
        ownerId: communities.ownerId,
      })
      .from(communities)
      .where(eq(communities.id, course.communityId))
      .limit(1)
      .then((r) => r[0]);

    // Get instructor name (community owner)
    let instructorName = "Community Owner";
    if (community?.ownerId) {
      const owner = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, community.ownerId))
        .limit(1)
        .then((r) => r[0]);
      if (owner) {
        instructorName = owner.name;
      }
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((r) => r[0]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const certificateId = `NEXUS-${courseId.slice(0, 8)}-${userId.slice(0, 8)}`;

    const pdfBuffer = await renderToBuffer(
      CertificatePDF({
        userName: user.name,
        courseTitle: course.title,
        completedAt: new Date(enrollment.completedAt || enrollment.updatedAt || Date.now()),
        certificateId,
        communityName: community?.name || "Nexus Community",
        instructorName: instructorName,
      })
    );

    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificate-${course.title.replace(/\s/g, "-")}.pdf"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Certificate generation error:", error);
    return NextResponse.json({ error: "Failed to generate certificate" }, { status: 500 });
  }
}