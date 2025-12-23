// CRM Service - Firebase operations and business logic
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, COLLECTIONS } from '../../services/firebase';
import { crmConfig, getCRMCollection } from '../config';

// Helper: get current companyId from stored user
const getCurrentCompanyId = (): string | null => {
  try {
    const userRaw = localStorage.getItem('user');
    if (!userRaw) {
      console.warn('❌ CRM: No user data in localStorage');
      return null;
    }
    const user = JSON.parse(userRaw);
    console.log('🔍 CRM: Current user:', { uid: user.uid, companyId: user.companyId, email: user.email });
    if (!user.companyId) {
      console.warn('❌ CRM: User has no companyId. CRM features require company setup.');
      console.warn('💡 To fix: Create a company in Firebase and ensure user has companyId field.');
      return null;
    }
    return user.companyId;
  } catch (error) {
    console.error('❌ CRM: Error getting companyId:', error);
    return null;
  }
};

/*
FIREBASE INDEX REQUIREMENTS:

The CRM queries require compound indexes for optimal performance.
If you see "requires an index" errors, create these indexes in Firebase Console:

1. Collection: crm_leads
   Fields: companyId (Asc), createdAt (Desc)

2. Collection: crm_engineers
   Fields: companyId (Asc), name (Asc)

Go to: https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore/indexes
And create the required indexes when prompted by error messages.
*/
import {
  CRMLead,
  CRMActivity,
  CRMSiteVisit,
  CRMRequirements,
  CRMDrawing,
  CRMQuotation,
  CRMAttachment,
  CRMAuditLog,
  CRMSettings,
  CRMListResponse,
  CRMFilters,
  CRMStage,
  CRMStatus
} from '../types';
import { CRM_STAGES, REQUIRED_FIELDS, STAGE_TRANSITIONS, VALIDATION } from '../constants';

// Utility functions
const getCollection = (name: string) => collection(db!, getCRMCollection(name as keyof typeof crmConfig.collections));

const toFirestore = (data: any) => {
  const result = { ...data };
  // Remove undefined values (Firestore doesn't allow them)
  Object.keys(result).forEach(key => {
    if (result[key] === undefined) {
      delete result[key];
    }
    // Convert Date objects to Firestore Timestamps
    if (result[key] instanceof Date) {
      result[key] = Timestamp.fromDate(result[key]);
    }
  });
  return result;
};

const fromFirestore = (data: any) => {
  const result = { ...data };
  // Convert Firestore Timestamps to Date objects
  Object.keys(result).forEach(key => {
    if (result[key] instanceof Timestamp) {
      result[key] = result[key].toDate();
    }
  });
  return result;
};

