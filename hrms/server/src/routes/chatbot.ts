import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';

const router = Router();

interface ChatContext {
  role: string;
  employeeName: string;
}

function getSystemPrompt(context: ChatContext): string {
  return `You are Jinie, an AI HR assistant for the company's HRMS platform. 
You help employees with HR-related queries. The user is ${context.employeeName} (role: ${context.role}).
You can answer questions about:
- Leave policy and balances
- Payroll and salary
- Attendance
- Company policies
- Employee benefits
- Performance reviews
- Training and development
Be concise, helpful, and professional. If you don't know something, say so honestly.`;
}

async function getEmployeeContext(userId: number): Promise<ChatContext> {
  const db = getDb();
  const user = db.prepare('SELECT first_name, last_name, role FROM users WHERE id = ?').get(userId) as any;
  return {
    role: user?.role || 'employee',
    employeeName: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
  };
}

router.post('/api/chatbot/message', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message required' });

    const context = await getEmployeeContext(req.user!.id);
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: getSystemPrompt(context) },
            { role: 'user', content: message },
          ],
        }),
      });
      const data = await response.json();
      return res.json({ success: true, data: { reply: data.choices[0].message.content } });
    }

    const lowerMsg = message.toLowerCase();
    let reply = '';
    if (lowerMsg.includes('leave') || lowerMsg.includes('holiday')) {
      reply = 'You can apply for leave from the Leave Management section. You have Annual Leave, Sick Leave, and Casual Leave available. Would you like me to guide you through the process?';
    } else if (lowerMsg.includes('payroll') || lowerMsg.includes('salary') || lowerMsg.includes('payslip')) {
      reply = 'You can view your payslips in the Payroll section. For specific salary questions, please contact HR at hr@company.com.';
    } else if (lowerMsg.includes('attendance') || lowerMsg.includes('clock')) {
      reply = 'You can clock in/out from the Attendance section. Your attendance history is also available there.';
    } else if (lowerMsg.includes('training') || lowerMsg.includes('course') || lowerMsg.includes('learning')) {
      reply = 'Check the Learning & Development section for available courses. You can enroll in courses directly from there.';
    } else if (lowerMsg.includes('perfomance') || lowerMsg.includes('review')) {
      reply = 'Your performance reviews are visible in the Performance section. Upcoming reviews will be notified to you.';
    } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
      reply = `Hello ${context.employeeName}! How can I help you today? You can ask me about leave, payroll, attendance, training, and more.`;
    } else {
      reply = `I'm sorry, I couldn't find specific information about that. For HR-related queries, you can also contact the HR team directly. How else can I help you?`;
    }

    return res.json({ success: true, data: { reply } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
