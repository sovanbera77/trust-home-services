import { Router, Response } from 'express';
import { getDb } from '../db/schema.js';
import { requireAuth, AuthRequest, requireAdmin } from '../middleware/auth.js';
import { getAccessScope } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { jobSchema, candidateSchema, interviewSchema } from '../validation/schemas.js';
import { parseResume, matchSkills } from '../services/resumeParser.js';

const router = Router();

router.get('/api/jobs', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { status, department_id } = req.query;
    let sql = `
      SELECT j.*, d.name as department_name,
             u.first_name || ' ' || u.last_name as posted_by_name
      FROM job_postings j
      LEFT JOIN departments d ON j.department_id = d.id
      LEFT JOIN users u ON j.posted_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status) { sql += ' AND j.status = ?'; params.push(status); }
    if (department_id) { sql += ' AND j.department_id = ?'; params.push(department_id); }
    sql += ' ORDER BY j.created_at DESC';
    const jobs = db.prepare(sql).all(...params);
    return res.json({ success: true, data: jobs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/jobs', requireAuth, requireAdmin, validate(jobSchema), (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { title, department_id, location, employment_type, min_experience, max_experience, salary_min, salary_max, description, requirements, closing_date } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Job title is required' });
    }
    const result = db.prepare(`
      INSERT INTO job_postings (title, department_id, location, employment_type, min_experience, max_experience, salary_min, salary_max, description, requirements, posted_by, closing_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, department_id || null, location || null, employment_type || null, min_experience || null, max_experience || null, salary_min || null, salary_max || null, description || null, requirements || null, req.user!.id, closing_date || null);
    const job = db.prepare('SELECT * FROM job_postings WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: job });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/api/jobs/:id', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM job_postings WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Job posting not found' });
    }
    const { title, department_id, location, employment_type, min_experience, max_experience, salary_min, salary_max, description, requirements, status, closing_date } = req.body;
    db.prepare(`
      UPDATE job_postings SET title = COALESCE(?, title), department_id = COALESCE(?, department_id),
        location = COALESCE(?, location), employment_type = COALESCE(?, employment_type),
        min_experience = COALESCE(?, min_experience), max_experience = COALESCE(?, max_experience),
        salary_min = COALESCE(?, salary_min), salary_max = COALESCE(?, salary_max),
        description = COALESCE(?, description), requirements = COALESCE(?, requirements),
        status = COALESCE(?, status), closing_date = COALESCE(?, closing_date),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(title || null, department_id ?? null, location || null, employment_type || null, min_experience ?? null, max_experience ?? null, salary_min ?? null, salary_max ?? null, description || null, requirements || null, status || null, closing_date || null, req.params.id);
    const job = db.prepare('SELECT * FROM job_postings WHERE id = ?').get(req.params.id);
    return res.json({ success: true, data: job });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/candidates', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { status, job_posting_id } = req.query;
    const scope = getAccessScope(req);
    let sql = `
      SELECT DISTINCT c.*, j.title as job_title, d.name as department_name
      FROM candidates c
      LEFT JOIN job_postings j ON c.job_posting_id = j.id
      LEFT JOIN departments d ON j.department_id = d.id
      LEFT JOIN employees e ON j.department_id = e.department_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status) { sql += ' AND c.status = ?'; params.push(status); }
    if (job_posting_id) { sql += ' AND c.job_posting_id = ?'; params.push(job_posting_id); }
    if (!scope.isAdmin) {
      sql += scope.condition.replace(/e\./g, 'e.');
      params.push(...scope.params);
    }
    sql += ' ORDER BY c.created_at DESC';
    const candidates = db.prepare(sql).all(...params);
    return res.json({ success: true, data: candidates });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/candidates', requireAuth, requireAdmin, validate(candidateSchema), (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { job_posting_id, first_name, last_name, email, phone, resume_url, current_company, current_designation, total_experience, highest_education, current_ctc, expected_ctc, notice_period, source, rating } = req.body;
    if (!first_name || !last_name || !email) {
      return res.status(400).json({ success: false, error: 'First name, last name, and email are required' });
    }
    const result = db.prepare(`
      INSERT INTO candidates (job_posting_id, first_name, last_name, email, phone, resume_url, current_company, current_designation, total_experience, highest_education, current_ctc, expected_ctc, notice_period, source, rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(job_posting_id || null, first_name, last_name, email, phone || null, resume_url || null, current_company || null, current_designation || null, total_experience || null, highest_education || null, current_ctc || null, expected_ctc || null, notice_period || null, source || null, rating || null);
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: candidate });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/api/candidates/:id', requireAuth, requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM candidates WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }
    const { status, rating, current_company, current_designation, total_experience, current_ctc, expected_ctc, notice_period, phone, resume_url } = req.body;
    db.prepare(`
      UPDATE candidates SET status = COALESCE(?, status), rating = COALESCE(?, rating),
        current_company = COALESCE(?, current_company), current_designation = COALESCE(?, current_designation),
        total_experience = COALESCE(?, total_experience), current_ctc = COALESCE(?, current_ctc),
        expected_ctc = COALESCE(?, expected_ctc), notice_period = COALESCE(?, notice_period),
        phone = COALESCE(?, phone), resume_url = COALESCE(?, resume_url)
      WHERE id = ?
    `).run(status || null, rating ?? null, current_company || null, current_designation || null, total_experience ?? null, current_ctc ?? null, expected_ctc ?? null, notice_period || null, phone || null, resume_url || null, req.params.id);
    const candidate = db.prepare(`
      SELECT c.*, j.title as job_title FROM candidates c
      LEFT JOIN job_postings j ON c.job_posting_id = j.id WHERE c.id = ?
    `).get(req.params.id);
    return res.json({ success: true, data: candidate });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/api/interviews', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { status, job_posting_id } = req.query;
    let sql = `
      SELECT i.*, c.first_name || ' ' || c.last_name as candidate_name, c.email as candidate_email,
             j.title as job_title,
             u.first_name || ' ' || u.last_name as interviewer_name
      FROM interviews i
      LEFT JOIN candidates c ON i.candidate_id = c.id
      LEFT JOIN job_postings j ON i.job_posting_id = j.id
      LEFT JOIN users u ON i.interviewer_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (status) { sql += ' AND i.status = ?'; params.push(status); }
    if (job_posting_id) { sql += ' AND i.job_posting_id = ?'; params.push(job_posting_id); }
    sql += ' ORDER BY i.interview_date DESC';
    const interviews = db.prepare(sql).all(...params);
    return res.json({ success: true, data: interviews });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/interviews', requireAuth, requireAdmin, validate(interviewSchema), (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const { candidate_id, job_posting_id, interviewer_id, interview_date, interview_type } = req.body;
    if (!candidate_id || !interviewer_id || !interview_date) {
      return res.status(400).json({ success: false, error: 'Candidate, interviewer, and interview date are required' });
    }
    const result = db.prepare(
      'INSERT INTO interviews (candidate_id, job_posting_id, interviewer_id, interview_date, interview_type) VALUES (?, ?, ?, ?, ?)'
    ).run(candidate_id, job_posting_id || null, interviewer_id, interview_date, interview_type || 'in-person');
    db.prepare("UPDATE candidates SET status = 'screening' WHERE id = ? AND status = 'new'").run(candidate_id);
    const interview = db.prepare(`
      SELECT i.*, c.first_name || ' ' || c.last_name as candidate_name,
             u.first_name || ' ' || u.last_name as interviewer_name
      FROM interviews i
      LEFT JOIN candidates c ON i.candidate_id = c.id
      LEFT JOIN users u ON i.interviewer_id = u.id
      WHERE i.id = ?
    `).get(result.lastInsertRowid);
    return res.status(201).json({ success: true, data: interview });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/candidates/parse-resume', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Resume text is required' });
    }
    const parsed = await parseResume(text);
    return res.json({ success: true, data: parsed });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api/candidates/:id/match-score', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const candidate = db.prepare(`
      SELECT c.*, j.requirements FROM candidates c
      LEFT JOIN job_postings j ON c.job_posting_id = j.id
      WHERE c.id = ?
    `).get(req.params.id) as any;
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }
    const requiredSkills: string[] = candidate.requirements ? candidate.requirements.split(',').map((s: string) => s.trim()) : [];
    const candidateSkills: string[] = [];
    if (candidate.current_designation) candidateSkills.push(candidate.current_designation);
    if (candidate.highest_education) candidateSkills.push(candidate.highest_education);
    const result = matchSkills(requiredSkills, candidateSkills);
    return res.json({ success: true, data: { ...result, candidate_id: candidate.id, job_title: candidate.job_title } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
