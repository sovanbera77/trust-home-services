import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  role: z.enum(['super_admin','admin','hr_manager','manager','employee']).optional(),
});

export const employeeCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  role: z.enum(['super_admin','admin','hr_manager','manager','employee']).optional(),
  employee_code: z.string().optional(),
  department_id: z.number().int().positive().optional(),
  designation_id: z.number().int().positive().optional(),
  reporting_manager_id: z.number().int().positive().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male','female','other']).optional(),
  marital_status: z.string().optional(),
  blood_group: z.string().optional(),
  nationality: z.string().optional(),
  date_of_joining: z.string().optional(),
  employment_type: z.enum(['permanent','contract','probation','intern','trainee']).optional(),
  work_location: z.string().optional(),
  base_salary: z.number().nonnegative().optional(),
});

export const employeeUpdateSchema = employeeCreateSchema.omit({ email: true, password: true, first_name: true, last_name: true }).partial();

export const departmentSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(20),
  description: z.string().optional(),
  manager_id: z.number().int().positive().optional(),
});

export const leaveTypeSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  description: z.string().optional(),
  days_per_year: z.number().int().nonnegative(),
  is_carry_forward: z.boolean().optional(),
  max_carry_forward: z.number().int().nonnegative().optional(),
  color: z.string().optional(),
});

export const leaveRequestSchema = z.object({
  leave_type_id: z.number().int().positive(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total_days: z.number().int().positive(),
  reason: z.string().optional(),
});

export const leaveApproveSchema = z.object({
  status: z.enum(['approved','rejected']),
  comments: z.string().optional(),
});

export const payrollPeriodSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  start_date: z.string(),
  end_date: z.string(),
  payment_date: z.string().optional(),
});

export const payrollItemSchema = z.object({
  payroll_period_id: z.number().int().positive(),
  employee_id: z.number().int().positive(),
  gross_salary: z.number().nonnegative(),
  deductions: z.number().nonnegative().optional(),
  bonus: z.number().optional(),
  commission: z.number().optional(),
  reimbursement: z.number().optional(),
  tds: z.number().nonnegative().optional(),
  provident_fund: z.number().nonnegative().optional(),
  professional_tax: z.number().nonnegative().optional(),
  lop_days: z.number().int().nonnegative().optional(),
});

export const jobSchema = z.object({
  title: z.string().min(1).max(200),
  department_id: z.number().int().positive(),
  location: z.string().optional(),
  employment_type: z.string().optional(),
  min_experience: z.number().int().nonnegative().optional(),
  max_experience: z.number().int().nonnegative().optional(),
  salary_min: z.number().nonnegative().optional(),
  salary_max: z.number().nonnegative().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  closing_date: z.string().optional(),
});

export const candidateSchema = z.object({
  job_posting_id: z.number().int().positive(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  current_company: z.string().optional(),
  current_designation: z.string().optional(),
  total_experience: z.number().nonnegative().optional(),
  highest_education: z.string().optional(),
  current_ctc: z.number().nonnegative().optional(),
  expected_ctc: z.number().nonnegative().optional(),
  notice_period: z.string().optional(),
  source: z.string().optional(),
});

export const interviewSchema = z.object({
  candidate_id: z.number().int().positive(),
  job_posting_id: z.number().int().positive(),
  interviewer_id: z.number().int().positive(),
  interview_date: z.string(),
  interview_type: z.enum(['telephonic','video','in-person','technical','hr']),
  notes: z.string().optional(),
});

export const performanceReviewSchema = z.object({
  employee_id: z.number().int().positive(),
  reviewer_id: z.number().int().positive(),
  review_period: z.string().min(1),
  summary: z.string().optional(),
  goals: z.array(z.object({
    goal: z.string().min(1),
    category: z.string().optional(),
    target_date: z.string().optional(),
  })).optional(),
});

export const courseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  duration_hours: z.number().nonnegative().optional(),
  instructor: z.string().optional(),
  is_mandatory: z.boolean().optional(),
});

export const enrollmentSchema = z.object({
  employee_id: z.number().int().positive(),
  course_id: z.number().int().positive(),
});

export const notificationSchema = z.object({
  user_id: z.number().int().positive(),
  title: z.string().min(1),
  message: z.string().optional(),
  type: z.enum(['info','warning','success','error']).optional(),
  link: z.string().optional(),
});

export const expenseSchema = z.object({
  employee_id: z.number().int().positive().optional(),
  category: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional(),
  receipt_url: z.string().optional(),
  expense_date: z.string(),
});

export const travelRequestSchema = z.object({
  employee_id: z.number().int().positive().optional(),
  from_location: z.string().min(1),
  to_location: z.string().min(1),
  start_date: z.string(),
  end_date: z.string(),
  travel_mode: z.enum(['flight','train','bus','car','other']),
  purpose: z.string().min(1),
  estimated_cost: z.number().positive(),
  accommodation_required: z.boolean().optional(),
});
