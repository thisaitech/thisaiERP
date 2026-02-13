# CRM Package Installation Guide

This document provides step-by-step instructions for integrating the Construction CRM module into your existing ERP system.

## Overview

The CRM package is a self-contained module that can be integrated into any React-based ERP system. It includes:

- Complete lead management pipeline
- Site visit scheduling and tracking
- Requirements collection and drawing management
- Quotation generation with PDF export
- Activity timeline and audit logs
- File attachments and storage
- Role-based permissions
- Mobile responsive design

## Prerequisites

- React/TypeScript application
- Firebase/Firestore backend (or adapt to your backend)
- Tailwind CSS for styling
- Phosphor Icons library
- Date-fns for date handling

## Installation Steps

### Step 1: Copy Files

Copy the entire `/crm` folder from this package into your ERP's `src` directory:

```
your-erp/
├── src/
│   ├── crm/           # ← Copy this entire folder
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   ├── constants/
│   │   ├── contexts/
│   │   └── config.ts
│   └── ...
```

### Step 2: Install Dependencies

Add these dependencies to your `package.json`:

```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.0.8",
    "@dnd-kit/sortable": "^7.0.2",
    "@dnd-kit/utilities": "^3.2.1",
    "date-fns": "^4.1.0",
    "framer-motion": "^11.0.3",
    "jspdf": "^3.0.4",
    "jspdf-autotable": "^5.0.2",
    "react-router-dom": "^6.21.3"
  }
}
```

### Step 3: Update Firebase Collections

Add CRM collections to your Firebase configuration in `src/services/firebase.ts`:

```typescript
export const COLLECTIONS = {
  // ... existing collections
  CRM_LEADS: 'crm_leads',
  CRM_ACTIVITIES: 'crm_activities',
  CRM_SITE_VISITS: 'crm_site_visits',
  CRM_REQUIREMENTS: 'crm_requirements',
  CRM_DRAWINGS: 'crm_drawings',
  CRM_QUOTATIONS: 'crm_quotations',
  CRM_ATTACHMENTS: 'crm_attachments',
  CRM_AUDIT_LOGS: 'crm_audit_logs',
  CRM_SETTINGS: 'crm_settings'
} as const
```

### Step 4: Configure CRM Module

Create a configuration file for your ERP in `src/crm/config.local.ts`:

```typescript
import { configureCRM } from './config';

configureCRM({
  basePath: '/crm', // Adjust based on your routing
  collections: {
    // Map to your collection names if different
    leads: 'your_crm_leads',
    activities: 'your_crm_activities',
    // ... etc
  },
  integrations: {
    projects: {
      enabled: true,
      createProjectFromLead: async (leadData) => {
        // Implement your project creation logic
        return {
          projectId: 'generated-id',
          projectUrl: '/projects/generated-id'
        };
      }
    },
    auth: {
      getCurrentUser: () => {
        // Return your user object
        return { uid: 'user-id', role: 'admin' };
      },
      checkPermission: (permission, user) => {
        // Implement your permission logic
        return true;
      },
      roles: ['admin', 'manager', 'sales', 'engineer']
    }
  }
});
```

### Step 5: Add CRM Routes

Update your main routing file (usually `App.tsx` or `routes.tsx`):

```typescript
import CRMPage from './crm/pages/CRMPage';

// Add to your routes
<Route path="/crm/*" element={<CRMPage />} />
```

### Step 6: Add Navigation Menu

Update your navigation component to include CRM:

```typescript
import { Buildings } from '@phosphor-icons/react';

// Add to navigation items
{
  path: '/crm',
  label: 'CRM',
  icon: Buildings,
  allowedRoles: ['admin', 'manager', 'sales'],
  pageKey: 'crm'
}
```

### Step 7: Initialize CRM Context

Wrap your app or CRM routes with the CRM provider:

```typescript
import { CRMProvider } from './crm/contexts/CRMContext';

// Wrap CRM routes
<CRMProvider>
  <Route path="/crm/*" element={<CRMPage />} />
</CRMProvider>
```

### Step 8: Set Up Permissions

Update your permission system to include CRM permissions:

```typescript
const crmPermissions = {
  'crm.leads.view': ['admin', 'manager', 'sales'],
  'crm.leads.create': ['admin', 'manager', 'sales'],
  'crm.leads.edit': ['admin', 'manager', 'sales'],
  'crm.quotations.approve': ['admin', 'manager'],
  'crm.settings.manage': ['admin']
};
```

### Step 9: Configure File Storage

Set up file storage for attachments. The CRM supports multiple storage drivers:

**Option A: Firebase Storage (Default)**
```typescript
// Already configured if using Firebase
CRM_STORAGE_DRIVER=firebase
```

**Option B: Local Storage**
```typescript
CRM_STORAGE_DRIVER=local
CRM_STORAGE_PUBLIC_BASE_URL=http://your-domain.com/uploads
```

**Option C: S3/R2 Storage**
```typescript
CRM_STORAGE_DRIVER=s3
CRM_STORAGE_PUBLIC_BASE_URL=https://your-bucket.s3.amazonaws.com
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=your-region
AWS_BUCKET=your-bucket
```

### Step 10: Database Migration

Run the database migration to create CRM tables. If using Firebase, the collections will be created automatically. For other databases, create the following tables:

