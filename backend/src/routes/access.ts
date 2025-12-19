import { Router, Request, Response, NextFunction } from 'express';
import { aidboxService, type UserAuthInfo } from '../services/aidbox.js';
import type { CompareResults } from '../types.js';

const router = Router();

interface VerifyCredentialsBody {
  type: 'user' | 'client';
  id: string;
  password?: string;
  secret?: string;
}

interface TestRequestBody {
  resourceType: string;
  userAuth: UserAuthInfo;
  existingResourceId?: string;
}

interface TestBatchRequestBody {
  resourceTypes: string[];
  userAuth: UserAuthInfo;
}

interface CompareRequestBody {
  resourceTypes: string[];
  userAuth1: UserAuthInfo;
  userAuth2: UserAuthInfo;
}

// Verify credentials before allowing access testing
router.post('/verify-credentials', async (req: Request<object, unknown, VerifyCredentialsBody>, res: Response, next: NextFunction) => {
  try {
    const { type, id, password, secret } = req.body;

    if (!type || !id) {
      res.status(400).json({ error: 'type and id are required' });
      return;
    }

    if (type === 'user' && !password) {
      res.status(400).json({ error: 'password is required for users' });
      return;
    }

    if (type === 'client' && !secret) {
      res.status(400).json({ error: 'secret is required for clients' });
      return;
    }

    const userAuth: UserAuthInfo = {
      type,
      id,
      ...(type === 'user' ? { password } : { secret }),
    };

    try {
      // Try to resolve auth header - this will fail if credentials are invalid
      const authHeader = await aidboxService.resolveAuthHeader(userAuth);
      
      // Make a simple test request to verify the credentials work
      const testResult = await aidboxService.verifyCredentials(authHeader);
      
      if (testResult.valid) {
        res.json({ valid: true, message: 'Credentials verified successfully' });
      } else {
        res.status(401).json({ valid: false, message: testResult.message || 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Credential verification failed:', error);
      res.status(401).json({ valid: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    next(error);
  }
});

// Test access for a specific resource type and user
router.post('/test', async (req: Request<object, unknown, TestRequestBody>, res: Response, next: NextFunction) => {
  try {
    const { resourceType, userAuth, existingResourceId } = req.body;

    if (!resourceType || !userAuth) {
      res.status(400).json({ error: 'resourceType and userAuth are required' });
      return;
    }

    // Resolve auth info to authorization header
    const authHeader = await aidboxService.resolveAuthHeader(userAuth);

    const results = await aidboxService.testAllOperations(resourceType, authHeader, existingResourceId || null);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

// Debug endpoint: test a single direct request (not batch) to help diagnose issues
router.post('/test-single', async (req: Request<object, unknown, { userAuth: UserAuthInfo; resourceType: string }>, res: Response, next: NextFunction) => {
  try {
    const { userAuth, resourceType } = req.body;

    if (!userAuth || !resourceType) {
      res.status(400).json({ error: 'userAuth and resourceType are required' });
      return;
    }

    const authHeader = await aidboxService.resolveAuthHeader(userAuth);
    
    // Make a single direct GET request (not batch)
    const result = await aidboxService.testSingleRequest(resourceType, authHeader);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Test access for multiple resource types using parallel individual requests
router.post('/test-batch', async (req: Request<object, unknown, TestBatchRequestBody>, res: Response, next: NextFunction) => {
  try {
    const { resourceTypes, userAuth } = req.body;

    if (!resourceTypes || !userAuth) {
      res.status(400).json({ error: 'resourceTypes and userAuth are required' });
      return;
    }

    console.log(`📋 Testing access for ${userAuth.type} "${userAuth.id}" on ${resourceTypes.length} resources`);

    // Resolve auth info to authorization header
    const authHeader = await aidboxService.resolveAuthHeader(userAuth);

    // Test all access in parallel - uses __nonexistent__ placeholder IDs
    // A 404 response means "access allowed but resource not found" which is fine for testing
    const results = await aidboxService.testAccessBatch(resourceTypes, authHeader);

    res.json(results);
  } catch (error) {
    next(error);
  }
});

// Compare access between two users
router.post('/compare', async (req: Request<object, unknown, CompareRequestBody>, res: Response, next: NextFunction) => {
  try {
    const { resourceTypes, userAuth1, userAuth2 } = req.body;

    if (!resourceTypes || !userAuth1 || !userAuth2) {
      res.status(400).json({ error: 'resourceTypes, userAuth1, and userAuth2 are required' });
      return;
    }

    // Resolve both auth infos to authorization headers
    const [authHeader1, authHeader2] = await Promise.all([
      aidboxService.resolveAuthHeader(userAuth1),
      aidboxService.resolveAuthHeader(userAuth2),
    ]);

    // Test both users in parallel
    const [user1Results, user2Results] = await Promise.all([
      aidboxService.testAccessBatch(resourceTypes, authHeader1),
      aidboxService.testAccessBatch(resourceTypes, authHeader2),
    ]);

    const results: CompareResults = {
      user1: user1Results,
      user2: user2Results,
    };

    res.json(results);
  } catch (error) {
    next(error);
  }
});

export default router;