const generateLeadCode = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const leadsRef = getCollection('leads');

  // Get the latest lead for this year
  const q = query(
    leadsRef,
    where('leadCode', '>=', `LEAD-${year}-`),
    where('leadCode', '<', `LEAD-${year + 1}-`),
    orderBy('leadCode', 'desc'),
    limit(1)
  );

  const snapshot = await getDocs(q);
  let nextNumber = 1;

  if (!snapshot.empty) {
    const lastLead = snapshot.docs[0].data() as CRMLead;
    const lastNumber = parseInt(lastLead.leadCode.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `LEAD-${year}-${nextNumber.toString().padStart(3, '0')}`;
};

const generateQuoteNo = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const quotesRef = getCollection('quotations');

  const q = query(
    quotesRef,
    where('quoteNo', '>=', `QUOTE-${year}-`),
    where('quoteNo', '<', `QUOTE-${year + 1}-`),
    orderBy('quoteNo', 'desc'),
    limit(1)
  );

  const snapshot = await getDocs(q);
  let nextNumber = 1;

  if (!snapshot.empty) {
    const lastQuote = snapshot.docs[0].data() as CRMQuotation;
    const lastNumber = parseInt(lastQuote.quoteNo.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `QUOTE-${year}-${nextNumber.toString().padStart(3, '0')}`;
};

// Lead operations
export const createLead = async (leadData: Omit<CRMLead, 'id' | 'leadCode' | 'createdAt' | 'updatedAt' | 'companyId'>): Promise<CRMLead> => {
  const leadCode = await generateLeadCode();
  const now = new Date();
  const companyId = getCurrentCompanyId();

  const lead: CRMLead = {
    ...leadData,
    id: '', // Will be set by Firestore
    companyId: companyId || '',
    leadCode,
    createdAt: now,
    updatedAt: now,
    stage: 'lead_created',
    status: 'open'
  };

  // Validate required fields
  const requiredFields = REQUIRED_FIELDS[lead.stage];
  for (const field of requiredFields) {
    if (!lead[field as keyof CRMLead]) {
      throw new Error(`Required field '${field}' is missing for stage '${lead.stage}'`);
    }
  }

  const docRef = await addDoc(getCollection('leads'), toFirestore(lead));
  lead.id = docRef.id;

  // Create audit log
  await createAuditLog({
    leadId: lead.id,
    action: 'lead_created',
    fromValue: null,
    toValue: { stage: lead.stage, status: lead.status },
    createdBy: lead.createdBy,
    metaData: { leadCode, source: lead.source }
  });

  return lead;
};

export const updateLead = async (id: string, updates: Partial<CRMLead>, updatedBy: string): Promise<void> => {
  const leadRef = doc(getCollection('leads'), id);
  const leadDoc = await getDoc(leadRef);

  if (!leadDoc.exists()) {
    throw new Error('Lead not found');
  }

  const currentLead = fromFirestore(leadDoc.data()) as CRMLead;
  const updatedLead = { ...currentLead, ...updates, updatedAt: new Date(), updatedBy };

  // Validate stage transition if stage is being changed
  if (updates.stage && updates.stage !== currentLead.stage) {
    if (!STAGE_TRANSITIONS[currentLead.stage].includes(updates.stage)) {
      throw new Error(`Invalid stage transition from ${currentLead.stage} to ${updates.stage}`);
    }

    // Validate required fields for new stage
    const requiredFields = REQUIRED_FIELDS[updates.stage];
    for (const field of requiredFields) {
      if (!updatedLead[field as keyof CRMLead]) {
        throw new Error(`Required field '${field}' is missing for stage '${updates.stage}'`);
      }
    }
  }

  await updateDoc(leadRef, toFirestore({
    ...updates,
    updatedAt: new Date(),
    updatedBy
  }));

  // Create audit log for significant changes
  if (updates.stage && updates.stage !== currentLead.stage) {
    await createAuditLog({
      leadId: id,
      action: 'stage_changed',
      fromValue: { stage: currentLead.stage, status: currentLead.status },
      toValue: { stage: updates.stage, status: updates.status || currentLead.status },
      createdBy: updatedBy
    });
  }
};

export const getLead = async (id: string): Promise<CRMLead | null> => {
  const leadDoc = await getDoc(doc(getCollection('leads'), id));

  if (!leadDoc.exists()) {
    return null;
  }

  return fromFirestore({ id: leadDoc.id, ...leadDoc.data() }) as CRMLead;
};

export const getLeads = async (filters: CRMFilters = {}, page = 1, pageSize = 20): Promise<CRMListResponse<CRMLead>> => {
  console.log('🔍 Getting leads from collection:', getCollection('leads'));
  const companyId = getCurrentCompanyId();

  if (!companyId) {
    console.warn('⚠️ No companyId found, trying fallback query without companyId filter');

    // Fallback: try to get all leads without companyId filter for debugging
    try {
      const leadsRef = getCollection('leads');
      const q = query(leadsRef, orderBy('createdAt', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      console.log('📊 Fallback query found', snapshot.size, 'leads without companyId filter');

      if (snapshot.size > 0) {
        const leads = snapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMLead);
        return {
          data: leads.slice((page - 1) * pageSize, page * pageSize),
          total: snapshot.size,
          page,
          limit: pageSize
        };
      }
    } catch (fallbackError) {
      console.error('❌ Fallback query also failed:', fallbackError);
    }

    return {
      data: [],
      total: 0,
      page,
      limit: pageSize
    };
  }

  let q = query(getCollection('leads'), orderBy('createdAt', 'desc'));

  // Always filter by companyId for security
  q = query(q, where('companyId', '==', companyId));
  console.log('🏢 Querying leads for companyId:', companyId);

  // Apply filters
  if (filters.stage && filters.stage.length > 0) {
    q = query(q, where('stage', 'in', filters.stage));
  }

  if (filters.status && filters.status.length > 0) {
    q = query(q, where('status', 'in', filters.status));
  }

  if (filters.assignedTo && filters.assignedTo.length > 0) {
    q = query(q, where('assignedSalesId', 'in', filters.assignedTo));
  }

  // Note: Firestore has limitations on multiple 'in' clauses and complex queries
  // For more complex filtering, we'd need to fetch and filter client-side

  try {
    const snapshot = await getDocs(q);
    const total = snapshot.size;
    console.log('📊 Found', total, 'leads in database for company:', companyId);

    if (total > 0) {
      console.log('📋 Sample lead data:', snapshot.docs.slice(0, 2).map(doc => ({
        id: doc.id,
        companyId: doc.data().companyId,
        name: doc.data().name,
        stage: doc.data().stage
      })));
    }

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const leads = snapshot.docs
      .map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMLead)
      .slice(startIndex, endIndex);

    return {
      data: leads,
      total,
      page,
      limit: pageSize,
      hasMore: endIndex < total
    };
  } catch (error: any) {
    console.error('❌ Failed to fetch leads:', error);

    // If it's an index error, try a simpler query without ordering
    if (error.message && error.message.includes('requires an index')) {
      console.log('🔄 Trying fallback query without ordering...');
      try {
        const simpleQuery = query(getCollection('leads'), where('companyId', '==', companyId));
        const snapshot = await getDocs(simpleQuery);
        console.log('📊 Fallback query found', snapshot.size, 'leads');

        const leads = snapshot.docs
          .map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMLead)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) // Sort client-side
          .slice((page - 1) * pageSize, page * pageSize);

        return {
          data: leads,
          total: snapshot.size,
          page,
          limit: pageSize,
          hasMore: page * pageSize < snapshot.size
        };
      } catch (fallbackError) {
        console.error('❌ Fallback query also failed:', fallbackError);
      }
    }

    return {
      data: [],
      total: 0,
      page,
      limit: pageSize,
      hasMore: false
    };
  }
};

