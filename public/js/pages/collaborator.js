import { currentUser } from '../auth.js';
import { getRequestsForCollaborator } from '../firestore-requests.js';
import { getProperty } from '../firestore-properties.js';
import { escHtml, requestStatusBadgeClasses, costForRequest, costLabelForRequest } from '../utils.js';

const requestList = document.getElementById('requestList');

async function loadRequests() {
  const u = currentUser();
  if (!u) return; // requireRole('collaborator') above already redirects unauthenticated users

  requestList.innerHTML = '<p class="text-gray-500">Loading…</p>';

  try {
    const requests = await getRequestsForCollaborator(u.uid);

    if (requests.length === 0) {
      requestList.innerHTML = '<p class="text-gray-500">No requests have been shared with you yet.</p>';
      return;
    }

    const cards = await Promise.all(requests.map(async (r) => {
      let propertyLine = '';
      try {
        const property = await getProperty(r.propertyId);
        propertyLine = property.nickname ? `${property.nickname} — ${property.address}` : property.address;
      } catch {
        propertyLine = '(property not found)';
      }

      return `
        <div class="border p-4 rounded bg-white shadow">
          <div class="flex justify-between items-start">
            <h2 class="text-xl font-semibold">${escHtml(r.title || 'Request')}</h2>
            <span class="text-xs font-medium px-2 py-1 rounded-full ${requestStatusBadgeClasses(r.status)}">${escHtml(r.status || 'Draft')}</span>
          </div>
          <p class="text-sm mt-1"><strong>Property:</strong> ${escHtml(propertyLine)}</p>
          <p class="text-sm"><strong>Category:</strong> ${escHtml(r.category || '—')} &nbsp; <strong>Urgency:</strong> ${escHtml(r.urgency || '—')}</p>
          <p class="text-sm"><strong>Cost (${escHtml(costLabelForRequest(r))}):</strong> $${costForRequest(r).toFixed(2)}</p>
          <p class="text-sm"><strong>Notes:</strong> ${escHtml(r.notes || '—')}</p>
        </div>`;
    }));

    requestList.innerHTML = cards.join("");
  } catch (error) {
    console.error('Error loading collaborator requests:', error);
    requestList.innerHTML = '<p class="text-red-500">Failed to load your shared requests. Check your connection and try refreshing.</p>';
  }
}

loadRequests();
