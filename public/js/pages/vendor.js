import { currentUser } from '../auth.js';
import { getRequestsForVendor, updateRequest } from '../firestore-requests.js';
import { getProperty } from '../firestore-properties.js';
import { escHtml, REQUEST_STATUSES, requestStatusBadgeClasses } from '../utils.js';
import { uploadRequestPhoto, getRequestPhotos, renderGallery } from '../request-photos.js';

const u = currentUser();
const listContainer = document.getElementById('vendor-requests');
const requestSelect = document.getElementById('requestId');
const uploadSection = document.getElementById('uploadSection');
const uploadStatus = document.getElementById('status');
const gallery = document.getElementById('gallery');

async function loadRequestsForVendor() {
  if (!u) {
    listContainer.innerHTML = '<p class="text-red-500">User not found. Cannot load requests.</p>';
    return;
  }
  listContainer.innerHTML = '<p class="text-gray-500">Loading…</p>';

  try {
    const requests = await getRequestsForVendor(u.uid);

    if (requests.length === 0) {
      listContainer.innerHTML = '<p class="text-gray-500">No requests assigned to you.</p>';
      return;
    }

    listContainer.textContent = '';
    requestSelect.innerHTML = '<option value="">— select a request —</option>';

    for (const req of requests) {
      let propertyLine = '';
      try {
        const property = await getProperty(req.propertyId);
        propertyLine = property.nickname ? `${property.nickname} — ${property.address}` : property.address;
      } catch {
        propertyLine = '(property not found)';
      }

      const opt = document.createElement('option');
      opt.value = req.id;
      opt.textContent = req.title || req.id;
      requestSelect.appendChild(opt);

      const card = document.createElement('div');
      card.className = 'bg-white border rounded-xl p-4 shadow-sm';
      card.innerHTML = `
        <div class="flex justify-between items-start">
          <h3 class="text-lg font-semibold mb-1">${escHtml(req.title || 'Request')}</h3>
          <span class="text-xs font-medium px-2 py-1 rounded-full ${requestStatusBadgeClasses(req.status)}">${escHtml(req.status || 'Draft')}</span>
        </div>
        <p class="text-sm"><strong>Property:</strong> ${escHtml(propertyLine)}</p>
        <p class="text-sm"><strong>Category:</strong> ${escHtml(req.category || '—')} &nbsp; <strong>Urgency:</strong> ${escHtml(req.urgency || '—')}</p>
        <p class="text-sm"><strong>Location:</strong> ${escHtml(req.location || '—')}</p>
        <p class="text-sm"><strong>Access Instructions:</strong> ${escHtml(req.accessInstructions || '—')}</p>
        <p class="text-sm mb-2"><strong>Preferred Contact:</strong> ${escHtml(req.contactMethod || '—')}</p>
        <label class="block text-sm mt-2">
          <strong>Status:</strong>
          <select class="statusSelect border rounded p-1 ml-1" data-request-id="${escHtml(req.id)}">
            ${REQUEST_STATUSES.map(s => `<option value="${escHtml(s)}" ${s === (req.status || 'Draft') ? 'selected' : ''}>${escHtml(s)}</option>`).join('')}
          </select>
          <span class="statusSaveState text-xs text-gray-500 ml-1"></span>
        </label>
      `;
      listContainer.appendChild(card);
    }
  } catch (error) {
    console.error('Error loading requests for vendor:', error);
    listContainer.innerHTML = '<p class="text-red-500">Failed to load requests. Check your connection and try refreshing.</p>';
  }
}

listContainer.addEventListener('change', async (e) => {
  const select = e.target.closest('select.statusSelect');
  if (!select) return;
  const rid = select.dataset.requestId;
  const stateEl = select.parentElement.querySelector('.statusSaveState');
  select.disabled = true;
  stateEl.textContent = 'Saving…';
  try {
    await updateRequest(rid, { status: select.value });
    stateEl.textContent = 'Saved ✓';
    setTimeout(() => { stateEl.textContent = ''; }, 2000);
  } catch (error) {
    console.error('Error updating status:', error);
    stateEl.textContent = 'Failed. Try again.';
  } finally {
    select.disabled = false;
  }
});

async function refreshGallery(requestId) {
  gallery.textContent = 'Loading…';
  try {
    const photos = await getRequestPhotos(requestId);
    renderGallery(gallery, photos);
  } catch (error) {
    console.error('Error loading photos:', error);
    gallery.innerHTML = '<p class="text-red-500">Failed to load photos.</p>';
  }
}

requestSelect.addEventListener('change', () => {
  const requestId = requestSelect.value;
  uploadSection.classList.toggle('hidden', !requestId);
  if (requestId) refreshGallery(requestId);
});

document.querySelectorAll('.uploadBtn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const requestId = requestSelect.value;
    if (!requestId) { uploadStatus.textContent = 'Select a request first.'; return; }

    const type = btn.dataset.type;
    const input = document.getElementById(type + 'Input');
    const file = input.files?.[0];
    if (!file) { uploadStatus.textContent = 'No file selected.'; return; }

    try {
      await uploadRequestPhoto(requestId, type, file, (pct) => {
        uploadStatus.textContent = `Uploading ${type}… ${pct}%`;
      });
      uploadStatus.textContent = `Uploaded ${type} ✓`;
      input.value = '';
      await refreshGallery(requestId);
    } catch (error) {
      console.error('Error uploading photo:', error);
      uploadStatus.textContent = error.message || 'Upload failed.';
    }
  });
});

loadRequestsForVendor();
