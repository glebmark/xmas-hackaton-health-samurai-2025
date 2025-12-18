import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRouter from './routes/users.js';
import accessRouter from './routes/access.js';
import resourcesRouter from './routes/resources.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/api/users', usersRouter);
app.use('/api/access', accessRouter);
app.use('/api/resources', resourcesRouter);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Access Policy Visualizer backend running on port ${PORT}`);
  console.log(`📋 Aidbox URL: ${process.env.AIDBOX_URL || 'Not configured'}`);
});

