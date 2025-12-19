import { Router, Request, Response } from 'express';
import type { ResourceInfo, PaginatedResponse } from '../types.js';

const router = Router();

// Common FHIR resources that are typically used
const COMMON_RESOURCES: ResourceInfo[] = [
  // Administrative
  { name: 'Patient', description: 'Patient demographics and other administrative information', category: 'Administrative' },
  { name: 'Practitioner', description: 'Healthcare professional information', category: 'Administrative' },
  { name: 'PractitionerRole', description: 'Roles/specialties of practitioners', category: 'Administrative' },
  { name: 'Organization', description: 'Healthcare organizations', category: 'Administrative' },
  
  // Clinical
  { name: 'Observation', description: 'Measurements and simple assertions', category: 'Clinical' },
  { name: 'Encounter', description: 'Healthcare interactions', category: 'Clinical' },
  { name: 'Condition', description: 'Conditions, problems, diagnoses', category: 'Clinical' },
  { name: 'Procedure', description: 'Actions performed on patients', category: 'Clinical' },
  { name: 'Immunization', description: 'Immunization records', category: 'Clinical' },
  { name: 'AllergyIntolerance', description: 'Allergies and intolerances', category: 'Clinical' },
  { name: 'CarePlan', description: 'Care plans for patients', category: 'Clinical' },
  { name: 'CareTeam', description: 'Care team members', category: 'Clinical' },
  { name: 'Goal', description: 'Patient goals', category: 'Clinical' },
  
  // Medication
  { name: 'MedicationRequest', description: 'Prescription orders', category: 'Medication' },
  { name: 'Medication', description: 'Medication definitions', category: 'Medication' },
  { name: 'MedicationStatement', description: 'Record of medication being taken', category: 'Medication' },
  
  // Diagnostic
  { name: 'DiagnosticReport', description: 'Diagnostic report results', category: 'Diagnostic' },
  
  // Workflow
  { name: 'Appointment', description: 'Scheduled appointments', category: 'Workflow' },
  { name: 'Schedule', description: 'Provider schedules', category: 'Workflow' },
  { name: 'Slot', description: 'Time slots for appointments', category: 'Workflow' },
  { name: 'ServiceRequest', description: 'Service/procedure requests', category: 'Workflow' },
  { name: 'Task', description: 'Tasks and activities', category: 'Workflow' },
  
  // Administrative (Documents & Consent)
  { name: 'DocumentReference', description: 'Document pointers', category: 'Administrative' },
  { name: 'Consent', description: 'Patient consent directives', category: 'Administrative' },
  { name: 'Questionnaire', description: 'Questionnaire definitions', category: 'Administrative' },
  { name: 'QuestionnaireResponse', description: 'Questionnaire answers', category: 'Administrative' },
  
  // Financial
  { name: 'Coverage', description: 'Insurance coverage', category: 'Financial' },
  { name: 'Claim', description: 'Insurance claims', category: 'Financial' },
  { name: 'ClaimResponse', description: 'Claim adjudication', category: 'Financial' },
  { name: 'ExplanationOfBenefit', description: 'Explanation of benefits', category: 'Financial' },
  
  // Aidbox-specific resources (Security)
  { name: 'User', description: 'Aidbox user accounts', category: 'Security' },
  { name: 'Client', description: 'Aidbox OAuth clients', category: 'Security' },
  { name: 'AccessPolicy', description: 'Aidbox access policies', category: 'Security' },
  { name: 'TokenIntrospector', description: 'Aidbox token introspectors', category: 'Security' },
];

// Get list of available resources
router.get('/', (_req: Request, res: Response) => {
  res.json(COMMON_RESOURCES);
});

// Get available categories
router.get('/categories', (_req: Request, res: Response) => {
  const categories = Array.from(new Set(COMMON_RESOURCES.map(r => r.category))).sort();
  res.json(categories);
});

// Get paginated resources
router.get('/paginated', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = (req.query.search as string || '').toLowerCase();
  const category = req.query.category as string || '';
  
  // Filter resources
  let filteredResources = COMMON_RESOURCES;
  
  // Apply search filter
  if (search) {
    filteredResources = filteredResources.filter(r => 
      r.name.toLowerCase().includes(search) || 
      r.description.toLowerCase().includes(search)
    );
  }
  
  // Apply category filter
  if (category) {
    filteredResources = filteredResources.filter(r => r.category === category);
  }
  
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedResources = filteredResources.slice(start, end);
  
  const response: PaginatedResponse<ResourceInfo> = {
    resources: paginatedResources,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(filteredResources.length / limit),
      totalResources: filteredResources.length,
      limit,
    },
  };

  res.json(response);
});

export default router;

