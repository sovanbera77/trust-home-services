import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './db/schema.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initSocket } from './services/socket.js';
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import departmentRoutes from './routes/departments.js';
import leaveRoutes from './routes/leave.js';
import attendanceRoutes from './routes/attendance.js';
import payrollRoutes from './routes/payroll.js';
import recruitmentRoutes from './routes/recruitment.js';
import performanceRoutes from './routes/performance.js';
import learningRoutes from './routes/learning.js';
import notificationRoutes from './routes/notifications.js';
import dashboardRoutes from './routes/dashboard.js';
import expenseRoutes from './routes/expenses.js';
import travelRoutes from './routes/travel.js';
import chatbotRoutes from './routes/chatbot.js';
import docketsRoutes from './routes/dockets.js';
import inventoryRoutes from './routes/inventory.js';
import complaintsRoutes from './routes/complaints.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import referralsRoutes from './routes/referrals.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

getDb();

app.use(authRoutes);
app.use(employeeRoutes);
app.use(departmentRoutes);
app.use(leaveRoutes);
app.use(attendanceRoutes);
app.use(payrollRoutes);
app.use(recruitmentRoutes);
app.use(performanceRoutes);
app.use(learningRoutes);
app.use(notificationRoutes);
app.use(dashboardRoutes);
app.use(expenseRoutes);
app.use(travelRoutes);
app.use(chatbotRoutes);
app.use(docketsRoutes);
app.use(inventoryRoutes);
app.use(complaintsRoutes);
app.use(subscriptionsRoutes);
app.use(referralsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

const clientDistPath = path.resolve(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDistPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) res.status(404).json({ success: false, error: 'Not found' });
  });
});

app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);
server.listen(PORT, () => {
  console.log(`HRMS server running on port ${PORT}`);
});

export default app;
