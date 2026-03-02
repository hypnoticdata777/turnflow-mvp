// public/js/technician.js

// ✅ UPDATED: Import core services from the correct config file.
import { app, auth, db } from './firebase-config.js'; 
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";
import {
  collection, addDoc, serverTimestamp, query, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";


const storage = getStorage(app);
// ❌ REMOVED: `const db = getFirestore(app);` because `db` is now imported directly.

// Quick helpers
const $ = (id) => document.getElementById(id);
const prog = $("prog");
const statusEl = $("status");
const gallery = $("gallery");

function needIds() {
  const projectId = $("projectId").value.trim();
  const taskId = $("taskId").value.trim();
  if (!projectId || !taskId) throw new Error("Project ID and Task ID are required");
  return { projectId, taskId };
}

async function upload(type) {
  const { projectId, taskId } = needIds();
  const input = $(type + "Input");
  const file = input.files?.[0];
  if (!file) throw new Error("No file selected");

  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");

  const safeName = file.name.replace(/\s+/g, "_");
  const path = `turnflow/${projectId}/${taskId}/${type}/${uid}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file);

  task.on("state_changed", (snap) => {
    const pct = Math.floor((snap.bytesTransferred / snap.totalBytes) * 100);
    prog.value = pct;
    statusEl.textContent = `Uploading ${type}… ${pct}%`;
  }, (err) => {
    statusEl.textContent = err.message;
  }, async () => {
    const url = await getDownloadURL(task.snapshot.ref);
    await addDoc(collection(db, `projects/${projectId}/tasks/${taskId}/photos`), {
      type, url, storagePath: path, techId: uid, createdAt: serverTimestamp(),
    });
    statusEl.textContent = `Uploaded ${type} ✓`;
    input.value = "";
    prog.value = 0;
    await loadGallery(projectId, taskId);
  });
}

async function loadGallery(projectId, taskId) {
  gallery.textContent = "Loading…";
  const q = query(collection(db, `projects/${projectId}/tasks/${taskId}/photos`));
  const snaps = await getDocs(q);

  gallery.textContent = "";

  if (snaps.empty) {
    const p = document.createElement("p");
    p.textContent = "No photos yet.";
    gallery.appendChild(p);
    return;
  }

  snaps.forEach((docSnap) => {
    const d = docSnap.data();

    const figure = document.createElement("figure");
    figure.style.cssText = "border:1px solid #eee;border-radius:10px;padding:6px";

    const img = document.createElement("img");
    img.src = d.url; // Firebase Storage URL, system-generated
    img.alt = d.type + " photo";
    img.style.cssText = "width:100%;height:140px;object-fit:cover;border-radius:8px";

    const caption = document.createElement("figcaption");
    caption.style.cssText = "text-transform:capitalize;text-align:center;margin-top:6px";
    caption.textContent = d.type; // textContent, not innerHTML

    figure.appendChild(img);
    figure.appendChild(caption);
    gallery.appendChild(figure);
  });
}

// Wire buttons
document.querySelectorAll(".uploadBtn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try { await upload(btn.dataset.type); }
    catch (ex) { statusEl.textContent = ex.message; }
  });
});

// Refresh gallery when IDs change
["projectId", "taskId"].forEach((id) => {
  $(id).addEventListener("change", () => {
    const projectId = $("projectId").value.trim();
    const taskId = $("taskId").value.trim();
    if (projectId && taskId) loadGallery(projectId, taskId);
  });
});