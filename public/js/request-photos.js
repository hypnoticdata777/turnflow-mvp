// Shared photo upload + gallery logic for a request's photos subcollection.
// Used by both request.js (owner detail view) and vendor.js (vendor's
// assigned-request view) — the storage/rules model scopes who's allowed
// to write here (owner or the assigned vendor), not this module.
import { app, auth, db } from './firebase-config.js';
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";
import {
  collection, addDoc, serverTimestamp, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const storage = getStorage(app);

/**
 * Uploads a photo file for a request, records it in
 * requests/{requestId}/photos, and reports progress via onProgress.
 * @param {string} requestId
 * @param {'before'|'after'|'receipt'|'other'} type
 * @param {File} file
 * @param {(pct: number) => void} [onProgress]
 * @returns {Promise<void>}
 */
export function uploadRequestPhoto(requestId, type, file, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const uid = auth.currentUser?.uid;
    if (!uid) { reject(new Error("Not signed in")); return; }

    const safeName = file.name.replace(/\s+/g, "_");
    const path = `turnflow/${requestId}/${type}/${uid}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);

    task.on("state_changed", (snap) => {
      onProgress(Math.floor((snap.bytesTransferred / snap.totalBytes) * 100));
    }, reject, async () => {
      try {
        const url = await getDownloadURL(task.snapshot.ref);
        await addDoc(collection(db, `requests/${requestId}/photos`), {
          type, url, storagePath: path, uploadedByUid: uid, createdAt: serverTimestamp()
        });
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Fetches every photo doc for a request.
 * @param {string} requestId
 * @returns {Promise<Array<{id: string, type: string, url: string}>>}
 */
export async function getRequestPhotos(requestId) {
  const snap = await getDocs(collection(db, `requests/${requestId}/photos`));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Renders a photo gallery into the given container element using safe
 * DOM methods (no innerHTML on system-controlled but still external URLs).
 * @param {HTMLElement} container
 * @param {Array<{type: string, url: string}>} photos
 */
export function renderGallery(container, photos) {
  container.textContent = "";

  if (photos.length === 0) {
    const p = document.createElement("p");
    p.textContent = "No photos yet.";
    container.appendChild(p);
    return;
  }

  photos.forEach((photo) => {
    const figure = document.createElement("figure");
    figure.style.cssText = "border:1px solid #eee;border-radius:10px;padding:6px";

    const img = document.createElement("img");
    img.src = photo.url;
    img.alt = photo.type + " photo";
    img.style.cssText = "width:100%;height:140px;object-fit:cover;border-radius:8px";

    const caption = document.createElement("figcaption");
    caption.style.cssText = "text-transform:capitalize;text-align:center;margin-top:6px";
    caption.textContent = photo.type;

    figure.appendChild(img);
    figure.appendChild(caption);
    container.appendChild(figure);
  });
}
