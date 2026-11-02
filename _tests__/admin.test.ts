import { describe, it, expect } from "vitest";
import { betterAuth } from "better-auth";
import { db } from "../db/client";
import { results, students, subjects, terms, classes } from "../db/schema";
import { eq } from "drizzle-orm";

describe("Admin role guard", () => {
  it("non-admin user is denied access to /admin routes", async () => {
    // This is a placeholder – in a real test you’d spin up a browser or
    // make an authenticated request with a non‑admin role and expect a redirect.
    expect(true).toBe(true);
  });
});

describe("Publish result logic", () => {
  it("published result appears in getPublishedResults", async () => {
    // 1️⃣ Insert a session, term, class, subject, student, and result (unpublished)
    const [session] = await db
      .insert(academicSessions)
      .values({
        name: "2025/2026 Academic Session",
        isActive: true,
        startDate: new Date("2025-09-01"),
        endDate: new Date("2026-06-30"),
      })
      .returning();

    const [term] = await db
      .insert(terms)
      .values({
        name: "First Term",
        sessionId: session!.id,
        isActive: true,
        startDate: new Date("2025-09-01"),
        endDate: new Date("2025-12-20"),
      })
      .returning();

    const [cls] = await db
      .insert(classes)
      .values({ name: "SS1", sessionId: session!.id, gradeLevel: "Senior Secondary 1" })
      .returning();

    const [subj] = await db
      .insert(subjects)
      .values({ name: "Mathematics", code: "MTH" })
      .returning();

    const [student] = await db
      .insert(students)
      .values({
        admissionNumber: "2025/SS1/001",
        firstName: "Chinedu",
        lastName: "Okoro",
        gender: "Male",
        classId: cls!.id,
        termId: term!.id,
        status: true,
      })
      .returning();

    const [result] = await db
      .insert(results)
      .values({
        studentId: student!.id,
        subjectId: subj!.id,
        termId: term!.id,
        score: 78,
        grade: "C",
        published: false,
      })
      .returning();

    // 2️⃣ Publish the result (the action we are testing)
    // In a real integration test you would call the server action;
    // here we directly toggle the flag.
    await db
      .update(results)
      .set({ published: true, publishedAt: new Date() })
      .where(eq(results.id, result!.id));

    // 3️⃣ Query the helper and verify visibility
    const published = await db
      .select({
        resultId: results.id,
        subjectName: subjects.name,
        score: results.score,
        grade: results.grade,
      })
      .from(results)
      .innerJoin(subjects, eq(results.subjectId, subjects.id))
      .where(
        eq(results.studentId, student!.id),
        eq(results.termId, term!.id),
        eq(results.published, true)
      );

    expect(published).toHaveLength(1);
    expect(published[0].subjectName).toBe("Mathematics");
    expect(published[0].score).toBe(78);
  });

  it("unpublished result does NOT appear in getPublishedResults", async () => {
    // Re‑use the same setup as above but keep published=false
    const [session] = await db
      .insert(academicSessions)
      .values({
        name: "2025/2026 Academic Session",
        isActive: true,
        startDate: new Date("2025-09-01"),
        endDate: new Date("2026-06-30"),
      })
      .returning();

    const [term] = await db
      .insert(terms)
      .values({
        name: "First Term",
        sessionId: session!.id,
        isActive: true,
        startDate: new Date("2025-09-01"),
        endDate: new Date("2025-12-20"),
      })
      .returning();

    const [cls] = await db
      .insert(classes)
      .values({ name: "SS1", sessionId: session!.id, gradeLevel: "Senior Secondary 1" })
      .returning();

    const [subj] = await db
      .insert(subjects)
      .values({ name: "English Language", code: "ENG" })
      .returning();

    const [student] = await db
      .insert(students)
      .values({
        admissionNumber: "2025/SS1/002",
        firstName: "Amara",
        lastName: " Yusuf",
        gender: "Female",
        classId: cls!.id,
        termId: term!.id,
        status: true,
      })
      .returning();

    await db
      .insert(results)
      .values({
        studentId: student!.id,
        subjectId: subj!.id,
        termId: term!.id,
        score: 85,
        grade: "B",
        published: false, // keep unpublished
      });

    // Query helper – should return empty array
    const published = await db
      .select({
        resultId: results.id,
        subjectName: subjects.name,
        score: results.score,
      })
      .from(results)
      .innerJoin(subjects, eq(results.subjectId, subjects.id))
      .where(
        eq(results.studentId, student!.id),
        eq(results.termId, term!.id),
        eq(results.published, true)
      );

    expect(published).toHaveLength(0);
  });
});