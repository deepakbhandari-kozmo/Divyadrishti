// Firebase Configuration for Frontend
// This file contains the Firebase configuration for client-side authentication

// Firebase configuration object
// Using your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcJkak9bSnlVctoQkbLbpG_gl8yedXNxU",
  authDomain: "mymappingapp-e901c.firebaseapp.com",
  projectId: "mymappingapp-e901c",
  storageBucket: "mymappingapp-e901c.firebasestorage.app",
  messagingSenderId: "710147283930",
  appId: "1:710147283930:web:f4d0c98ef0b759aeb7fee3",
  measurementId: "G-H07TCJXJ7D"
};

// Initialize Firebase (will be done in individual pages)
let app = null;
let auth = null;
let db = null;

// Initialize Firebase services
function initializeFirebase() {
    try {
        // Check if Firebase is already initialized
        if (!app) {
            app = firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            db = firebase.firestore();
            
            console.log('Firebase initialized successfully');
            
            // Set up auth state listener
            setupAuthStateListener();
        }
        
        return { app, auth, db };
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        return null;
    }
}

// Set up authentication state listener
function setupAuthStateListener() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log('User is signed in:', user.email);
            // User is signed in
            handleUserSignedIn(user);
        } else {
            console.log('User is signed out');
            // User is signed out
            handleUserSignedOut();
        }
    });
}

// Handle user signed in
function handleUserSignedIn(user) {
    // Store user info in session storage for quick access
    const userInfo = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified
    };
    
    sessionStorage.setItem('firebaseUser', JSON.stringify(userInfo));
    
    // Update UI elements if they exist
    updateUIForSignedInUser(user);
}

// Handle user signed out
function handleUserSignedOut() {
    // Clear session storage
    sessionStorage.removeItem('firebaseUser');
    sessionStorage.removeItem('userToken');

    // Update UI elements if they exist
    updateUIForSignedOutUser();

    // Don't redirect automatically - let Flask handle session-based auth
    console.log('Firebase user signed out, but keeping session-based auth');
}

// Update UI for signed in user
function updateUIForSignedInUser(user) {
    // Update welcome message if it exists
    const welcomeText = document.querySelector('.welcome-text');
    if (welcomeText) {
        welcomeText.textContent = `Welcome, ${user.displayName || user.email}`;
    }
    
    // Show/hide elements based on auth state
    const authElements = document.querySelectorAll('[data-auth-required]');
    authElements.forEach(element => {
        element.style.display = 'block';
    });
    
    const noAuthElements = document.querySelectorAll('[data-no-auth-required]');
    noAuthElements.forEach(element => {
        element.style.display = 'none';
    });
}

// Update UI for signed out user
function updateUIForSignedOutUser() {
    // Show/hide elements based on auth state
    const authElements = document.querySelectorAll('[data-auth-required]');
    authElements.forEach(element => {
        element.style.display = 'none';
    });
    
    const noAuthElements = document.querySelectorAll('[data-no-auth-required]');
    noAuthElements.forEach(element => {
        element.style.display = 'block';
    });
}

// Sign in with email and password
async function signInWithEmailAndPassword(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Get ID token for backend authentication
        const idToken = await user.getIdToken();
        sessionStorage.setItem('userToken', idToken);
        
        return { success: true, user: user };
    } catch (error) {
        console.error('Error signing in:', error);
        return { success: false, error: error.message };
    }
}

// Create user with email and password
async function createUserWithEmailAndPassword(email, password, displayName) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update user profile with display name
        if (displayName) {
            await user.updateProfile({
                displayName: displayName
            });
        }
        
        // Send email verification
        await user.sendEmailVerification();
        
        return { success: true, user: user };
    } catch (error) {
        console.error('Error creating user:', error);
        return { success: false, error: error.message };
    }
}

// Sign out user
async function signOutUser() {
    try {
        await auth.signOut();
        return { success: true };
    } catch (error) {
        console.error('Error signing out:', error);
        return { success: false, error: error.message };
    }
}

// Get current user
function getCurrentUser() {
    return auth.currentUser;
}

// Get user token
async function getUserToken() {
    const user = getCurrentUser();
    if (user) {
        try {
            return await user.getIdToken();
        } catch (error) {
            console.error('Error getting user token:', error);
            return null;
        }
    }
    return null;
}

// Check if user is signed in
function isUserSignedIn() {
    return !!getCurrentUser();
}

// Send password reset email
async function sendPasswordResetEmail(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        return { success: true };
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return { success: false, error: error.message };
    }
}

// Utility function to make authenticated requests to backend
async function makeAuthenticatedRequest(url, options = {}) {
    const token = await getUserToken();
    
    if (!token) {
        throw new Error('User not authenticated');
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    
    return fetch(url, {
        ...options,
        headers
    });
}

// Export functions for use in other scripts
window.FirebaseAuth = {
    initializeFirebase,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOutUser,
    getCurrentUser,
    getUserToken,
    isUserSignedIn,
    sendPasswordResetEmail,
    makeAuthenticatedRequest
};

// Auto-initialize Firebase when script loads
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure Firebase SDK is loaded
    setTimeout(() => {
        if (typeof firebase !== 'undefined') {
            initializeFirebase();
        } else {
            console.error('Firebase SDK not loaded. Please include Firebase scripts.');
        }
    }, 100);
});
