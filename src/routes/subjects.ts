import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import express from "express";
import { departments, subjects } from "../db/schema";
import { db } from "../db";

const router = express.Router();

// Get all subjects with optional search and optional filtering and pagination
router.get("/", async (req, res) => {
  try {
    const { search, department, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
    const limitPerPage = Math.max(1, parseInt(String(limit), 10) || 10);

    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    // If search query exists, filter by subject name or code
    if (search) {
      filterConditions.push(
        or(
          ilike(subjects.name, `%${search}%`),
          ilike(subjects.code, `%${search}%`),
        ),
      );
    }

    // If depart ment filter exists, matchdepartmwnt name
    if (department) {
      const deptPattern = `%${String(department).replace(/[%_]/g, '\\$&')}%`
      filterConditions.push(ilike(departments.name, deptPattern));
    }

    // Combine all filters using AND if any exist
    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResults = await db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClause);

    const totalCount = countResults[0]?.count || 0;

    const subjectList = await db.select({
      ...getTableColumns(subjects),
      department: { ...getTableColumns(departments) },
    }).from(subjects).leftJoin(departments, eq(subjects.departmentId, departments.id)).where(whereClause).orderBy(desc(subjects.createdAt)).limit(limitPerPage).offset(offset);

    res.status(200).json({
      data: subjectList,
      pagination: {
        total: totalCount,
        page: currentPage,
        limit: limitPerPage,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    })
  } catch (e) {
    console.error(`GET /subjects error: ${e}`);
    res.status(500).json({ error: "Failed to get subjects" });
  }
});

export default router;
