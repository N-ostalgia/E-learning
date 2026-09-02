// src/app/api/verify/[certificateId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { courseEnrollments, courses, users } from "@/lib/db/schema";
import { eq, and, like } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certificateId: string }> }
) {
  try {
    const { certificateId } = await params;

    // Certificate ID format: NEXUS-{courseIdPrefix8}-{userIdPrefix8}
    const parts = certificateId.split("-");
    if (parts.length < 3 || parts[0] !== "NEXUS") {
      return NextResponse.json(
        { valid: false, error: "Invalid certificate ID format" },
        { status: 400 }
      );
    }

    const courseIdPrefix = parts[1];
    const userIdPrefix = parts[2];

    // Find course by prefix (starts with)
    const course = await db
      .select()
      .from(courses)
      .where(like(courses.id, `${courseIdPrefix}%`))
      .limit(1)
      .then((r) => r[0]);

    if (!course) {
      return NextResponse.json(
        { valid: false, error: "Course not found" },
        { status: 404 }
      );
    }

    // Find user by prefix (starts with)
    const user = await db
      .select()
      .from(users)
      .where(like(users.id, `${userIdPrefix}%`))
      .limit(1)
      .then((r) => r[0]);

    if (!user) {
      return NextResponse.json(
        { valid: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user completed the course
    const enrollment = await db
      .select()
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.userId, user.id),
          eq(courseEnrollments.courseId, course.id)
        )
      )
      .limit(1)
      .then((r) => r[0]);

    const isVerified = enrollment?.progress === 100;

    return NextResponse.json({
      valid: true,
      verified: isVerified,
      certificate: {
        id: certificateId,
        recipientName: user.name,
        courseTitle: course.title,
        completedAt: enrollment?.completedAt || enrollment?.updatedAt || null,
        issuedBy: "Nexus Learning Platform",
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to verify certificate" },
      { status: 500 }
    );
  }
}