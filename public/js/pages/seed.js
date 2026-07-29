import { auth, db } from '../firebase-config.js';
import { currentUser } from '../auth.js';
import { addDoc, collection, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const out = document.getElementById('out');
const who = document.getElementById('who');
const u = currentUser();

if (!u) {
  who.innerHTML = '<b>Not signed in.</b> Open <a href="index.html">index.html</a>, sign in as the OWNER account, then come back.';
} else {
  who.textContent = `Signed in as: ${u.email} (uid: ${u.uid})`;
}

document.getElementById('seedBtn').addEventListener('click', async () => {
  if (!auth.currentUser) { out.textContent = 'Please sign in first.'; return; }

  const ownerUid = auth.currentUser.uid;
  const address = document.getElementById('address').value.trim();
  const unit = document.getElementById('unit').value.trim();
  const nickname = document.getElementById('nickname').value.trim();
  const title = document.getElementById('title').value.trim();

  try {
    const propertyRef = await addDoc(collection(db, 'properties'), {
      ownerUid, address, unit, nickname, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });

    const requestPayload = {
      ownerUid,
      propertyId: propertyRef.id,
      title,
      category: 'Plumbing',
      urgency: 'Medium',
      location: 'Kitchen',
      contactMethod: 'Email',
      accessInstructions: '',
      notes: 'Seeded sample request.',
      status: 'Draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const requestRef = await addDoc(collection(db, 'requests'), requestPayload);

    out.textContent = `Seeded OK.\nProperty id: ${propertyRef.id}\nRequest id: ${requestRef.id}\n\n${JSON.stringify(requestPayload, null, 2)}`;
  } catch (e) {
    out.textContent = 'Error: ' + (e.message || e);
  }
});
