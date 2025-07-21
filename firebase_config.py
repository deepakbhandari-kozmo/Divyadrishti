# Firebase Configuration and Initialization
import os
import json
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore, auth
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class FirebaseConfig:
    def __init__(self):
        self.app = None
        self.db = None
        self.initialized = False
        
    def initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        if self.initialized:
            return self.db
            
        try:
            # Try to get service account from environment variable (JSON string)
            service_account_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON')

            if service_account_json:
                print("Using service account from environment variable")
                # Parse JSON from environment variable
                service_account_info = json.loads(service_account_json)
                cred = credentials.Certificate(service_account_info)
            else:
                # Fallback to service account file
                service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', 'firebase-service-account.json')
                print(f"Looking for service account file at: {service_account_path}")
                if os.path.exists(service_account_path):
                    print("Using service account from file")
                    cred = credentials.Certificate(service_account_path)
                else:
                    # Use default credentials for development
                    print("Warning: No service account found. Using default Firebase credentials.")
                    print("This may not work without proper authentication setup.")
                    cred = credentials.ApplicationDefault()
            
            # Get project ID
            project_id = os.getenv('FIREBASE_PROJECT_ID', 'your-project-id')
            print(f"Initializing Firebase with project ID: {project_id}")

            # Initialize Firebase app
            self.app = firebase_admin.initialize_app(cred, {
                'projectId': project_id,
            })

            # Initialize Firestore
            self.db = firestore.client()
            self.initialized = True

            print(f"Firebase initialized successfully for project: {project_id}")
            return self.db
            
        except Exception as e:
            print(f"Error initializing Firebase: {e}")
            # For development, create a mock database
            self.db = MockFirestore()
            self.initialized = True
            return self.db
    
    def get_db(self):
        """Get Firestore database instance"""
        if not self.initialized:
            return self.initialize_firebase()
        return self.db

class MockFirestore:
    """Mock Firestore for development when Firebase is not configured"""
    def __init__(self):
        self.collections = {}
        print("Using Mock Firestore for development. Please configure Firebase for production.")
    
    def collection(self, collection_name):
        if collection_name not in self.collections:
            self.collections[collection_name] = MockCollection(collection_name)
        return self.collections[collection_name]

class MockCollection:
    def __init__(self, name):
        self.name = name
        self.documents = {}
    
    def document(self, doc_id=None):
        if doc_id is None:
            doc_id = f"mock_doc_{len(self.documents)}"
        if doc_id not in self.documents:
            self.documents[doc_id] = MockDocument(doc_id, self)
        return self.documents[doc_id]
    
    def add(self, data):
        doc_id = f"auto_id_{len(self.documents)}"
        doc = self.document(doc_id)
        doc.data = data
        doc.data['created_at'] = datetime.now()
        return doc, doc_id
    
    def stream(self):
        return [doc for doc in self.documents.values() if hasattr(doc, 'data')]
    
    def where(self, field, operator, value):
        return MockQuery(self, field, operator, value)

class MockDocument:
    def __init__(self, doc_id, collection):
        self.id = doc_id
        self.collection = collection
        self.data = None
    
    def get(self):
        return MockDocumentSnapshot(self.id, self.data, exists=self.data is not None)
    
    def set(self, data, merge=False):
        if merge and self.data:
            self.data.update(data)
        else:
            self.data = data
        self.data['updated_at'] = datetime.now()
        return True
    
    def update(self, data):
        if self.data:
            self.data.update(data)
            self.data['updated_at'] = datetime.now()
        return True
    
    def delete(self):
        if self.id in self.collection.documents:
            del self.collection.documents[self.id]
        return True

class MockDocumentSnapshot:
    def __init__(self, doc_id, data, exists=True):
        self.id = doc_id
        self._data = data
        self.exists = exists
    
    def to_dict(self):
        return self._data if self._data else {}

