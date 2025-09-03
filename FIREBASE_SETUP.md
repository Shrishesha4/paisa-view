# Firebase Setup Guide

To enable user authentication and data syncing in Paisa View, you need to set up a Firebase project.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or select an existing project
3. Follow the setup wizard

## Step 2: Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" authentication
5. **Enable "Google" authentication**:
   - Click on "Google" in the sign-in providers list
   - Toggle "Enable" to on
   - Add your support email
   - Click "Save"
6. Click "Save" for the main authentication settings

## Step 3: Enable Firestore Database

1. In your Firebase project, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" for development (you can secure it later)
4. Select a location for your database
5. Click "Done"

## Step 4: Get Firebase Configuration

1. In your Firebase project, click the gear icon (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web app icon (</>)
5. Register your app with a nickname
6. Copy the configuration object

## Step 5: Configure Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Replace the values with your actual Firebase configuration.

## Step 6: Security Rules (Required for Production)

**IMPORTANT**: Never leave Firestore in test mode for production. You must implement proper security rules.

### Option 1: Basic Security Rules (Recommended for most users)

Copy and paste these rules in Firestore Database > Rules:

**IMPORTANT**: These rules have been simplified to fix household creation permissions. They are now more permissive and should resolve the "Missing or insufficient permissions" error.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isHouseholdMember(householdId) {
      return request.auth.uid in get(/databases/$(database)/documents/households/$(householdId)).data.members;
    }
    
    function isHouseholdAdmin(householdId) {
      return request.auth.uid == get(/databases/$(database)/documents/households/$(householdId)).data.adminId;
    }
    
    function isValidUserData(data) {
      return data.keys().hasAll(['expenses', 'incomes', 'budgets', 'categories', 'lastSync']) &&
             data.expenses is list &&
             data.incomes is list &&
             data.budgets is list &&
             data.categories is list &&
             data.lastSync is timestamp;
    }
    
    function isValidHousehold(data) {
      return data.keys().hasAll(['name', 'adminId', 'members', 'createdAt', 'updatedAt']) &&
             data.name is string &&
             data.adminId is string &&
             data.members is list &&
             data.createdAt is timestamp &&
             data.updatedAt is timestamp &&
             data.members.hasAny([request.auth.uid]);
    }

    // User data rules
    match /users/{userId} {
      // Users can only access their own data
      allow read, write: if isAuthenticated() && isOwner(userId);
      
      // Validate user data structure
      allow create, update: if isAuthenticated() && 
        isOwner(userId) && 
        isValidUserData(resource.data);
    }
    
    // Household rules
    match /households/{householdId} {
      // Only household members can read household data
      allow read: if isAuthenticated() && isHouseholdMember(householdId);
      
      // Only household admins can update household data
      allow update: if isAuthenticated() && isHouseholdAdmin(householdId);
      
      // Only authenticated users can create households (they become admin)
      allow create: if isAuthenticated() && 
        request.auth.uid == resource.data.adminId &&
        isValidHousehold(resource.data);
      
      // Only household admins can delete households
      allow delete: if isAuthenticated() && isHouseholdAdmin(householdId);
    }
    
    // Prevent access to other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Option 2: Advanced Security Rules (For enterprise/production use)

Use the advanced rules from `firestore.rules.advanced` file which includes:
- Email verification requirements
- Data validation and size limits
- Rate limiting
- Enhanced abuse prevention
- Audit logging support

### Deploy Rules

1. Copy the rules above
2. Go to Firestore Database > Rules
3. Replace the existing rules
4. Click "Publish"
5. Wait for deployment to complete

**Note**: If you're experiencing "Missing or insufficient permissions" errors when creating households, make sure to deploy these updated rules.

## Step 7: Restart Your Development Server

After adding the environment variables, restart your Next.js development server:

```bash
npm run dev
```

## Features Now Available

With Firebase configured, you'll have access to:

- **User Authentication**: Sign up, sign in, and sign out with email/password or Google
- **Data Syncing**: Upload local data to cloud and sync across devices
- **Household Collaboration**: Create and join households for family budgeting
- **Cross-Device Sync**: Access your data from any device
- **Data Backup**: Automatic cloud backup of your financial data
- **Multiple Sign-in Options**: Choose between Google OAuth or email/password

## Troubleshooting

- Make sure all environment variables are prefixed with `NEXT_PUBLIC_`
- Verify your Firebase project has Authentication and Firestore enabled
- Check the browser console for any Firebase-related errors
- Ensure your Firebase project is not in a restricted region

## Security Notes

- The current setup uses test mode for Firestore (allows all reads/writes)
- For production, implement proper security rules
- Google authentication is now enabled by default
- Consider enabling additional authentication methods (Facebook, Twitter, etc.) if needed
- Regularly review your Firebase project's security settings
