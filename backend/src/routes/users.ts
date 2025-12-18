import { Router, Request, Response, NextFunction } from 'express';
import { aidboxService } from '../services/aidbox.js';

const router = Router();

// Search users
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string | undefined;
    const users = await aidboxService.searchUsers(q);
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// Get clients (for client_credentials auth)
router.get('/clients', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string | undefined;
    const clients = await aidboxService.getClients(q);
    res.json(clients);
  } catch (error) {
    next(error);
  }
});

export default router;

