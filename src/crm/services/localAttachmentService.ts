// Local Attachment Service - Uses IndexedDB to store attachments locally
// This avoids Firebase CORS and data consistency issues

import { CRMAttachment, CRMSiteVisit } from '../types';

interface LocalAttachment {
  id: string;
  leadId: string;
  entityType: string;
  entityId: string;
  fileUrl: string; // Base64 data URL
  fileName: string;
  fileSize: number;
  mimeType: string;
  category?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

class LocalAttachmentStorage {
  private dbName = 'crm_attachments';
  private version = 1;

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('attachments')) {
          const store = db.createObjectStore('attachments', { keyPath: 'id' });
          store.createIndex('leadId', 'leadId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  async saveAttachment(attachment: LocalAttachment): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['attachments'], 'readwrite');
      const store = transaction.objectStore('attachments');
      const request = store.put(attachment);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAttachmentsByLeadId(leadId: string): Promise<LocalAttachment[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['attachments'], 'readonly');
      const store = transaction.objectStore('attachments');
      const index = store.index('leadId');
      const request = index.getAll(leadId);

      request.onsuccess = () => {
        const attachments = request.result as LocalAttachment[];
        // Sort by createdAt descending
        attachments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(attachments);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllAttachments(): Promise<LocalAttachment[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['attachments'], 'readonly');
      const store = transaction.objectStore('attachments');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteAttachment(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['attachments'], 'readwrite');
      const store = transaction.objectStore('attachments');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['attachments'], 'readwrite');
      const store = transaction.objectStore('attachments');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
const localStorage = new LocalAttachmentStorage();

// Convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

// Local attachment service functions
export const uploadAttachmentLocal = async (
  file: File,
  leadId: string,
  entityType: string,
  entityId: string,
  uploadedBy: string,
  category?: string,
  description?: string
): Promise<LocalAttachment> => {
  // Check file size (limit to 10MB for local storage)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size must be less than 10MB');
  }

  // Convert file to base64
  const fileUrl = await fileToBase64(file);

  // Create attachment record
  const attachment: LocalAttachment = {
    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9), // Unique ID
    leadId,
    entityType,
    entityId,
    fileUrl, // Base64 data URL
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

  await localStorage.saveAttachment(attachment);

  return attachment;
};

export const getLeadAttachmentsLocal = async (leadId: string): Promise<LocalAttachment[]> => {
  return await localStorage.getAttachmentsByLeadId(leadId);
};

export const deleteAttachmentLocal = async (id: string): Promise<void> => {
  await localStorage.deleteAttachment(id);
};

export const clearAllAttachmentsLocal = async (): Promise<void> => {
  await localStorage.clearAll();
};

export const getAllAttachmentsLocal = async (): Promise<LocalAttachment[]> => {
  return await localStorage.getAllAttachments();
};

// Site Visit Local Storage
interface LocalSiteVisit {
  id: string;
  leadId: string;
  engineerId: string;
  engineerName: string;
  visitAt: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  photos?: string[];
  checklist: Record<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

class LocalSiteVisitStorage {
  private dbName = 'crm_site_visits';
  private version = 1;

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('siteVisits')) {
          const store = db.createObjectStore('siteVisits', { keyPath: 'id' });
          store.createIndex('leadId', 'leadId', { unique: false });
          store.createIndex('visitAt', 'visitAt', { unique: false });
        }
      };
    });
  }

  async saveSiteVisit(visit: LocalSiteVisit): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['siteVisits'], 'readwrite');
      const store = transaction.objectStore('siteVisits');
      const request = store.put(visit);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSiteVisitsByLeadId(leadId: string): Promise<LocalSiteVisit[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['siteVisits'], 'readonly');
      const store = transaction.objectStore('siteVisits');
      const index = store.index('leadId');
      const request = index.getAll(leadId);

      request.onsuccess = () => {
        const visits = request.result as LocalSiteVisit[];
        // Sort by visitAt descending
        visits.sort((a, b) => new Date(b.visitAt).getTime() - new Date(a.visitAt).getTime());
        resolve(visits);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllSiteVisits(): Promise<LocalSiteVisit[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['siteVisits'], 'readonly');
      const store = transaction.objectStore('siteVisits');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSiteVisit(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['siteVisits'], 'readwrite');
      const store = transaction.objectStore('siteVisits');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllSiteVisits(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['siteVisits'], 'readwrite');
      const store = transaction.objectStore('siteVisits');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
const localSiteVisitStorage = new LocalSiteVisitStorage();

// Site Visit Local Storage Functions
export const createSiteVisitLocal = async (
  visitData: Omit<LocalSiteVisit, 'id' | 'createdAt' | 'updatedAt'>
): Promise<LocalSiteVisit> => {
  const visit: LocalSiteVisit = {
    ...visitData,
    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: visitData.status || 'scheduled'
  };

  await localSiteVisitStorage.saveSiteVisit(visit);

  return visit;
};

export const getLeadSiteVisitsLocal = async (leadId: string): Promise<LocalSiteVisit[]> => {
  return await localSiteVisitStorage.getSiteVisitsByLeadId(leadId);
};

export const deleteSiteVisitLocal = async (id: string): Promise<void> => {
  await localSiteVisitStorage.deleteSiteVisit(id);
};

export const clearAllSiteVisitsLocal = async (): Promise<void> => {
  await localSiteVisitStorage.clearAllSiteVisits();
};

export const getAllSiteVisitsLocal = async (): Promise<LocalSiteVisit[]> => {
  return await localSiteVisitStorage.getAllSiteVisits();
};

// Type conversion functions
export const localAttachmentToCRMAttachment = (local: LocalAttachment): CRMAttachment => {
  return {
    id: local.id,
    leadId: local.leadId,
    entityType: local.entityType as any,
    entityId: local.entityId,
    fileUrl: local.fileUrl,
    fileName: local.fileName,
    fileSize: local.fileSize,
    mimeType: local.mimeType,
    category: local.category,
    description: local.description,
    createdAt: local.createdAt,
    updatedAt: local.updatedAt,
    createdBy: local.createdBy,
    updatedBy: local.updatedBy
  };
};

export const crmAttachmentToLocalAttachment = (crm: CRMAttachment): LocalAttachment => {
  return {
    id: crm.id,
    leadId: crm.leadId,
    entityType: crm.entityType,
    entityId: crm.entityId,
    fileUrl: crm.fileUrl,
    fileName: crm.fileName,
    fileSize: crm.fileSize,
    mimeType: crm.mimeType,
    category: crm.category,
    description: crm.description,
    createdAt: crm.createdAt,
    updatedAt: crm.updatedAt,
    createdBy: crm.createdBy,
    updatedBy: crm.updatedBy
  };
};

// Site Visit type conversion functions
export const localSiteVisitToCRMSiteVisit = (local: LocalSiteVisit): CRMSiteVisit => {
  return {
    id: local.id,
    leadId: local.leadId,
    engineerId: local.engineerId,
    engineerName: local.engineerName,
    visitAt: local.visitAt,
    status: local.status,
    notes: local.notes,
    photos: local.photos,
    checklist: local.checklist,
    createdAt: local.createdAt,
    updatedAt: local.updatedAt,
    createdBy: local.createdBy,
    updatedBy: local.updatedBy
  };
};

export const crmSiteVisitToLocalSiteVisit = (crm: CRMSiteVisit): LocalSiteVisit => {
  return {
    id: crm.id,
    leadId: crm.leadId,
    engineerId: crm.engineerId,
    engineerName: crm.engineerName,
    visitAt: crm.visitAt,
    status: crm.status,
    notes: crm.notes,
    photos: crm.photos,
    checklist: crm.checklist,
    createdAt: crm.createdAt,
    updatedAt: crm.updatedAt,
    createdBy: crm.createdBy,
    updatedBy: crm.updatedBy
  };
};

