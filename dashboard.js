// dashboard.js - receptionist + doctor functionality (FireStore based)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, doc, setDoc, getDoc, query, where, getDocs,
  orderBy, serverTimestamp, updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Use same config as app.js
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
const userInfo = document.getElementById('userInfo');
const logoutBtn = document.getElementById('logoutBtn');

const receptionistPanel = document.getElementById('receptionistPanel');
const doctorPanel = document.getElementById('doctorPanel');

const patientForm = document.getElementById('patientForm');
const tokenList = document.getElementById('tokenList');
const patientDetails = document.getElementById('patientDetails');
const historyList = document.getElementById('historyList');

const searchToken = document.getElementById('searchToken');
const presToken = document.getElementById('presToken');
const prescriptionEl = document.getElementById('prescription');
const savePrescriptionBtn = document.getElementById('savePrescription');

const billToken = document.getElementById('billToken');
const billAmount = document.getElementById('billAmount');
const generateBill = document.getElementById('generateBill');
const billResult = document.getElementById('billResult');

// Helpers
function uidShort(){ return 'T' + Math.floor(1000 + Math.random()*9000) } // simple token

// Logging helper — writes to 'logs' collection
async function logAction(userId, action, details = {}) {
  try {
    await addDoc(collection(db, 'logs'), {
      userId, action, details, ts: serverTimestamp()
    });
  } catch(e){ console.error('Log failed', e) }
}

// Observe auth state & show panels by role
onAuthStateChanged(auth, async (user) => {
  if(!user){ window.location = 'index.html'; return; }
  // get role
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const role = userDoc.exists() ? userDoc.data().role : 'receptionist';
  userInfo.textContent = `${user.email} (${role})`;
  await logAction(user.uid, 'login', { role });

  // show/hide panels
  if(role === 'doctor'){
    receptionistPanel.style.display = 'none';
    doctorPanel.style.display = 'block';
  } else {
    receptionistPanel.style.display = 'block';
    doctorPanel.style.display = 'none';
  }

  // start subscribing to today's patients (receptionist view)
  const q = query(collection(db, 'patients'), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snap) => {
    tokenList.innerHTML = '';
    snap.forEach(docSnap => {
      const p = docSnap.data();
      const li = document.createElement('li');
      li.textContent = `${p.token} — ${p.name} (${p.age || '—'})`;
      li.addEventListener('click', ()=> showPatient(docSnap.id, p));
      tokenList.appendChild(li);
    });
  });

  // doctor: also show history (last 20 prescriptions)
  const hq = query(collection(db, 'prescriptions'), orderBy('ts', 'desc'));
  onSnapshot(hq, (snap) => {
    historyList.innerHTML = '';
    let count = 0;
    snap.forEach(s => {
      if(count++ >= 20) return;
      const d = s.data();
      const li = document.createElement('li');
      li.innerHTML = `<strong>${d.token}</strong> — ${d.prescription} <div class="muted">${new Date(d.ts?.toDate?.()||Date.now()).toLocaleString()}</div>`;
      historyList.appendChild(li);
    });
  });
});

// Receptionist: add patient & generate token
patientForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('p_name').value.trim();
  const age = document.getElementById('p_age').value;
  const phone = document.getElementById('p_phone').value.trim();
  const symptoms = document.getElementById('p_symptoms').value.trim();
  if(!name){ alert('Enter name'); return; }

  const token = uidShort();
  try{
    const docRef = await addDoc(collection(db, 'patients'), {
      token, name, age: age||null, phone: phone||null, symptoms, createdAt: serverTimestamp(), status: 'waiting'
    });
    patientForm.reset();
    await logAction(auth.currentUser.uid, 'create_patient', { token, patientId: docRef.id });
    alert(`Patient added with token ${token}`);
  }catch(err){ console.error(err); alert('Could not add patient: ' + err.message) }
});

// helper: show patient info in doctor panel
async function showPatient(docId, pdata){
  patientDetails.innerHTML = `<strong>${pdata.name}</strong><div>Age: ${pdata.age||'—'}</div><div>Phone: ${pdata.phone||'—'}</div><p>${pdata.symptoms||''}</p>`;
  presToken.value = pdata.token;
  // load prescriptions for this token
  const q = query(collection(db, 'prescriptions'), where('token','==',pdata.token), orderBy('ts','desc'));
  const snap = await getDocs(q);
  // show last prescriptions
  historyList.innerHTML = '';
  snap.forEach(s => {
    const d = s.data();
    const li = document.createElement('li');
    li.innerHTML = `<strong>${d.token}</strong> — ${d.prescription} <div class="muted">${new Date(d.ts?.toDate?.()||Date.now()).toLocaleString()}</div>`;
    historyList.appendChild(li);
  });
}

// Doctor: save prescription
savePrescriptionBtn?.addEventListener('click', async () => {
  const token = presToken.value.trim();
  const pres = prescriptionEl.value.trim();
  const nextVisit = document.getElementById('nextVisit').value || null;
  if(!token || !pres){ alert('Provide token and prescription'); return; }
  try{
    await addDoc(collection(db, 'prescriptions'), {
      token, prescription: pres, nextVisit: nextVisit||null, doctorId: auth.currentUser.uid, ts: serverTimestamp()
    });
    // update patient status and history link
    const pQuery = query(collection(db, 'patients'), where('token','==',token));
    const pSnap = await getDocs(pQuery);
    if(!pSnap.empty){
      const pdoc = pSnap.docs[0];
      await updateDoc(doc(db, 'patients', pdoc.id), { status: 'seen', lastSeen: serverTimestamp() });
      await logAction(auth.currentUser.uid, 'prescribe', { token, patientId: pdoc.id });
    }
    alert('Prescription saved.');
    prescriptionEl.value = '';
    presToken.value = '';
  }catch(err){ console.error(err); alert('Save failed: '+err.message) }
});

// Billing
generateBill?.addEventListener('click', async () => {
  const token = billToken.value.trim();
  const amount = Number(billAmount.value);
  if(!token || !amount){ billResult.textContent = 'Enter token and amount'; return; }
  try{
    const billDoc = await addDoc(collection(db, 'bills'), {
      token, amount, createdBy: auth.currentUser.uid, createdAt: serverTimestamp()
    });
    await logAction(auth.currentUser.uid, 'generate_bill', { token, amount, billId: billDoc.id });
    billResult.textContent = `Bill generated (ID: ${billDoc.id}) — Amount: ₹${amount}`;
  }catch(err){ console.error(err); billResult.textContent = 'Error: ' + err.message }
});

// search token quick lookup (doctor)
searchToken?.addEventListener('keyup', async (e) => {
  const qv = searchToken.value.trim();
  if(!qv) return;
  // search by token or name
  const byToken = query(collection(db,'patients'), where('token','==',qv));
  const byName = query(collection(db,'patients'), where('name','==',qv));
  let snap = await getDocs(byToken);
  if(snap.empty) snap = await getDocs(byName);
  if(!snap.empty){
    const p = snap.docs[0].data();
    showPatient(snap.docs[0].id, p);
  }
});

// logout
logoutBtn.addEventListener('click', async ()=> {
  await signOut(auth);
  window.location = 'index.html';
});
