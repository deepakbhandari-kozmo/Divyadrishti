# Firebase Integration Setup Guide

This guide will help you set up Firebase Authentication and Firestore for your Drone Application & Research Center.

## Prerequisites

1. Google/Firebase account
2. Python environment with required packages
3. Basic understanding of Firebase console

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name: `drone-research-center` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In Firebase console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** authentication
3. Optionally enable **Email link (passwordless sign-in)**
4. Save the changes

## Step 3: Create Firestore Database

1. Go to **Firestore Database** in Firebase console
2. Click "Create database"
3. Choose **Start in test mode** (for development)
4. Select a location closest to your users
5. Click "Done"

## Step 4: Get Firebase Configuration

### Web App Configuration
1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" > Web app icon
4. Enter app nickname: `drone-web-app`
5. Check "Also set up Firebase Hosting" (optional)
6. Click "Register app"
7. Copy the Firebase configuration object

### Service Account Key
1. Go to **Project Settings** > **Service accounts**
2. Click "Generate new private key"
3. Download the JSON file
4. Rename it to `firebase-service-account.json`
5. Place it in your project root directory

## Step 5: Configure Environment Variables

1. Copy `.env.example` to `.env`
2. Fill in your Firebase configuration:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abcdef123456789012
FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Service Account (choose one option)
# Option 1: File path
FIREBASE_SERVICE_ACCOUNT_PATH=firebase-service-account.json

# Option 2: JSON string (for production/cloud deployment)
# FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}

# Flask Configuration
SECRET_KEY=your-secret-key-here-change-in-production
```

## Step 6: Update Frontend Configuration

1. Open `static/js/firebase-config.js`
2. Replace the `firebaseConfig` object with your actual configuration:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
    projectId: "your-firebase-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456789012",
    measurementId: "G-XXXXXXXXXX"
};
```

## Step 7: Install Dependencies

```bash
pip install -r requirements.txt
```

## Step 8: Set Up Firestore Security Rules

1. Go to **Firestore Database** > **Rules**
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - only authenticated users can read their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
                     exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Pending users - only admins can read/write
    match /pending_users/{userId} {
      allow read, write: if request.auth != null && 
                            exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // User activities - users can read their own, admins can read all
    match /user_activities/{activityId} {
      allow read: if request.auth != null && 
                     (resource.data.user_id == request.auth.uid ||
                      (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'));
      allow write: if request.auth != null;
    }
    
    // Projects - authenticated users can read, admins can write
    match /projects/{projectId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'analyst'];
    }
    
    // Alerts - only admins can read/write
    match /alerts/{alertId} {
      allow read, write: if request.auth != null && 
                            exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // System logs - only admins can read/write
    match /system_logs/{logId} {
      allow read, write: if request.auth != null && 
                            exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## Step 9: Test the Setup

1. Start your Flask application:
```bash
python app.py
```

2. Go to `http://localhost:5000/register`
3. Register a new user
4. Check Firebase console to see the pending user in Firestore
5. Login as admin and approve the user
6. Test login with the approved user

## Step 10: Production Considerations

### Security
- Change default admin password
- Use environment variables for all sensitive data
- Enable Firebase App Check for additional security
- Set up proper Firestore security rules
- Use HTTPS in production

### Performance
- Set up Firestore indexes for better query performance
- Enable Firebase Performance Monitoring
- Consider using Firebase Functions for server-side logic

### Monitoring
- Enable Firebase Analytics
- Set up error reporting with Firebase Crashlytics
- Monitor authentication events

## Troubleshooting

### Common Issues

1. **"Firebase not initialized"**
   - Check if Firebase SDK is loaded in HTML
   - Verify firebase-config.js is included
   - Check browser console for errors

2. **"Permission denied" errors**
   - Verify Firestore security rules
   - Check user authentication status
   - Ensure user has proper role assignments

3. **"Service account not found"**
   - Verify service account JSON file path
   - Check environment variables
   - Ensure service account has proper permissions

4. **Authentication not working**
   - Verify Firebase Auth configuration
   - Check API keys and project settings
   - Ensure email/password auth is enabled

### Debug Mode

To enable debug mode, set in your `.env`:
```env
DEBUG=True
APP_ENV=development
```

## Support

For additional help:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)

## Next Steps

After successful setup:
1. Customize user roles and permissions
2. Add more user fields as needed
3. Implement email verification
4. Set up password reset functionality
5. Add user profile management
6. Implement audit logging
7. Set up backup strategies
