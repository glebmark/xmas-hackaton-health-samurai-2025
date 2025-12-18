import { Router, Request, Response } from 'express';
import type { ResourceInfo, PaginatedResponse } from '../types.js';

const router = Router();

// Common FHIR resources that are typically used
const COMMON_RESOURCES: ResourceInfo[] = [
  { name: 'Patient', description: 'Patient demographics and other administrative information' },
  { name: 'Practitioner', description: 'Healthcare professional information' },
  { name: 'PractitionerRole', description: 'Roles/specialties of practitioners' },
  { name: 'Organization', description: 'Healthcare organizations' },
  { name: 'Observation', description: 'Measurements and simple assertions' },
  { name: 'Encounter', description: 'Healthcare interactions' },
  { name: 'Condition', description: 'Conditions, problems, diagnoses' },
  { name: 'Procedure', description: 'Actions performed on patients' },
  { name: 'MedicationRequest', description: 'Prescription orders' },
  { name: 'Medication', description: 'Medication definitions' },
  { name: 'MedicationStatement', description: 'Record of medication being taken' },
  { name: 'DiagnosticReport', description: 'Diagnostic report results' },
  { name: 'Immunization', description: 'Immunization records' },
  { name: 'AllergyIntolerance', description: 'Allergies and intolerances' },
  { name: 'CarePlan', description: 'Care plans for patients' },
  { name: 'CareTeam', description: 'Care team members' },
  { name: 'Goal', description: 'Patient goals' },
  { name: 'Appointment', description: 'Scheduled appointments' },
  { name: 'Schedule', description: 'Provider schedules' },
  { name: 'Slot', description: 'Time slots for appointments' },
  { name: 'DocumentReference', description: 'Document pointers' },
  { name: 'Consent', description: 'Patient consent directives' },
  { name: 'Coverage', description: 'Insurance coverage' },
  { name: 'Claim', description: 'Insurance claims' },
  { name: 'ClaimResponse', description: 'Claim adjudication' },
  { name: 'ExplanationOfBenefit', description: 'Explanation of benefits' },
  { name: 'ServiceRequest', description: 'Service/procedure requests' },
  { name: 'Task', description: 'Tasks and activities' },
  { name: 'QuestionnaireResponse', description: 'Questionnaire answers' },
  { name: 'Questionnaire', description: 'Questionnaire definitions' },
  // Aidbox-specific resources
  { name: 'User', description: 'Aidbox user accounts' },
  { name: 'Client', description: 'Aidbox OAuth clients' },
  { name: 'AccessPolicy', description: 'Aidbox access policies' },
  { name: 'TokenIntrospector', description: 'Aidbox token introspectors' },
];

// Get list of available resources
router.get('/', (_req: Request, res: Response) => {
  res.json(COMMON_RESOURCES);
});

// Get paginated resources
router.get('/paginated', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const start = (page - 1) * limit;
  const end = start + limit;

  const paginatedResources = COMMON_RESOURCES.slice(start, end);
  
  const response: PaginatedResponse<ResourceInfo> = {
    resources: paginatedResources,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(COMMON_RESOURCES.length / limit),
      totalResources: COMMON_RESOURCES.length,
      limit,
    },
  };

  res.json(response);
});

export default router;

