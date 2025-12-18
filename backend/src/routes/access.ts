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

// Test access for multiple resource types
router.post('/test-batch', async (req: Request<object, unknown, TestBatchRequestBody>, res: Response, next: NextFunction) => {
  try {
    const { resourceTypes, userAuth } = req.body;

    if (!resourceTypes || !userAuth) {
      res.status(400).json({ error: 'resourceTypes and userAuth are required' });
      return;
    }

    const results: Record<string, Awaited<ReturnType<typeof aidboxService.testAllOperations>>> = {};

    // Get sample IDs for resources that exist
    const sampleIds: Record<string, string | null> = {};
    for (const resourceType of resourceTypes) {
      sampleIds[resourceType] = await aidboxService.getResourceSample(resourceType);
    }

    // Test access for each resource type
    for (const resourceType of resourceTypes) {
      results[resourceType] = await aidboxService.testAllOperations(
        resourceType, 
        userAuth, 
        sampleIds[resourceType]
      );
    }

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

    const results: CompareResults = {
      user1: {},
      user2: {},
    };

    // Get sample IDs for resources
    const sampleIds: Record<string, string | null> = {};
    for (const resourceType of resourceTypes) {
      sampleIds[resourceType] = await aidboxService.getResourceSample(resourceType);
    }

    // Test both users in parallel
    await Promise.all([
      (async () => {
        for (const resourceType of resourceTypes) {
          results.user1[resourceType] = await aidboxService.testAllOperations(
            resourceType, 
            userAuth1, 
            sampleIds[resourceType]
          );
        }
      })(),
      (async () => {
        for (const resourceType of resourceTypes) {
          results.user2[resourceType] = await aidboxService.testAllOperations(
            resourceType, 
            userAuth2, 
            sampleIds[resourceType]
          );
        }
      })(),
    ]);

    res.json(results);
  } catch (error) {
    next(error);
  }
});

export default router;

