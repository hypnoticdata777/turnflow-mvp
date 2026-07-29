import { getRequestsPage, updateRequest, deleteRequest } from '../firestore-requests.js';
import { getPropertiesForOwner } from '../firestore-properties.js';
import { getUsersByRole } from '../firestore-users.js';
import { currentUser } from '../auth.js';
import {
  escHtml, formatUserLabel, REQUEST_STATUSES, requestStatusBadgeClasses,
  costForRequest, costLabelForRequest
} from '../utils.js';

document.addEventListener("DOMContentLoaded", async () => {
  const requestList = document.getElementById("requestList");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const ownerUid = currentUser()?.uid;

  let vendors = [];
  let collaborators = [];
  let properties = [];
  let cursor = null;
  let totalLoaded = 0;

  const propertyLabel = (propertyId) => {
    const p = properties.find(p => p.id === propertyId);
    if (!p) return propertyId ? 'Unknown property' : 'No property selected';
    return p.nickname ? `${p.nickname} — ${p.address}` : p.address;
  };

  // Shared by the vendor-assignment and collaborator-sharing dropdowns:
  // builds <option> tags for a list of users against whichever id field
  // (assignedVendorUid / collaboratorUid) is currently set on the request.
  const optionsFor = (reqData, users, idField) => {
    const currentId = reqData[idField];
    const unassignedSelected = !currentId ? "selected" : "";
    const options = users.map(u =>
      `<option value="${escHtml(u.uid)}" ${u.uid === currentId ? "selected" : ""}>${escHtml(formatUserLabel(u))}</option>`
    ).join("");
    return `<option value="" ${unassignedSelected}>— Unassigned —</option>${options}`;
  };

  const statusOptionsFor = (reqData) => REQUEST_STATUSES.map(s =>
    `<option value="${escHtml(s)}" ${s === (reqData.status || 'Draft') ? "selected" : ""}>${escHtml(s)}</option>`
  ).join("");

  const requestCardHTML = (reqData) => {
    const cost = costForRequest(reqData);
    const costLabel = costLabelForRequest(reqData);
    return `
      <div class="border p-4 rounded bg-white shadow">
        <div class="flex justify-between items-start">
          <h2 class="text-xl font-semibold">${escHtml(reqData.title || '(untitled request)')}</h2>
          <span class="text-xs font-medium px-2 py-1 rounded-full ${requestStatusBadgeClasses(reqData.status)}">${escHtml(reqData.status || 'Draft')}</span>
        </div>
        <p><strong>Property:</strong> ${escHtml(propertyLabel(reqData.propertyId))}</p>
        <p><strong>Category:</strong> ${escHtml(reqData.category || '—')} &nbsp; <strong>Urgency:</strong> ${escHtml(reqData.urgency || '—')}</p>
        <p><strong>Cost (${escHtml(costLabel)}):</strong> $${cost.toFixed(2)}</p>
        <label class="block mt-2 text-sm">
          <strong>Status:</strong>
          <select class="assignSelect border rounded p-1 ml-1" data-field="status" data-request-id="${escHtml(reqData.id)}">
            ${statusOptionsFor(reqData)}
          </select>
          <span class="assignStatus text-xs text-gray-500 ml-1"></span>
        </label>
        <label class="block mt-2 text-sm">
          <strong>Assigned Vendor:</strong>
          <select class="assignSelect border rounded p-1 ml-1" data-field="assignedVendorUid" data-request-id="${escHtml(reqData.id)}">
            ${optionsFor(reqData, vendors, "assignedVendorUid")}
          </select>
          <span class="assignStatus text-xs text-gray-500 ml-1"></span>
        </label>
        <label class="block mt-1 text-sm">
          <strong>Shared With (Collaborator):</strong>
          <select class="assignSelect border rounded p-1 ml-1" data-field="collaboratorUid" data-request-id="${escHtml(reqData.id)}">
            ${optionsFor(reqData, collaborators, "collaboratorUid")}
          </select>
          <span class="assignStatus text-xs text-gray-500 ml-1"></span>
        </label>
        <div class="mt-3 flex gap-2">
          <button data-action="view" data-request-id="${escHtml(reqData.id)}" class="bg-blue-600 text-white px-3 py-1 rounded">View</button>
          <button data-action="edit" data-request-id="${escHtml(reqData.id)}" class="bg-yellow-500 text-white px-3 py-1 rounded">Edit</button>
          <button data-action="delete" data-request-id="${escHtml(reqData.id)}" class="bg-red-600 text-white px-3 py-1 rounded">Delete</button>
        </div>
      </div>`;
  };

  // Fetches and appends the next page of requests, cursor-based (legacy NFR5).
  async function loadNextPage() {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "Loading…";

    try {
      const { requests, lastDoc, hasMore } = await getRequestsPage({ ownerUid, cursor });
      cursor = lastDoc;

      if (totalLoaded === 0) {
        requestList.innerHTML = ""; // clear the initial "Loading…" placeholder
      }

      if (totalLoaded === 0 && requests.length === 0) {
        requestList.innerHTML = `<p class="text-gray-500">No maintenance requests yet. <a class="text-blue-600 underline" href="new-request.html">Create your first one</a>.</p>`;
      } else {
        requestList.insertAdjacentHTML("beforeend", requests.map(requestCardHTML).join(""));
      }

      totalLoaded += requests.length;
      loadMoreBtn.classList.toggle("hidden", !hasMore);
      loadMoreBtn.textContent = "Load More";
      loadMoreBtn.disabled = false;
    } catch (error) {
      console.error("Error loading requests:", error);
      if (totalLoaded === 0) {
        requestList.innerHTML = `<p class="text-red-500">Failed to load requests. Check your connection and try refreshing.</p>`;
      }
      loadMoreBtn.classList.add("hidden");
    }
  }

  // Single event listener for all request action buttons, delegated on
  // the container so cards appended later via "Load More" work with no
  // extra wiring.
  requestList.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const rid = btn.dataset.requestId;
    if (!rid) return;
    const action = btn.dataset.action;

    if (action === "view") {
      sessionStorage.setItem("viewing_request_id", rid);
      window.location.href = "request.html";
    } else if (action === "edit") {
      sessionStorage.setItem("editing_request_id", rid);
      window.location.href = "new-request.html";
    } else if (action === "delete") {
      if (!confirm("Delete this request? This also permanently deletes all photos attached to it. This cannot be undone.")) return;
      try {
        await deleteRequest(rid);
        window.location.reload();
      } catch (error) {
        console.error("Error deleting request:", error);
        alert("Failed to delete request. Please try again.");
      }
    }
  });

  // Status / vendor-assignment / collaborator-sharing dropdowns (all use
  // .assignSelect, distinguished by data-field so one handler covers all three)
  requestList.addEventListener("change", async (e) => {
    const select = e.target.closest("select.assignSelect");
    if (!select) return;

    const rid = select.dataset.requestId;
    const field = select.dataset.field;
    const statusEl = select.parentElement.querySelector(".assignStatus");
    const newValue = select.value;

    select.disabled = true;
    statusEl.textContent = "Saving…";
    try {
      await updateRequest(rid, { [field]: newValue || null });
      statusEl.textContent = "Saved ✓";
      setTimeout(() => { statusEl.textContent = ""; }, 2000);
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      statusEl.textContent = "Failed to save. Try again.";
    } finally {
      select.disabled = false;
    }
  });

  loadMoreBtn.addEventListener("click", loadNextPage);

  try {
    [vendors, collaborators, properties] = await Promise.all([
      getUsersByRole('vendor'),
      getUsersByRole('collaborator'),
      getPropertiesForOwner(ownerUid)
    ]);
  } catch (error) {
    console.error("Error loading vendor/collaborator/property lists:", error);
  }

  await loadNextPage();
});
