import { serial, pgTableCreator, uuid, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { type inferInsertType, type inferSelectType } from "drizzle-orm";

/**
 * This is the creator used to generate the table names.
 * By default, tables will be named after the returned variable name.
 * You can override the table name by passing a second argument: `creator('table_name')`.
 */
const createTable = pgTableCreator((name) => name);

/**
 * Academic Session – e.g. 2025/2026, 2026/2027. Only one can be "active" at a time.
 */
export const academicSessions = createTable("academic_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // e.g. "2025/2026 Academic Session"
  isActive: boolean("is_active").default(false).notNull(),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/**
 * Term – one active term per session (e.g. First Term, Second Term, Third Term).
 * A session may have many terms, but only one term per session can be active.
 */
export const terms = createTable("terms", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // e.g. "First Term"
  sessionId: uuid("session_id")
    .references(() => academicSessions.id, { onDelete: "cascade" })
    .notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/**
 * Classes – e.g. SS1, SS2, SS3 (Junior Secondary) or JSS1-3. Each belongs to a session.
 */
export const classes = createTable("classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // e.g. "SS1"
  sessionId: uuid("session_id")
    .references(() => academicSessions.id, { onDelete: "cascade" })
    .notNull(),
  gradeLevel: text("grade_level"), // optional free‑form grade
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/**
 * Subjects – e.g. Mathematics, English Language, Physics.
 * Subjects can be assigned to one or more classes.
 */
export const subjects = createTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  code: text("code"), // optional short code (e.g. "MTH")
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Junction: class_subject many‑to‑many
export const classSubjects = createTable("class_subjects", {
  classId: uuid("class_id")
    .references(() => classes.id, { onDelete: "cascade" })
    .primaryKey(),
  subjectId: uuid("subject_id")
    .references(() => subjects.id, { onDelete: "cascade" })
    .primaryKey(),
});

/**
 * Teachers – staff members. Status can be "active" or "deactivated".
 * A teacher may be assigned to multiple classes and subjects.
 */
export const teachers = createTable("teachers", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  status: boolean("status").default(true).notNull(), // true = active, false = deactivated
  hireDate: timestamp("hire_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Teacher‑class assignment (many‑to‑many)
export const teacherClasses = createTable("teacher_classes", {
  teacherId: uuid("teacher_id")
    .references(() => teachers.id, { onDelete: "cascade" })
    .primaryKey(),
  classId: uuid("class_id")
    .references(() => classes.id, { onDelete: "cascade" })
    .primaryKey(),
});

// Teacher‑subject assignment (many‑to‑many)
export const teacherSubjects = createTable("teacher_subjects", {
  teacherId: uuid("teacher_id")
    .references(() => teachers.id, { onDelete: "cascade" })
    .primaryKey(),
  subjectId: uuid("subject_id")
    .references(() => subjects.id, { onDelete: "cascade" })
    .primaryKey(),
});

/**
 * Students – linked to a parent auth user via Better‑Auth.
 * Each student belongs to a class and a term (current active term).
 */
export const students = createTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  admissionNumber: text("admission_number").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  gender: text("gender"), // Male, Female, or Other
  dateOfBirth: timestamp("date_of_birth", { withTimezone: true }),
  classId: uuid("class_id")
    .references(() => classes.id, { onDelete: "set null" })
    .notNull(),
  termId: uuid("term_id")
    .references(() => terms.id, { onDelete: "set null" })
    .notNull(),
  parentId: uuid("parent_id"), // references the Better‑Auth user id; nullable for now
  status: boolean("status").default(true).notNull(), // true = active, false = archived
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/**
 * Results – score/grade entries for a student in a subject during a term.
 * Only published results are visible to parents.
 */
export const results = createTable("results", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .references(() => students.id, { onDelete: "cascade" })
    .notNull(),
  subjectId: uuid("subject_id")
    .references(() => subjects.id, { onDelete: "cascade" })
    .notNull(),
  termId: uuid("term_id")
    .references(() => terms.id, { onDelete: "cascade" })
    .notNull(),
  score: integer("score"), // 0‑100 or whatever scale
  grade: text("grade"), // e.g. A, B, C, Pass, Fail
  published: boolean("published").default(false).notNull(), // true = visible to parents
  publishedAt: timestamp("published_at", { withTimezone: true }),
  publishedBy: uuid("published_by"), // Better‑Auth user id of the admin who published
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/**
 * Audit Log – records important admin actions (publish, deactivate, CSV import, etc.).
 */
export const auditLogs = createTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  action: text("action").notNull(), // e.g. "TERM_PUBLISHED", "TEACHER_DEACTIVATED"
  entityType: text("entity_type").notNull(), // e.g. "TERM", "TEACHER", "STUDENT"
  entityId: uuid("entity_id"), // FK to the affected record
  performedBy: uuid("performed_by"), // Better‑Auth user id
  performedAt: timestamp("performed_at", { withTimezone: true }).defaultNow(),
  details: text("details"), // optional free‑form description
});

/**
 * Types inferred from the schema (useful for TypeScript consumers).
 */
export type AcademicSession = inferSelectType<typeof academicSessions>;
export type InsertAcademicSession = inferInsertType<typeof academicSessions>;

export type Term = inferSelectType<typeof terms>;
export type InsertTerm = inferInsertType<typeof terms>;

export type Class = inferSelectType<typeof classes>;
export type InsertClass = inferInsertType<typeof classes>;

export type Subject = inferSelectType<typeof subjects>;
export type InsertSubject = inferInsertType<typeof subjects>;

export type Teacher = inferSelectType<typeof teachers>;
export type InsertTeacher = inferInsertType<typeof teachers>;

export type Student = inferSelectType<typeof students>;
export type InsertStudent = inferInsertType<typeof students>;

export type Result = inferSelectType<typeof results>;
export type InsertResult = inferInsertType<typeof results>;

export type AuditLog = inferSelectType<typeof auditLogs>;
export type InsertAuditLog = inferInsertType<typeof auditLogs>;