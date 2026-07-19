import { auth, db } from '../firebase-config.js';
import { currentUser } from '../auth.js';
import { addDoc, collection, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const out = document.getElementById('out');
const who = document.getElementById('who');
const u = currentUser();

if (!u) {
  who.innerHTML = '<b>Not signed in.</b> Open <a href="index.html">index.html</a>, sign in as the TECH account, then come back.';
} else {
  who.textContent = `Signed in as: ${u.email} (uid: ${u.uid})`;
}

document.getElementById('seedBtn').addEventListener('click', async () => {
  if (!auth.currentUser) { out.textContent = 'Please sign in first.'; return; }

  const payload = {
    name:       document.getElementById('name').value.trim(),
    address:    document.getElementById('address').value.trim(),
    unit:       document.getElementById('unit').value.trim(),
    ownerName:  document.getElementById('owner').value.trim(),
    targetDate: document.getElementById('date').value.trim(),
    assignedTechId: auth.currentUser.uid,  // assign to current TECH user
    createdBy: auth.currentUser.uid,
    createdAt: serverTimestamp(),
    tasks: [{ id:'t1', title:'Replace toilet', status:'Pending' }]
  };

  try {
    const docRef = await addDoc(collection(db, 'projects'), payload);
    out.textContent = `Seeded OK. New doc id: ${docRef.id}\n\n${JSON.stringify(payload,null,2)}`;
  } catch (e) {
    out.textContent = 'Error: ' + (e.message || e);
  }
});
