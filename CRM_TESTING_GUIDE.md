# CRM System Testing Guide

## Issues Fixed

### 1. ✅ Engineers Collection Not Configured
**Problem**: The `engineers` collection was not defined in the CRM config, causing errors when trying to add engineers.

**Fix**: Added `engineers: 'crm_engineers'` to the collections configuration in [config.ts](src/crm/config.ts#L24-L106).

**Impact**: Engineers can now be properly saved to Firebase.

---

### 2. ✅ Site Visit Missing Required Field
**Problem**: The `createSiteVisit` function required a `checklist` field, but it wasn't being provided when scheduling visits.

**Fix**: Added `checklist: {}` (empty object) to the site visit creation in [CRMPage.tsx:51-59](src/crm/pages/CRMPage.tsx#L51-L59).

**Impact**: Site visits can now be scheduled without errors.

---

### 3. ✅ Dashboard Metrics Missing Activities Data
**Problem**: The dashboard expected `upcomingFollowUps`, `overdueFollowUps`, and `recentActivities`, but `getDashboardMetrics` wasn't returning them.

**Fix**: Enhanced `getDashboardMetrics` in [crmService.ts:637-714](src/crm/services/crmService.ts#L637-L714) to:
- Fetch recent activities
- Fetch upcoming follow-ups
- Fetch overdue follow-ups
- Filter leads by companyId for security

**Impact**: Dashboard now shows complete data including activities and follow-ups.

---

## Complete CRM Workflow Testing

### Prerequisites
1. **User Authentication**: Ensure you're logged in with a user account that has a `companyId` field.
2. **Firebase Setup**: Verify Firebase is configured and connected.

### Test 1: Add Engineers (Settings)

**Steps**:
1. Navigate to CRM → Settings
2. Scroll to the "Engineers" section
3. Click "Add Engineer" button
4. Fill in the form:
   - Name: "John Smith"
   - Email: "john.smith@example.com"
   - Phone: "+91-9876543210"
   - Specialization: "Senior Engineer"
   - Experience: 8
   - Status: Active
5. Click "Add Engineer"

**Expected Results**:
- ✅ Engineer is created successfully
- ✅ Engineer appears in the list
- ✅ No console errors
- ✅ Data is saved to Firebase collection `crm_engineers`

**Firebase Verification**:
```
Collection: crm_engineers
Document fields:
- id: auto-generated
- name: "John Smith"
- email: "john.smith@example.com"
- phone: "+91-9876543210"
- specialization: "Senior Engineer"
- experience: 8
- status: "active"
- companyId: [your company ID]
- createdAt: [timestamp]
- updatedAt: [timestamp]
```

---

### Test 2: Create a New Lead

**Steps**:
1. Navigate to CRM → Leads
2. Click "Create Lead" button
3. Fill in the form:
   - Name: "Test Customer"
   - Phone: "+91-9999999999"
   - Email: "test@example.com"
   - Project Name: "Test Villa Construction"
   - Address: "123 Test Street"
   - City: "Mumbai"
   - Source: Website
   - Priority: High
   - Expected Value: 5000000
   - Square Feet: 2500
   - Project Type: Residential House
4. Click "Create Lead"

**Expected Results**:
- ✅ Lead is created with auto-generated lead code (e.g., LEAD-2025-001)
- ✅ Lead appears in the leads list
- ✅ Lead stage is set to "lead_created"
- ✅ Lead status is "open"
- ✅ Audit log is created for lead creation

---

### Test 3: Schedule Site Visit

**Steps**:
1. Navigate to CRM → Leads
2. Find the lead you just created
3. Click the calendar icon to "Schedule Visit"
4. Fill in the visit details:
   - Visit Date: [Select tomorrow's date]
   - Visit Time: 10:00 AM
   - Engineer: Select "John Smith" (from the engineer you added)
   - Notes: "Initial site inspection"
5. Click "Schedule Visit"

**Expected Results**:
- ✅ Site visit is created successfully
- ✅ Lead stage is updated to "site_visit_scheduled"
- ✅ Lead's nextFollowUpAt is set to the visit date/time
- ✅ No console errors about missing checklist
- ✅ Data is saved to Firebase collection `crm_site_visits`

**Firebase Verification**:
```
Collection: crm_site_visits
Document fields:
- id: auto-generated
- leadId: [lead ID]
- engineerId: [engineer ID]
- engineerName: "John Smith"
- visitAt: [scheduled date/time]
- notes: "Initial site inspection"
- checklist: {}
- status: "scheduled"
- companyId: [your company ID]
- createdAt: [timestamp]
- updatedAt: [timestamp]
```

---

### Test 4: Verify Dashboard Data

**Steps**:
1. Navigate to CRM → Dashboard
2. Observe the metrics cards
3. Check the pipeline overview
4. Check recent activities
5. Check upcoming follow-ups

**Expected Results**:
- ✅ **Total Leads**: Shows correct count (at least 1)
- ✅ **Active Leads**: Shows leads that are not won/lost
- ✅ **Pipeline Overview**: Shows lead distribution across stages
  - Should show 1 lead in "Site Visit Scheduled" stage
- ✅ **Recent Activities**: Shows any activities created
- ✅ **Upcoming Follow-ups**: Shows the scheduled site visit
- ✅ **Performance Insights**: Shows metrics like average deal size, win rate, etc.
- ✅ No loading errors
- ✅ No "Failed to load dashboard" errors

---

### Test 5: Verify Pipeline Board

**Steps**:
1. Navigate to CRM → Pipeline
2. Observe the Kanban board
3. Check each column for leads

**Expected Results**:
- ✅ Pipeline displays all stages as columns:
  - Lead Created
  - Qualified
  - Site Visit Scheduled (should have 1 lead)
  - Requirements Collected
  - Drawing Prepared
  - Quotation Sent
  - Negotiation
- ✅ The test lead appears in the "Site Visit Scheduled" column
- ✅ Lead card shows:
  - Name: "Test Customer"
  - Project: "Test Villa Construction"
  - Phone number
  - Expected value: ₹50,00,000
  - City: Mumbai
  - Priority badge
- ✅ "Closed Leads Summary" section shows Won and Lost counts
- ✅ No console errors
- ✅ Can drag and drop leads between stages (optional feature test)

---

### Test 6: Lead Detail View

**Steps**:
1. From the Pipeline or Leads list, click on a lead
2. Navigate through the tabs:
   - Overview
   - Activities
   - Site Visits
   - Requirements
   - Drawings
   - Quotations
   - Attachments

**Expected Results**:
- ✅ **Overview Tab**: Shows all lead information
  - Can edit fields
  - Save button works
- ✅ **Activities Tab**: Shows the site visit as an activity
- ✅ **Site Visits Tab**: Shows scheduled site visit (when implemented)
- ✅ Pipeline progress indicator shows correct stage
- ✅ Quick action buttons (Call, WhatsApp) work

---

## Common Issues & Solutions

### Issue 1: "No company ID found" Error

**Cause**: User doesn't have a `companyId` field in their profile.

**Solution**:
1. Check localStorage: Open browser DevTools → Application → Local Storage
2. Look for the `user` key
3. Verify the user object has a `companyId` field
4. If missing, you need to:
   - Create a company in Firebase
   - Update the user document to include the companyId

**Quick Fix for Testing**:
Update your user in Firebase to include:
```json
{
  "uid": "your-user-id",
  "email": "your-email",
  "companyId": "test_company_123"
}
```

---

### Issue 2: "Requires an index" Firebase Error

**Cause**: Firebase needs compound indexes for complex queries.

**Solution**:
1. Click the link in the error message (it will open Firebase Console)
2. Or manually create indexes at: https://console.firebase.google.com/project/YOUR_PROJECT/firestore/indexes

**Required Indexes**:

**Index 1** - For leads queries:
- Collection: `crm_leads`
- Fields:
  - `companyId` (Ascending)
  - `createdAt` (Descending)

**Index 2** - For engineers queries:
- Collection: `crm_engineers`
- Fields:
  - `companyId` (Ascending)
  - `name` (Ascending)

**Index 3** - For activities upcoming:
- Collection: `crm_activities`
- Fields:
  - `scheduledAt` (Ascending)

**Index 4** - For activities overdue:
- Collection: `crm_activities`
- Fields:
  - `scheduledAt` (Ascending)
  - `completedAt` (Ascending)

---

### Issue 3: Engineers Not Showing in Dropdown

**Cause**: No engineers have been added yet, or they're not being fetched.

**Solution**:
1. First, add engineers through Settings
2. If engineers exist but don't show:
   - Check browser console for errors
   - Verify the `crm_engineers` collection exists in Firebase
   - Check that engineers have the correct `companyId`

**Fallback**: The schedule visit modal includes 3 default engineers for testing when no engineers are found.

---

### Issue 4: Dashboard Shows No Data

**Cause**: No leads exist, or leads aren't being fetched properly.

**Solution**:
1. Create test leads first
2. Check browser console for errors
3. Verify Firebase connection
4. Use the "Seed Sample Data" button (if available in dev mode)
5. Check that leads have the correct `companyId`

---

## Data Flow Verification

### Lead Creation → Dashboard Update
1. **Create Lead** → Lead saved to `crm_leads` collection
2. **CRM Context** → Calls `refreshLeads()` to reload leads
3. **Dashboard** → Calls `getDashboardMetrics()` to recalculate metrics
4. **Display** → Dashboard shows updated counts and pipeline distribution

### Site Visit Schedule → Dashboard Update
1. **Schedule Visit** → Creates document in `crm_site_visits`
2. **Update Lead** → Changes lead stage to `site_visit_scheduled`
3. **CRM Context** → Calls `refreshLeads()` and `refreshDashboard()`
4. **Pipeline** → Lead moves to "Site Visit Scheduled" column
5. **Dashboard** → Shows visit in "Upcoming Follow-ups"

### Engineer Addition → Schedule Visit
1. **Add Engineer** → Saved to `crm_engineers` collection
2. **Schedule Modal** → Fetches engineers via `getEngineers()`
3. **Dropdown** → Populates with engineer list
4. **Selection** → Engineer ID and name stored with site visit

---

## Testing Checklist

### Settings Page
- [ ] Can add new engineer
- [ ] Engineer appears in list
- [ ] Can edit engineer (when implemented)
- [ ] Can change engineer status
- [ ] Can add/remove lead sources
- [ ] Can add/remove lost reasons
- [ ] Can add/remove project types
- [ ] Settings save successfully

### Leads Management
- [ ] Can create new lead
- [ ] Lead appears in leads list
- [ ] Lead has auto-generated code
- [ ] Can search/filter leads
- [ ] Can sort leads
- [ ] Can view lead details
- [ ] Can edit lead information
- [ ] Can schedule site visit
- [ ] Can add activities/notes

### Dashboard
- [ ] Shows total leads count
- [ ] Shows active leads count
- [ ] Shows won deals count
- [ ] Shows conversion rate
- [ ] Pipeline overview displays correctly
- [ ] Recent activities show up
- [ ] Upcoming follow-ups show up
- [ ] Performance insights calculate correctly

### Pipeline Board
- [ ] All stage columns display
- [ ] Leads appear in correct stages
- [ ] Lead cards show complete information
- [ ] Can drag leads between stages
- [ ] Stage changes persist
- [ ] Closed leads summary shows counts
- [ ] No duplicate leads appear

### Data Persistence
- [ ] Leads persist after page refresh
- [ ] Engineers persist after page refresh
- [ ] Site visits persist after page refresh
- [ ] Dashboard metrics update in real-time
- [ ] Pipeline updates after lead changes

---

## Performance Checklist

- [ ] Dashboard loads in < 2 seconds
- [ ] Leads list loads in < 2 seconds
- [ ] Pipeline board loads in < 3 seconds
- [ ] No memory leaks (check DevTools Memory)
- [ ] No console errors
- [ ] No console warnings (except expected index warnings)

---

## Browser Console Debug Commands

Open browser console and run these to debug:

```javascript
// Check current user and companyId
const user = JSON.parse(localStorage.getItem('user'));
console.log('Current User:', user);
console.log('Company ID:', user?.companyId);

// Check CRM collections
import { debugCRMCollections } from './src/crm/services/crmService';
debugCRMCollections();

// Check leads count
import { getLeads } from './src/crm/services/crmService';
const result = await getLeads();
console.log('Leads:', result.data.length);

// Check engineers count
import { getEngineers } from './src/crm/services/crmService';
const engineers = await getEngineers();
console.log('Engineers:', engineers.length);
```

---

## Summary of Fixed Files

1. **[src/crm/config.ts](src/crm/config.ts)** - Added engineers collection configuration
2. **[src/crm/pages/CRMPage.tsx](src/crm/pages/CRMPage.tsx)** - Added checklist field to site visit creation
3. **[src/crm/services/crmService.ts](src/crm/services/crmService.ts)** - Enhanced getDashboardMetrics with activities and companyId filtering

---

## Next Steps

After verifying all tests pass:

1. **Production Checklist**:
   - Create Firebase indexes
   - Set up proper security rules
   - Configure company setup flow
   - Add user role management

2. **Future Enhancements**:
   - Implement file upload for drawings/quotations
   - Add email notifications
   - Add WhatsApp integration
   - Add advanced reporting
   - Add export functionality

3. **Documentation**:
   - Create user manual
   - Create admin guide
   - Document API endpoints
   - Create video tutorials
