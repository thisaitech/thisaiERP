// CRM Database Adapters
// This module provides database abstraction for the CRM module
// allowing it to work with any backend database

export * from './types';
export { FirebaseCRMAdapter, createFirebaseAdapter } from './firebaseAdapter';

import { CRMDatabaseAdapter, CRMAdapterConfig } from './types';
import { createFirebaseAdapter } from './firebaseAdapter';

// Global adapter instance
let currentAdapter: CRMDatabaseAdapter | null = null;

// Initialize CRM with a specific adapter
export const initializeCRMAdapter = async (config: CRMAdapterConfig): Promise<CRMDatabaseAdapter> => {
  switch (config.type) {
    case 'firebase':
      currentAdapter = createFirebaseAdapter(config);
      break;

    // Add more adapters here as they are implemented
    // case 'mongodb':
    //   currentAdapter = createMongoDBAdapter(config);
    //   break;
    // case 'postgresql':
    //   currentAdapter = createPostgreSQLAdapter(config);
    //   break;
    // case 'rest-api':
    //   currentAdapter = createRestAPIAdapter(config);
    //   break;

    default:
      throw new Error(`Unsupported adapter type: ${config.type}`);
  }

  await currentAdapter.initialize();

  return currentAdapter;
};

// Get the current adapter instance
export const getCRMAdapter = (): CRMDatabaseAdapter => {
  if (!currentAdapter) {
    // Auto-initialize with Firebase as default
    console.warn('⚠️ CRM Adapter not initialized, using Firebase as default');
    currentAdapter = createFirebaseAdapter({ type: 'firebase' });
  }
  return currentAdapter;
};

// Set a custom adapter (useful for testing or custom implementations)
export const setCRMAdapter = (adapter: CRMDatabaseAdapter): void => {
  currentAdapter = adapter;
};

// Dispose the current adapter
export const disposeCRMAdapter = async (): Promise<void> => {
  if (currentAdapter) {
    await currentAdapter.dispose();
    currentAdapter = null;
  }
};
