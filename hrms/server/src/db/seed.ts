import { getDb } from './schema.js';
import bcrypt from 'bcryptjs';

const db = getDb();

const hash = bcrypt.hashSync('admin123', 10);

// Clear existing data
const tables = ['audit_logs','notifications','employee_courses','courses','employee_onboarding','onboarding_tasks','interviews','candidates','job_postings','performance_goals','performance_reviews','payroll_items','payroll_periods','attendance','leave_requests','leave_balances','leave_types','assets','documents','employees','designations','departments','users'];
for (const t of tables) {
  db.exec(`DELETE FROM ${t}`);
}

// Seed users
const insertUser = db.prepare(`INSERT INTO users (email,password_hash,role,first_name,last_name,phone) VALUES (?,?,?,?,?,?)`);
const users = [
  ['admin@hrms.com', hash, 'super_admin', 'Super', 'Admin', '9999999999'],
  ['hr@hrms.com', hash, 'hr_manager', 'Priya', 'Sharma', '9999999998'],
  ['manager@hrms.com', hash, 'manager', 'Rahul', 'Verma', '9999999997'],
  ['employee1@hrms.com', hash, 'employee', 'Amit', 'Kumar', '9999999996'],
  ['employee2@hrms.com', hash, 'employee', 'Sneha', 'Patel', '9999999995'],
  ['employee3@hrms.com', hash, 'employee', 'Vikram', 'Singh', '9999999994'],
  ['employee4@hrms.com', hash, 'employee', 'Neha', 'Gupta', '9999999993'],
  ['employee5@hrms.com', hash, 'employee', 'Rajesh', 'Khanna', '9999999992'],
];
const userIds: number[] = [];
for (const u of users) {
  const r = insertUser.run(...u);
  userIds.push(Number(r.lastInsertRowid));
}

// Seed departments
const insertDept = db.prepare(`INSERT INTO departments (name,code,description,manager_id) VALUES (?,?,?,?)`);
const depts = [
  ['Engineering', 'ENG', 'Software Engineering & Development', userIds[2]],
  ['Human Resources', 'HR', 'Human Resources Department', userIds[1]],
  ['Marketing', 'MKT', 'Marketing & Communications', userIds[2]],
  ['Finance', 'FIN', 'Finance & Accounting', userIds[2]],
  ['Sales', 'SAL', 'Sales & Business Development', userIds[2]],
  ['Operations', 'OPS', 'Operations & Administration', userIds[2]],
];
const deptIds: number[] = [];
for (const d of depts) {
  const r = insertDept.run(...d);
  deptIds.push(Number(r.lastInsertRowid));
}

// Seed designations
const insertDesig = db.prepare(`INSERT INTO designations (title,department_id,level) VALUES (?,?,?)`);
const desigData = [
  ['Software Engineer', deptIds[0], 1], ['Senior Software Engineer', deptIds[0], 2], ['Tech Lead', deptIds[0], 3],
  ['HR Executive', deptIds[1], 1], ['HR Manager', deptIds[1], 2],
  ['Marketing Executive', deptIds[2], 1], ['Marketing Manager', deptIds[2], 2],
  ['Accountant', deptIds[3], 1], ['Finance Manager', deptIds[3], 2],
  ['Sales Executive', deptIds[4], 1], ['Sales Manager', deptIds[4], 2],
  ['Operations Executive', deptIds[5], 1], ['Operations Manager', deptIds[5], 2],
];
const desigIds: number[] = [];
for (const d of desigData) {
  const r = insertDesig.run(...d);
  desigIds.push(Number(r.lastInsertRowid));
}

