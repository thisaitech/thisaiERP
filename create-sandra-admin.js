// Create Sandra Software Admin Account
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

async function createSandraAccount() {
  try {
    console.log('Creating Sandra Software admin account...')
    
    const email = 'admin@sandrasoftware.com'
    const password = 'Sandra@2024!'
    
    // Create the user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    
    console.log('User created:', user.uid)
    
    // Create user document in Firestore
    const userData = {
      uid: user.uid,
      email: email,
      displayName: 'Sandra Software',
      companyName: 'Sandra Software',
      role: 'admin',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    }
    
    await setDoc(doc(db, 'users', user.uid), userData)
    
    console.log('✅ Sandra Software admin account created successfully!')
    console.log('Email:', email)
    console.log('Password:', password)
    console.log('\nYou can now login at: https://thisai-crm-silver.web.app')
    
    process.exit(0)
  } catch (error) {
    console.error('Error creating account:', error.message)
    process.exit(1)
  }
}

createSandraAccount()