export const deleteLead = async (id: string, deletedBy: string): Promise<void> => {
  // Create audit log before deletion
  await createAuditLog({
    leadId: id,
    action: 'lead_deleted',
    fromValue: null,
    toValue: null,
    createdBy: deletedBy
  });

  await deleteDoc(doc(getCollection('leads'), id));
};

// Activity operations
export const createActivity = async (activityData: Omit<CRMActivity, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMActivity> => {
  const now = new Date();

  const activity: CRMActivity = {
    ...activityData,
    id: '',
    createdAt: now,
    updatedAt: now
  };

  const docRef = await addDoc(getCollection('activities'), toFirestore(activity));
  activity.id = docRef.id;

  return activity;
};

export const getLeadActivities = async (leadId: string): Promise<CRMActivity[]> => {
  const q = query(
    getCollection('activities'),
    where('leadId', '==', leadId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMActivity);
};

// Site visit operations
export const createSiteVisit = async (visitData: Omit<CRMSiteVisit, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>): Promise<CRMSiteVisit> => {
  const now = new Date();
  const companyId = getCurrentCompanyId();

  const visit: CRMSiteVisit = {
    ...visitData,
    id: '',
    companyId: companyId || '',
    createdAt: now,
    updatedAt: now,
    status: 'scheduled'
  };

  const docRef = await addDoc(getCollection('siteVisits'), toFirestore(visit));
  visit.id = docRef.id;

  return visit;
};

export const getLeadSiteVisits = async (leadId: string): Promise<CRMSiteVisit[]> => {
  const q = query(
    getCollection('siteVisits'),
    where('leadId', '==', leadId),
    orderBy('visitAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMSiteVisit);
};

// Requirements operations
export const createRequirements = async (reqData: Omit<CRMRequirements, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMRequirements> => {
  const now = new Date();

  const requirements: CRMRequirements = {
    ...reqData,
    id: '',
    createdAt: now,
    updatedAt: now
  };

  const docRef = await addDoc(getCollection('requirements'), toFirestore(requirements));
  requirements.id = docRef.id;

  return requirements;
};

export const getLeadRequirements = async (leadId: string): Promise<CRMRequirements | null> => {
  const q = query(
    getCollection('requirements'),
    where('leadId', '==', leadId),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return fromFirestore({ id: doc.id, ...doc.data() }) as CRMRequirements;
};

// Drawing operations
export const createDrawing = async (drawingData: Omit<CRMDrawing, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMDrawing> => {
  const now = new Date();

  const drawing: CRMDrawing = {
    ...drawingData,
    id: '',
    createdAt: now,
    updatedAt: now,
    status: 'draft'
  };

  const docRef = await addDoc(getCollection('drawings'), toFirestore(drawing));
  drawing.id = docRef.id;

  return drawing;
};

export const getLeadDrawings = async (leadId: string): Promise<CRMDrawing[]> => {
  const q = query(
    getCollection('drawings'),
    where('leadId', '==', leadId),
    orderBy('version', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMDrawing);
};

// Quotation operations
export const createQuotation = async (quoteData: Omit<CRMQuotation, 'id' | 'quoteNo' | 'createdAt' | 'updatedAt'>): Promise<CRMQuotation> => {
  const quoteNo = await generateQuoteNo();
  const now = new Date();

  const quotation: CRMQuotation = {
    ...quoteData,
    id: '',
    quoteNo,
    version: 1,
    createdAt: now,
    updatedAt: now,
    status: 'draft'
  };

  const docRef = await addDoc(getCollection('quotations'), toFirestore(quotation));
  quotation.id = docRef.id;

  return quotation;
};

export const getLeadQuotations = async (leadId: string): Promise<CRMQuotation[]> => {
  const q = query(
    getCollection('quotations'),
    where('leadId', '==', leadId),
    orderBy('version', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMQuotation);
};

// Attachment operations
export const uploadAttachment = async (
  file: File,
  leadId: string,
  entityType: string,
  entityId: string,
  uploadedBy: string,
  category?: string,
  description?: string
): Promise<CRMAttachment> => {
  const fileName = `${Date.now()}-${file.name}`;
  const storageRef = ref(storage!, `crm/${leadId}/${fileName}`);

  // Upload file
  await uploadBytes(storageRef, file);
  const fileUrl = await getDownloadURL(storageRef);

  // Create attachment record
  const attachment: CRMAttachment = {
    id: '',
    leadId,
    entityType: entityType as any,
    entityId,
    fileUrl,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    category,
    description,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: uploadedBy,
    updatedBy: uploadedBy
  };

  const docRef = await addDoc(getCollection('attachments'), toFirestore(attachment));
  attachment.id = docRef.id;

  return attachment;
};

export const getLeadAttachments = async (leadId: string): Promise<CRMAttachment[]> => {
  const q = query(
    getCollection('attachments'),
    where('leadId', '==', leadId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMAttachment);
};

// Audit log operations
export const createAuditLog = async (logData: Omit<CRMAuditLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  const now = new Date();

  const log: CRMAuditLog = {
    ...logData,
    id: '',
    createdAt: now,
    updatedAt: now
  };

  await addDoc(getCollection('auditLogs'), toFirestore(log));
};

export const getLeadAuditLogs = async (leadId: string): Promise<CRMAuditLog[]> => {
  const q = query(
    getCollection('auditLogs'),
    where('leadId', '==', leadId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMAuditLog);
};

// Settings operations
export const getCRMSettings = async (): Promise<CRMSettings | null> => {
  const q = query(getCollection('settings'), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return fromFirestore({ id: doc.id, ...doc.data() }) as CRMSettings;
};

export const updateCRMSettings = async (settings: Partial<CRMSettings>, updatedBy: string): Promise<void> => {
  const settingsRef = doc(getCollection('settings'), 'main');
  const now = new Date();

  await updateDoc(settingsRef, toFirestore({
    ...settings,
    updatedAt: now,
    updatedBy
  }));
};

// Dashboard metrics
export const getDashboardMetrics = async (): Promise<any> => {
  const leadsRef = getCollection('leads');
  const snapshot = await getDocs(leadsRef);
  const leads = snapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMLead);

  const metrics = {
    totalLeads: leads.length,
    stageCounts: {} as Record<CRMStage, number>,
    statusCounts: {} as Record<CRMStatus, number>,
    conversionRate: 0,
    averageDealSize: 0
  };

  // Calculate stage and status counts
  leads.forEach(lead => {
    metrics.stageCounts[lead.stage] = (metrics.stageCounts[lead.stage] || 0) + 1;
    metrics.statusCounts[lead.status] = (metrics.statusCounts[lead.status] || 0) + 1;
  });

  // Calculate conversion rate (quotation_sent -> confirmed)
  const sentCount = metrics.stageCounts.quotation_sent || 0;
  const confirmedCount = metrics.stageCounts.confirmed || 0;
  metrics.conversionRate = sentCount > 0 ? (confirmedCount / sentCount) * 100 : 0;

  // Calculate average deal size for won leads
  const wonLeads = leads.filter(lead => lead.status === 'won' && lead.expectedValue);
  metrics.averageDealSize = wonLeads.length > 0
    ? wonLeads.reduce((sum, lead) => sum + (lead.expectedValue || 0), 0) / wonLeads.length
    : 0;

  return metrics;
};

// Convert lead to project (integration hook)
export const convertLeadToProject = async (leadId: string, userId: string): Promise<{ projectId?: string; error?: string }> => {
  const lead = await getLead(leadId);
  if (!lead) {
    return { error: 'Lead not found' };
  }

  if (lead.stage !== 'confirmed') {
    return { error: 'Lead must be in confirmed stage to convert to project' };
  }

  if (crmConfig.integrations.projects.enabled && crmConfig.integrations.projects.createProjectFromLead) {
    try {
      const result = await crmConfig.integrations.projects.createProjectFromLead({
        leadId,
        projectData: {
          customerName: lead.name,
          phone: lead.phone,
          address: lead.address,
          projectName: lead.projectName,
          budget: lead.expectedValue || lead.budgetMax || 0,
          referenceLeadId: leadId
        }
      });

      // Update lead with project reference
      await updateLead(leadId, { projectId: result.projectId }, userId);

      // Create audit log
      await createAuditLog({
        leadId,
        action: 'converted_to_project',
        fromValue: null,
        toValue: { projectId: result.projectId },
        createdBy: userId
      });

      return result;
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to create project' };
    }
  }

  return { error: 'Project integration not enabled' };
};

// Temporary function to seed test data without companyId (for debugging)
export const seedTestDataWithoutCompanyId = async (): Promise<void> => {
  console.log('🧪 Seeding test data without companyId for debugging...');

  try {
    // Use direct collection references instead of getCollection for testing
    const testCompanyId = 'test_company_123';

    // Create test leads with test companyId
    const testLeads = [
      {
        name: 'Test Lead 1',
        phone: '+91-9999999991',
        email: 'test1@example.com',
        projectName: 'Test Project 1',
        source: 'website',
        stage: 'lead_created',
        priority: 'high',
        projectType: 'residential',
        sqft: 2000,
        budgetMin: 1000000,
        budgetMax: 1500000,
        timeline: '3-6 months',
        location: 'Test City 1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        companyId: testCompanyId
      },
      {
        name: 'Test Lead 2',
        phone: '+91-9999999992',
        email: 'test2@example.com',
        projectName: 'Test Project 2',
        source: 'referral',
        stage: 'qualified',
        priority: 'medium',
        projectType: 'commercial',
        sqft: 3000,
        budgetMin: 2000000,
        budgetMax: 2500000,
        timeline: '6-12 months',
        location: 'Test City 2',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test',
        companyId: testCompanyId
      }
    ];

    const leadsRef = collection(db!, 'crm_leads');
    for (const leadData of testLeads) {
      const lead: CRMLead = {
        ...leadData,
        id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        leadCode: `TEST${Date.now()}`
      } as CRMLead;

      await addDoc(leadsRef, toFirestore(lead));
      console.log(`✅ Created test lead: ${lead.name}`);
    }

    // Create test engineers with test companyId
    const testEngineers = [
      {
        name: 'Test Engineer 1',
        email: 'engineer1@test.com',
        phone: '+91-8888888881',
        specialization: 'Senior Engineer',
        experience: 5,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        companyId: testCompanyId
      },
      {
        name: 'Test Engineer 2',
        email: 'engineer2@test.com',
        phone: '+91-8888888882',
        specialization: 'Project Engineer',
        experience: 3,
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        companyId: testCompanyId
      }
    ];

    const engineersRef = collection(db!, 'crm_engineers');
    for (const engineerData of testEngineers) {
      const engineer: CRMEngineer = {
        ...engineerData,
        id: `test_eng_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      await addDoc(engineersRef, toFirestore(engineer));
      console.log(`✅ Created test engineer: ${engineer.name}`);
    }

    console.log('🎉 Test data seeded successfully with test companyId:', testCompanyId);

  } catch (error) {
    console.error('❌ Failed to seed test data:', error);
    throw error;
  }
};

// Debug function to check CRM collections
export const debugCRMCollections = async (): Promise<void> => {
  try {
    console.log('🔍 Debugging CRM collections...');

    // Check what collections exist
    const collections = ['crm_leads', 'leads', 'crm_data'];
    for (const collectionName of collections) {
      try {
        const collectionRef = collection(db!, collectionName);
        const snapshot = await getDocs(collectionRef);
        console.log(`📊 Collection '${collectionName}': ${snapshot.size} documents`);

        if (snapshot.size > 0) {
          console.log('📋 Sample documents:', snapshot.docs.slice(0, 2).map(doc => ({
            id: doc.id,
            data: doc.data()
          })));
        }
      } catch (error) {
        console.log(`❌ Collection '${collectionName}' error:`, error);
      }
    }

    // Also check the configured collection
    try {
      const configuredCollection = getCollection('leads');
      console.log('🎯 Configured leads collection:', configuredCollection.path);
      const snapshot = await getDocs(configuredCollection);
      console.log(`📊 Configured collection has ${snapshot.size} documents`);
    } catch (error) {
      console.log('❌ Configured collection error:', error);
    }

  } catch (error) {
    console.error('❌ Failed to debug collections:', error);
  }
};

// Engineer management
export interface CRMEngineer {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  experience: number; // years
  status: 'active' | 'inactive';
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export const createEngineer = async (engineerData: Omit<CRMEngineer, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMEngineer> => {
  console.log('👷 Creating engineer:', engineerData);

  const now = new Date();
  const companyId = getCurrentCompanyId();

  if (!companyId) {
    throw new Error('No company ID found. Please ensure you are logged in with a valid company account.');
  }

  const engineer: CRMEngineer = {
    ...engineerData,
    id: '',
    companyId: companyId,
    createdAt: now,
    updatedAt: now
  };

  console.log('📝 Engineer data to save:', engineer);

  try {
    const engineersRef = getCollection('engineers');
    console.log('🎯 Saving to collection:', engineersRef.path);

    const docRef = await addDoc(engineersRef, toFirestore(engineer));
    engineer.id = docRef.id;

    console.log('✅ Engineer created successfully:', engineer.id);
    return engineer;
  } catch (error) {
    console.error('❌ Failed to create engineer:', error);
    throw error;
  }
};

export const getEngineers = async (): Promise<CRMEngineer[]> => {
  const companyId = getCurrentCompanyId();

  try {
    const engineersRef = getCollection('engineers');

    let q = query(engineersRef, orderBy('name', 'asc'));

    // Filter by company
    if (companyId) {
      q = query(q, where('companyId', '==', companyId));
    }

    const snapshot = await getDocs(q);
    console.log('👷 Found', snapshot.size, 'engineers for company:', companyId);
    return snapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMEngineer);
  } catch (error: any) {
    console.error('❌ Failed to fetch engineers:', error);

    // If it's an index error, try a simpler query
    if (error.message && error.message.includes('requires an index')) {
      console.log('🔄 Trying fallback engineer query...');
      try {
        const engineersRef = getCollection('engineers');
        const simpleQuery = companyId
          ? query(engineersRef, where('companyId', '==', companyId))
          : query(engineersRef);

        const snapshot = await getDocs(simpleQuery);
        console.log('👷 Fallback query found', snapshot.size, 'engineers');

        const engineers = snapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() }) as CRMEngineer);
        return engineers.sort((a, b) => a.name.localeCompare(b.name)); // Sort client-side
      } catch (fallbackError) {
        console.error('❌ Fallback engineer query also failed:', fallbackError);
      }
    }

    return [];
  }
};

// Seed dummy CRM data for testing
export const seedCRMData = async (): Promise<void> => {
  try {
    console.log('🌱 Seeding CRM data...');

    const dummyLeads: Partial<CRMLead>[] = [
      {
        name: 'John Smith',
        phone: '+91-9876543210',
        email: 'john.smith@email.com',
        projectName: 'Villa Construction',
        source: 'website',
        stage: 'qualified',
        priority: 'high',
        projectType: 'residential',
        sqft: 2500,
        budgetMin: 1500000,
        budgetMax: 2000000,
        timeline: '3-6 months',
        location: 'Mumbai, Maharashtra',
        createdAt: new Date('2024-12-01'),
        updatedAt: new Date('2024-12-15'),
        createdBy: 'admin'
      },
      {
        name: 'Sarah Johnson',
        phone: '+91-9876543211',
        email: 'sarah.johnson@email.com',
        projectName: 'Office Building',
        source: 'referral',
        stage: 'site_visit_scheduled',
        priority: 'medium',
        projectType: 'commercial',
        sqft: 5000,
        budgetMin: 5000000,
        budgetMax: 7500000,
        timeline: '6-12 months',
        location: 'Delhi, NCR',
        nextFollowUpAt: new Date('2024-12-25'),
        createdAt: new Date('2024-12-10'),
        updatedAt: new Date('2024-12-20'),
        createdBy: 'admin'
      },
      {
        name: 'Mike Davis',
        phone: '+91-9876543212',
        email: 'mike.davis@email.com',
        projectName: 'Warehouse Construction',
        source: 'cold_call',
        stage: 'requirements_collected',
        priority: 'medium',
        projectType: 'industrial',
        sqft: 10000,
        budgetMin: 3000000,
        budgetMax: 4500000,
        timeline: '4-8 months',
        location: 'Pune, Maharashtra',
        createdAt: new Date('2024-12-05'),
        updatedAt: new Date('2024-12-18'),
        createdBy: 'admin'
      },
      {
        name: 'Emily Chen',
        phone: '+91-9876543213',
        email: 'emily.chen@email.com',
        projectName: 'Apartment Complex',
        source: 'social_media',
        stage: 'quotation_sent',
        priority: 'high',
        projectType: 'residential',
        sqft: 15000,
        budgetMin: 25000000,
        budgetMax: 35000000,
        timeline: '12-18 months',
        location: 'Bangalore, Karnataka',
        createdAt: new Date('2024-11-15'),
        updatedAt: new Date('2024-12-12'),
        createdBy: 'admin'
      },
      {
        name: 'Raj Patel',
        phone: '+91-9876543214',
        email: 'raj.patel@email.com',
        projectName: 'Retail Store',
        source: 'website',
        stage: 'confirmed',
        priority: 'low',
        projectType: 'commercial',
        sqft: 2000,
        budgetMin: 800000,
        budgetMax: 1200000,
        timeline: '2-3 months',
        location: 'Ahmedabad, Gujarat',
        createdAt: new Date('2024-11-20'),
        updatedAt: new Date('2024-12-10'),
        createdBy: 'admin'
      }
    ];

    // Generate lead codes and add to Firestore
    for (const leadData of dummyLeads) {
      const leadCode = await generateLeadCode();
      const companyId = getCurrentCompanyId();
      const lead: CRMLead = {
        id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        leadCode,
        companyId: companyId || '',
        ...leadData
      } as CRMLead;

      const leadsRef = getCollection('leads');
      await addDoc(leadsRef, toFirestore(lead));
      console.log(`✅ Created lead: ${lead.name} (${lead.leadCode})`);
    }

    // Seed engineers
    const engineersData = [
      {
        name: 'John Smith',
        email: 'john.smith@company.com',
        phone: '+91-9876543210',
        specialization: 'Senior Engineer',
        experience: 8,
        status: 'active' as const
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@company.com',
        phone: '+91-9876543211',
        specialization: 'Project Engineer',
        experience: 5,
        status: 'active' as const
      },
      {
        name: 'Mike Davis',
        email: 'mike.davis@company.com',
        phone: '+91-9876543212',
        specialization: 'Site Engineer',
        experience: 6,
        status: 'active' as const
      }
    ];

    for (const engineerData of engineersData) {
      await createEngineer(engineerData);
      console.log(`✅ Created engineer: ${engineerData.name}`);
    }

    // Seed default CRM settings
    const settingsRef = getCollection('settings');
    const defaultSettings = {
      id: 'default_settings',
      leadSources: ['website', 'referral', 'cold_call', 'social_media', 'advertisement'],
      projectTypes: ['residential', 'commercial', 'industrial', 'institutional'],
      priorities: ['low', 'medium', 'high'],
      currencies: ['INR', 'USD', 'EUR'],
      defaultCurrency: 'INR',
      autoAssignLeadCode: true,
      enableNotifications: true,
      enableAuditLogs: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await addDoc(settingsRef, toFirestore(defaultSettings));
    console.log('✅ Created default CRM settings');

    console.log('🎉 CRM data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Failed to seed CRM data:', error);
    throw error;
  }
};