```sql
-- Leads table
CREATE TABLE crm_leads (
  id UUID PRIMARY KEY,
  lead_code VARCHAR(20) UNIQUE,
  name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  project_name TEXT,
  address TEXT,
  city VARCHAR(100),
  source VARCHAR(50),
  priority VARCHAR(20),
  assigned_sales_id UUID,
  assigned_engineer_id UUID,
  stage VARCHAR(50),
  status VARCHAR(20),
  expected_value DECIMAL(15,2),
  budget_min DECIMAL(15,2),
  budget_max DECIMAL(15,2),
  sqft DECIMAL(10,2),
  project_type VARCHAR(100),
  timeline VARCHAR(100),
  next_follow_up_at TIMESTAMP,
  last_contact_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  company_id UUID
);

-- Add indexes for performance
CREATE INDEX idx_crm_leads_stage ON crm_leads(stage);
CREATE INDEX idx_crm_leads_status ON crm_leads(status);
CREATE INDEX idx_crm_leads_assigned_sales ON crm_leads(assigned_sales_id);
CREATE INDEX idx_crm_leads_company ON crm_leads(company_id);

-- Activities table
CREATE TABLE crm_activities (
  id UUID PRIMARY KEY,
  lead_id UUID REFERENCES crm_leads(id),
  type VARCHAR(20),
  title VARCHAR(255),
  description TEXT,
  scheduled_at TIMESTAMP,
  completed_at TIMESTAMP,
  reminder_at TIMESTAMP,
  outcome TEXT,
  duration INTEGER,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Other tables (site_visits, requirements, drawings, quotations, attachments, audit_logs)
-- Follow the same pattern as above
```

### Step 11: Seed Initial Data

Create initial CRM settings and seed data:

```typescript
// Initialize CRM settings
const initialSettings = {
  leadSources: ['Website', 'Facebook', 'Google Ads', 'Referral', 'Cold Call'],
  lostReasons: ['Price too high', 'Competition', 'Budget constraints'],
  projectTypes: ['Residential House', 'Commercial Building', 'Villa'],
  siteVisitChecklist: [
    'Site accessibility checked',
    'Existing structure assessment done',
    'Utility connections identified'
  ]
};

await updateCRMSettings(initialSettings, 'system');
```

### Step 12: Test the Integration

1. Start your development server
2. Navigate to `/crm`
3. Create a test lead
4. Test the pipeline workflow
5. Verify file uploads work
6. Test role permissions

## Configuration Options

### Environment Variables

```env
# CRM Configuration
CRM_BASE_PATH=/crm
CRM_STORAGE_DRIVER=firebase
CRM_STORAGE_PUBLIC_BASE_URL=
CRM_PROJECT_INTEGRATION=enabled

# Optional: S3 Configuration
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_BUCKET=your-crm-bucket

# Optional: Email Configuration (for notifications)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### Module Configuration

```typescript
configureCRM({
  // Base path for CRM routes
  basePath: '/crm',

  // Collection names (customize if needed)
  collections: {
    leads: 'crm_leads',
    activities: 'crm_activities',
    // ... etc
  },

  // Storage configuration
  storage: {
    driver: 'firebase', // 'firebase' | 'local' | 's3'
    bucket: 'your-bucket',
    publicBaseUrl: 'https://your-domain.com'
  },

  // Integration hooks
  integrations: {
    projects: {
      enabled: true,
      createProjectFromLead: yourProjectCreationFunction
    },
    auth: {
      getCurrentUser: yourUserFunction,
      checkPermission: yourPermissionFunction
    }
  },

  // Feature toggles
  features: {
    leadQualification: true,
    quotationApproval: true,
    siteVisitGeoLocation: true,
    duplicateDetection: true
  }
});
```

## Customization Guide

### Adding Custom Fields

1. Update the `CRMLead` interface in `types/index.ts`
2. Add form fields in `CRMLeadDetail.tsx`
3. Update the database schema
4. Add validation rules in the service

### Custom Pipeline Stages

1. Add new stages to `CRM_STAGES` in `constants/index.ts`
2. Update `STAGE_TRANSITIONS` for workflow rules
3. Add UI components for the new stages

### Custom Permissions

1. Add new permissions to your permission system
2. Update the role definitions
3. Add permission checks in components

## Troubleshooting

### Common Issues

1. **Navigation not showing**: Check that CRM permissions are configured
2. **Routes not working**: Verify base path configuration
3. **Firebase errors**: Check collection names and permissions
4. **File uploads failing**: Verify storage configuration
5. **Permissions denied**: Check role assignments

### Debug Mode

Enable debug logging:

```typescript
localStorage.setItem('crm_debug', 'true');
```

### Reset CRM Data

To reset all CRM data (development only):

```typescript
// This will clear all CRM collections
await clearAllCRMData();
```

## Support

For issues or questions about the CRM package:

1. Check the documentation in `/crm/README.md`
2. Review the code comments
3. Check the troubleshooting section above
4. Create an issue in the repository

## Version History

- **v1.0.0**: Initial release with full CRM functionality
- Pipeline management, activities, attachments, quotations
- Firebase integration, role-based permissions
- Mobile responsive design

---

## Export Summary

This CRM package can be completely extracted and integrated into any React-based ERP system. The modular architecture ensures clean separation of concerns and easy customization.

**Key Export Files:**
- `/crm/` - Complete CRM module
- `CRM_PACKAGE.md` - This installation guide
- Database schema and migration scripts
- Configuration examples and templates

**Integration Points:**
- Navigation menu integration
- Permission system integration
- Project handover integration
- File storage integration
- User management integration


