// Seed employees
const insertEmp = db.prepare(`INSERT INTO employees (user_id,employee_code,department_id,designation_id,reporting_manager_id,date_of_birth,gender,date_of_joining,employment_type,work_location,base_salary) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
const empData = [
  [userIds[0], 'EMP001', deptIds[1], desigIds[3], userIds[1], '1985-06-15', 'male', '2020-01-01', 'permanent', 'Mumbai', 300000],
  [userIds[1], 'EMP002', deptIds[1], desigIds[4], userIds[0], '1990-03-22', 'female', '2021-03-01', 'permanent', 'Mumbai', 180000],
  [userIds[2], 'EMP003', deptIds[0], desigIds[2], userIds[0], '1988-11-10', 'male', '2021-06-01', 'permanent', 'Bangalore', 240000],
  [userIds[3], 'EMP004', deptIds[0], desigIds[0], userIds[2], '1995-07-08', 'male', '2022-01-15', 'permanent', 'Bangalore', 96000],
  [userIds[4], 'EMP005', deptIds[0], desigIds[0], userIds[2], '1996-09-12', 'female', '2022-02-01', 'permanent', 'Bangalore', 96000],
  [userIds[5], 'EMP006', deptIds[2], desigIds[5], userIds[2], '1994-04-25', 'male', '2022-03-01', 'permanent', 'Mumbai', 84000],
  [userIds[6], 'EMP007', deptIds[3], desigIds[7], userIds[2], '1993-12-18', 'female', '2022-04-01', 'permanent', 'Mumbai', 72000],
  [userIds[7], 'EMP008', deptIds[4], desigIds[9], userIds[2], '1992-08-30', 'male', '2022-05-01', 'probation', 'Delhi', 78000],
];
const empIds: number[] = [];
for (const e of empData) {
  const r = insertEmp.run(...e);
  empIds.push(Number(r.lastInsertRowid));
}

// Seed leave types
const insertLT = db.prepare(`INSERT INTO leave_types (name,code,description,days_per_year,is_carry_forward,max_carry_forward,color) VALUES (?,?,?,?,?,?,?)`);
const leaveTypes = [
  ['Annual Leave', 'AL', 'Planned annual leave', 18, 1, 10, '#6366f1'],
  ['Sick Leave', 'SL', 'Medical leave', 12, 0, 0, '#ef4444'],
  ['Casual Leave', 'CL', 'Casual / personal leave', 10, 0, 0, '#22c55e'],
  ['Maternity Leave', 'ML', 'Maternity leave', 180, 0, 0, '#ec4899'],
  ['Paternity Leave', 'PL', 'Paternity leave', 15, 0, 0, '#3b82f6'],
  ['Comp-off', 'CO', 'Compensatory off', 0, 1, 10, '#f59e0b'],
];
const ltIds: number[] = [];
for (const lt of leaveTypes) {
  const r = insertLT.run(...lt);
  ltIds.push(Number(r.lastInsertRowid));
}

// Seed leave balances
const insertLB = db.prepare(`INSERT INTO leave_balances (employee_id,leave_type_id,total_days,used_days,pending_days,remaining_days) VALUES (?,?,?,?,?,?)`);
const year = new Date().getFullYear();
for (const eid of empIds) {
  insertLB.run(eid, ltIds[0], 18, Math.floor(Math.random() * 8), Math.floor(Math.random() * 3), 18);
  insertLB.run(eid, ltIds[1], 12, Math.floor(Math.random() * 4), 0, 12);
  insertLB.run(eid, ltIds[2], 10, Math.floor(Math.random() * 5), Math.floor(Math.random() * 2), 10);
}

// Seed holidays
const insertHol = db.prepare(`INSERT INTO holidays (name,date,type,year) VALUES (?,?,?,?)`);
const holidays = [
  ['New Year', `${year}-01-01`, 'public', year],
  ['Republic Day', `${year}-01-26`, 'public', year],
  ['Holi', `${year}-03-14`, 'public', year],
  ['Independence Day', `${year}-08-15`, 'public', year],
  ['Diwali', `${year}-11-01`, 'public', year],
  ['Christmas', `${year}-12-25`, 'public', year],
];
for (const h of holidays) {
  insertHol.run(...h);
}

// Seed courses
const insertCourse = db.prepare(`INSERT INTO courses (title,description,category,duration_hours,instructor) VALUES (?,?,?,?,?)`);
const courses = [
  ['Leadership Essentials', 'Learn core leadership skills', 'Leadership', 12, 'Dr. Meera Nair'],
  ['Data Privacy & Security', 'GDPR and data protection', 'Compliance', 6, 'Legal Team'],
  ['Effective Communication', 'Business communication skills', 'Soft Skills', 8, 'Priya Sharma'],
  ['Python Programming', 'Intermediate Python', 'Technical', 24, 'Rahul Verma'],
  ['Project Management', 'Agile & Scrum methodologies', 'Management', 16, 'External Trainer'],
];
const courseIds: number[] = [];
for (const c of courses) {
  const r = insertCourse.run(...c);
  courseIds.push(Number(r.lastInsertRowid));
}

// Seed job postings
const insertJob = db.prepare(`INSERT INTO job_postings (title,department_id,location,employment_type,min_experience,max_experience,description,status,posted_by,closing_date) VALUES (?,?,?,?,?,?,?,?,?,?)`);
const jobs = [
  ['Senior React Developer', deptIds[0], 'Bangalore', 'permanent', 3, 6, 'Looking for experienced React developer', 'published', userIds[1], `${year}-12-31`],
  ['HR Business Partner', deptIds[1], 'Mumbai', 'permanent', 5, 8, 'Strategic HR role', 'published', userIds[1], `${year}-12-31`],
  ['Marketing Analyst', deptIds[2], 'Mumbai', 'permanent', 2, 4, 'Data-driven marketing role', 'draft', userIds[1], `${year}-12-31`],
];
const jobIds: number[] = [];
for (const j of jobs) {
  const r = insertJob.run(...j);
  jobIds.push(Number(r.lastInsertRowid));
}

// Seed candidates
const insertCand = db.prepare(`INSERT INTO candidates (job_posting_id,first_name,last_name,email,phone,current_company,total_experience,status) VALUES (?,?,?,?,?,?,?,?)`);
const candidates = [
  [jobIds[0], 'Arun', 'Joshi', 'arun@email.com', '8888888801', 'TechCorp', 4, 'shortlisted'],
  [jobIds[0], 'Divya', 'Menon', 'divya@email.com', '8888888802', 'WebStudio', 3.5, 'interviewed'],
  [jobIds[1], 'Karan', 'Mehta', 'karan@email.com', '8888888803', 'HR Solutions', 6, 'new'],
  [jobIds[2], 'Pooja', 'Desai', 'pooja@email.com', '8888888804', 'MarketPro', 3, 'screening'],
];
for (const c of candidates) {
  insertCand.run(...c);
}

// Seed payroll period (current month)
const now = new Date();
const month = now.getMonth() + 1;
const py = now.getFullYear();
const lastDay = new Date(py, month, 0).getDate();
db.prepare(`INSERT INTO payroll_periods (month,year,start_date,end_date,status) VALUES (?,?,?,?,?)`).run(month, py, `${py}-${String(month).padStart(2,'0')}-01`, `${py}-${String(month).padStart(2,'0')}-${lastDay}`, 'draft');

// Seed onboarding tasks
const insertTask = db.prepare(`INSERT INTO onboarding_tasks (title,description,days_before_joining) VALUES (?,?,?)`);
const tasks = [
  ['Send Offer Letter', 'Prepare and send the formal offer letter', -5],
  ['Setup Workstation', 'Configure laptop and necessary equipment', -2],
  ['Create Email Account', 'Set up corporate email and IT accounts', -2],
  ['Welcome Kit', 'Prepare welcome kit and ID card', -1],
  ['Induction Session', 'Company orientation and policy briefing', 0],
  ['Assign Mentor', 'Assign a buddy/mentor for first 30 days', 0],
  ['Team Introduction', 'Introduce to team members', 1],
  ['HR Policies Review', 'Review company policies and handbooks', 2],
];
for (const t of tasks) {
  insertTask.run(...t);
}

console.log('Database seeded successfully!');
console.log('Login: admin@hrms.com / admin123');
process.exit(0);
