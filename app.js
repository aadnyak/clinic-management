// app.js - initialize Firebase, handle register/login, set custom role in Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// TODO: replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAqzJC7JAJbNK7aHezHFUdQCXjhEBeoJF4",
  authDomain: "clinic-management-app-4ae4f.firebaseapp.com",
  projectId: "clinic-management-app-4ae4f",
  storageBucket: "clinic-management-app-4ae4f.firebasestorage.app",
  messagingSenderId: "325004879945",
  appId: "1:325004879945:web:d957a5f93688b633837798"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI refs
const signupBtn = document.getElementById('signupBtn');
const loginBtn = document.getElementById('loginBtn');
const emailEl = document.getElementById('email');
const passwordEl = document.getElementById('password');
const roleSelect = document.getElementById('roleSelect');
const authMsg = document.getElementById('authMsg');

signupBtn.addEventListener('click', async () => {
  authMsg.textContent = '';
  const email = emailEl.value.trim(), pw = passwordEl.value.trim(), role = roleSelect.value;
  if(!email || pw.length < 6){ authMsg.textContent = 'Enter valid email and password (min 6).'; return; }
  try{
    const userCred = await createUserWithEmailAndPassword(auth, email, pw);
    // store role in Firestore (users collection)
    await setDoc(doc(db, 'users', userCred.user.uid), { email, role, createdAt: new Date() });
    authMsg.textContent = 'Registered — redirecting...';
    setTimeout(()=> window.location = 'dashboard.html', 900);
  }catch(err){
    authMsg.textContent = 'Error: ' + err.message;
  }
});

loginBtn.addEventListener('click', async () => {
  authMsg.textContent = '';
  const email = emailEl.value.trim(), pw = passwordEl.value.trim();
  if(!email || pw.length < 6){ authMsg.textContent = 'Enter valid email and password (min 6).'; return; }
  try{
    await signInWithEmailAndPassword(auth, email, pw);
    authMsg.textContent = 'Login success — redirecting...';
    setTimeout(()=> window.location = 'dashboard.html', 700);
  }catch(err){
    authMsg.textContent = 'Login failed: ' + err.message;
  }
});

// optional: redirect if already logged in
onAuthStateChanged(auth, user => {
  if(user) {
    // ensure user doc exists (safety)
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if(!snap.exists()){
        setDoc(doc(db, 'users', user.uid), { email: user.email, role: 'receptionist', createdAt: new Date() });
      }
    });
  }
});
