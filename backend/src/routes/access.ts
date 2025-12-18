import { Router, Request, Response, NextFunction } from 'express';
import { aidboxService } from '../services/aidbox.js';
import type { CompareResults } from '../types.js';

const router = Router();

interface TestRequestBody {
  resourceType: string;
  userAuth: string;
  existingResourceId?: string;
}

interface TestBatchRequestBody {
  resourceTypes: string[];
  userAuth: string;
}

interface CompareRequestBody {
  resourceTypes: string[];
  userAuth1: string;
  userAuth2: string;
}

// Test access for a specific resource type and user
router.post('/test', async (req: Request<object, unknown, TestRequestBody>, res: Response, next: NextFunction) => {
  try {
    const { resourceType, userAuth, existingResourceId } = req.body;

    if (!resourceType || !userAuth) {
      res.status(400).json({ error: 'resourceType and userAuth are required' });
      return;
    }

    const results = await aidboxService.testAllOperations(resourceType, userAuth, existingResourceId || null);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

// Test access for multiple resource types using efficient FHIR Batch
router.post('/test-batch', async (req: Request<object, unknown, TestBatchRequestBody>, res: Response, next: NextFunction) => {
  try {
    const { resourceTypes, userAuth } = req.body;

    if (!resourceTypes || !userAuth) {
      res.status(400).json({ error: 'resourceTypes and userAuth are required' });
      return;
    }

    // Get sample IDs for all resources in a single batch request
    const sampleIds = await aidboxService.getResourceSamples(resourceTypes);

    // Test all access in a single batch request
    const results = await aidboxService.testAccessBatch(resourceTypes, userAuth, sampleIds);

    res.json(results);
  } catch (error) {
    next(error);
  }
});

// Compare access between two users using efficient FHIR Batch
router.post('/compare', async (req: Request<object, unknown, CompareRequestBody>, res: Response, next: NextFunction) => {
  try {
    const { resourceTypes, userAuth1, userAuth2 } = req.body;

    if (!resourceTypes || !userAuth1 || !userAuth2) {
      res.status(400).json({ error: 'resourceTypes, userAuth1, and userAuth2 are required' });
      return;
    }

    // Get sample IDs once (shared between both users)
    const sampleIds = await aidboxService.getResourceSamples(resourceTypes);

    // Test both users in parallel, each using a single batch request
    const [user1Results, user2Results] = await Promise.all([
      aidboxService.testAccessBatch(resourceTypes, userAuth1, sampleIds),
      aidboxService.testAccessBatch(resourceTypes, userAuth2, sampleIds),
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
