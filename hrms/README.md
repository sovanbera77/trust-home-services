# HRMS - Human Resource Management System

## Quick Start

### Development
```bash
cd hrms
npm run setup   # Install dependencies
npm run seed    # Seed database
npm run dev     # Start client + server
```

### Production (Docker)
```bash
cd hrms
cp .env.example .env
docker-compose up -d
```

### Access
- Web: http://localhost:5000
- Login: admin@hrms.com / admin123

## Architecture
- **Frontend**: React 18 + TypeScript + TailwindCSS + Vite
- **Backend**: Express + TypeScript + SQLite (better-sqlite3)
- **Real-time**: Socket.io for live notifications
- **PDF**: jspdf for payslip generation
- **AI**: OpenAI integration for resume parsing & chatbot
- **Auth**: JWT with role-based access control

## Modules
- Employee Management
- Department Management
- Leave & Attendance
- Payroll with PDF Payslips
- Recruitment & Candidate Tracking
- Performance Reviews
- Learning & Development
- Expense Management
- Travel Management
- AI Resume Parser
- HR Chatbot (Jinie)
- Real-time Notifications
- Multi-language (EN/HI/FR)
- Dark Mode
- Role-based Dashboards

## API Documentation
All API routes are prefixed with `/api`. Authentication via Bearer JWT token.
See individual route files for details.

## Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| JWT_SECRET | JWT signing secret | hrms-secret-key |
| OPENAI_API_KEY | OpenAI API key | - |
| NODE_ENV | Environment | development |
