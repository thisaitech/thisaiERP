// Quick script to create the admin account directly
import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
 apiKey: "AIzaSyBb7BwB_tZaRsc-UVeYBFhX46GotSaFJmY",
  authDomain: "bill-anna.firebaseapp.com",
  projectId: "bill-anna",
  storageBucket: "bill-anna.firebasestorage.app",
  messagingSenderId: "8309163902",
  appId: "1:8309163902:web:1a32c461acf8c9e134952f"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

async function createAdminAccount() {
  try {
    console.log('Creating admin account...')
    
    const email = 'admin@thisaitech.com'
    const password = 'ThisAI@2024!'
    
    // Create the user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    
    console.log('User created:', user.uid)
    
    // Create user document in Firestore
    const userData = {
      uid: user.uid,
      email: email,
      displayName: 'Thisai Technology',
      companyName: 'Thisai Technology',
      role: 'admin',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    }
    
    await setDoc(doc(db, 'users', user.uid), userData)
    
    console.log('✅ Admin account created successfully!')
    console.log('Email:', email)
    console.log('Password:', password)
    console.log('\nYou can now login at: https://thisai-crm-silver.web.app')
    
  } catch (error) {
    console.error('Error creating account:', error.message)
  }
}

createAdminAccount()
