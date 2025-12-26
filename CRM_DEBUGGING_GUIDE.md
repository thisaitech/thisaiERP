# CRM Debugging Guide - Lead ID Missing Issue

## Problem
Error: "Lead ID is missing. Cannot schedule visit."

## Debugging Steps

### Step 1: Open Browser Console
1. Press `F12` or right-click → "Inspect"
2. Go to "Console" tab
3. Clear console (click 🚫 icon or press Ctrl+L)

### Step 2: Try to Schedule a Visit
1. Go to CRM → Leads tab
2. Click the calendar icon (📅) on any lead
3. Watch the console output

### Step 3: Check Console Logs

Look for these specific log messages:

#### A. When you click the calendar icon:
```
🎯 Quick action: schedule_visit for lead: {Object}
📅 Setting lead to schedule: {id: "...", name: "...", ...}
```

**Check**: Does the lead object have an `id` field?
- ✅ If YES: `id: "abc123xyz"` → Lead ID exists, continue to next log
- ❌ If NO: `id: undefined` or `id: ""` → **PROBLEM FOUND!**

#### B. When the modal opens:
```
🔍 ScheduleVisitModal - lead prop changed: {
  lead: {...},
  hasLead: true,
  leadId: "abc123",
  leadName: "Customer Name",
  isOpen: true
}
```

**Check**: What is the value of `leadId`?
- ✅ If it shows a value: `leadId: "abc123xyz"` → Good!
- ❌ If `leadId: undefined` or `leadId: null` → **PROBLEM!**

#### C. When you click "Schedule Visit" button:
```
🚀 handleSchedule called with lead: {Object}
```

**Check**: Expand the lead object
- ✅ Look for `id` field
- ❌ If missing, you'll see:
```
❌ Lead ID is missing! {Object}
❌ Lead keys: ["name", "phone", "email", ...]
❌ Lead stringified: {...}
```

### Step 4: Analyze the Results

#### Scenario 1: ID exists in Quick Action but missing in Modal
**Symptoms**:
- ✅ `🎯 Quick action` shows `id: "abc123"`
- ❌ `🔍 ScheduleVisitModal` shows `leadId: undefined`

**Cause**: State not updating correctly
**Solution**: Check `setLeadToSchedule(lead)` call

#### Scenario 2: ID missing from the start
**Symptoms**:
- ❌ `🎯 Quick action` shows `id: undefined`
- ❌ All subsequent logs show no ID

**Cause**: Leads not loaded with IDs from Firebase
**Solution**: Check `getLeads()` function

#### Scenario 3: ID is empty string
**Symptoms**:
- `id: ""` (empty string instead of undefined)

**Cause**: Firebase document has empty ID
**Solution**: Recreate the lead

### Step 5: Get More Information

Run this in the browser console to check leads:

```javascript
// Check what leads are in state
const leads = document.querySelector('[data-leads]');
console.log('Leads in state:', leads);

// Or check localStorage
const user = JSON.parse(localStorage.getItem('user'));
console.log('Current user:', user);
console.log('Company ID:', user?.companyId);
```

### Step 6: Share Information

Please share these console logs with me:

1. **Full console output** from when you click the calendar icon
2. **Screenshot** of the error
3. **Lead data** from the console logs (expand the lead object)

### Quick Fix Options

#### Option 1: Seed New Data
1. Click "🧪 Test Data" button at the top
2. This will create test leads with proper IDs
3. Try scheduling visit on new test lead

#### Option 2: Check Firebase
1. Go to Firebase Console
2. Open Firestore Database
3. Look at `crm_leads` collection
4. Check if documents have valid IDs
5. Check if leads have `companyId` field matching your user

#### Option 3: Refresh Everything
1. Click browser refresh (F5)
2. Clear browser cache (Ctrl+Shift+Delete)
3. Try again

## Expected Console Output (Working Correctly)

When everything works, you should see:

```
🎯 Quick action: schedule_visit for lead: {
  id: "abc123xyz",
  name: "John Doe",
  phone: "+91-9876543210",
  ...
}
📅 Setting lead to schedule: {
  id: "abc123xyz",
  name: "John Doe",
  hasId: true,
  leadObject: {...}
}
🔍 ScheduleVisitModal - lead prop changed: {
  lead: {...},
  hasLead: true,
  leadId: "abc123xyz",
  leadName: "John Doe",
  isOpen: true
}
🚀 handleSchedule called with lead: {id: "abc123xyz", ...}
📅 Scheduling visit: {
  leadId: "abc123xyz",
  engineerId: "eng123" or "unassigned",
  engineerName: "Engineer Name" or "Unassigned",
  visitAt: Date(...)
}
✅ Site visit created, now updating lead stage...
✅ Lead stage updated
✅ Site visit scheduled and lead updated successfully
```

Then you'll see alert: "Site visit scheduled successfully!"

## Common Causes

1. **Leads loaded before Firebase initialized**
   - Solution: Refresh page

2. **CompanyId mismatch**
   - User's companyId doesn't match lead's companyId
   - Solution: Check localStorage user data

3. **Firebase security rules blocking read**
   - Solution: Check Firebase console → Rules

4. **Lead created without ID field**
   - Old data or corrupted data
   - Solution: Recreate lead or seed fresh data

## Need Help?

Share the complete console output (from step 3) and I can help debug further!