class MockQuery:
    def __init__(self, collection, field, operator, value):
        self.collection = collection
        self.field = field
        self.operator = operator
        self.value = value
    
    def stream(self):
        results = []
        for doc in self.collection.documents.values():
            if hasattr(doc, 'data') and doc.data:
                if self.field in doc.data:
                    doc_value = doc.data[self.field]
                    if self.operator == '==' and doc_value == self.value:
                        results.append(MockDocumentSnapshot(doc.id, doc.data))
                    elif self.operator == '!=' and doc_value != self.value:
                        results.append(MockDocumentSnapshot(doc.id, doc.data))
        return results

# Global Firebase instance
firebase_config = FirebaseConfig()

def get_firestore_db():
    """Get Firestore database instance"""
    return firebase_config.get_db()

def verify_firebase_token(id_token):
    """Verify Firebase ID token"""
    try:
        if firebase_config.initialized and firebase_config.app:
            decoded_token = auth.verify_id_token(id_token)
            return decoded_token
        else:
            # Mock verification for development
            return {'uid': 'mock_user', 'email': 'mock@example.com'}
    except Exception as e:
        print(f"Error verifying token: {e}")
        return None

def create_custom_token(uid):
    """Create custom Firebase token"""
    try:
        if firebase_config.initialized and firebase_config.app:
            return auth.create_custom_token(uid)
        else:
            # Mock token for development
            return f"mock_token_{uid}"
    except Exception as e:
        print(f"Error creating custom token: {e}")
        return None

# Firestore Collections
class Collections:
    USERS = 'users'
    PENDING_USERS = 'pending_users'
    USER_ACTIVITIES = 'user_activities'
    PROJECTS = 'projects'
    ALERTS = 'alerts'
    SYSTEM_LOGS = 'system_logs'

# Helper functions for common operations
def add_user_activity(user_id, activity_type, details=None):
    """Add user activity to Firestore"""
    try:
        db = get_firestore_db()
        activity_data = {
            'user_id': user_id,
            'activity_type': activity_type,
            'details': details or {},
            'timestamp': datetime.now(),
            'ip_address': None,  # Can be added from request
            'user_agent': None   # Can be added from request
        }
        
        db.collection(Collections.USER_ACTIVITIES).add(activity_data)
        return True
    except Exception as e:
        print(f"Error adding user activity: {e}")
        return False

def get_user_by_email(email):
    """Get user by email from Firestore"""
    try:
        db = get_firestore_db()
        print(f"Searching for user with email: {email}")
        users = db.collection(Collections.USERS).where('email', '==', email).stream()

        for user in users:
            user_data = user.to_dict()
            user_data['id'] = user.id
            print(f"Found user: {user_data['username']}")
            return user_data

        print(f"No user found with email: {email}")
        return None
    except Exception as e:
        print(f"Error getting user by email: {e}")
        return None

def get_user_by_username(username):
    """Get user by username from Firestore"""
    try:
        db = get_firestore_db()
        print(f"Searching for user with username: {username}")
        users = db.collection(Collections.USERS).where('username', '==', username).stream()

        for user in users:
            user_data = user.to_dict()
            user_data['id'] = user.id
            print(f"Found user: {user_data['username']}")
            return user_data

        print(f"No user found with username: {username}")
        return None
    except Exception as e:
        print(f"Error getting user by username: {e}")
        return None

def test_firebase_connection():
    """Test Firebase connection by trying to write and read a test document"""
    try:
        db = get_firestore_db()
        print("Testing Firebase connection...")

        # Try to write a test document
        test_data = {
            'test': True,
            'timestamp': datetime.now(),
            'message': 'Firebase connection test'
        }

        doc_ref = db.collection('test_collection').add(test_data)
        print(f"Test document created with ID: {doc_ref[1].id}")

        # Try to read it back
        doc = db.collection('test_collection').document(doc_ref[1].id).get()
        if doc.exists:
            print("Test document read successfully!")
            print(f"Test data: {doc.to_dict()}")

            # Clean up - delete the test document
            db.collection('test_collection').document(doc_ref[1].id).delete()
            print("Test document cleaned up")
            return True
        else:
            print("Failed to read test document")
            return False

    except Exception as e:
        print(f"Firebase connection test failed: {e}")
        return False
