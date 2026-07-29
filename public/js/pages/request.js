import { getRequest, updateRequest } from '../firestore-requests.js';
import { getProperty } from '../firestore-properties.js';
import { escHtml, costForRequest, costLabelForRequest } from '../utils.js';
import { uploadRequestPhoto, getRequestPhotos, renderGallery } from '../request-photos.js';

const { jsPDF } = window.jspdf;

const requestInfoDiv = document.getElementById("requestInfo");
const costForm = document.getElementById("costForm");
const estimatedCostInput = document.getElementById("estimatedCost");
const quotedCostInput = document.getElementById("quotedCost");
const finalCostInput = document.getElementById("finalCost");
const costStatus = document.getElementById("costStatus");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const gallery = document.getElementById("gallery");
const uploadStatus = document.getElementById("uploadStatus");

const requestId = sessionStorage.getItem("viewing_request_id");
let requestData = null;

async function loadRequest() {
  if (!requestId) {
    requestInfoDiv.innerHTML = `<p class="text-red-500">No request selected. Please go back to the dashboard and select a request.</p>`;
    return;
  }

  try {
    requestData = await getRequest(requestId);
    let propertyLine = '';
    try {
      const property = await getProperty(requestData.propertyId);
      propertyLine = property.nickname ? `${property.nickname} — ${property.address}` : property.address;
    } catch {
      propertyLine = '(property not found)';
    }

    requestInfoDiv.innerHTML = `
      <p><strong>Title:</strong> ${escHtml(requestData.title)}</p>
      <p><strong>Property:</strong> ${escHtml(propertyLine)}</p>
      <p><strong>Category:</strong> ${escHtml(requestData.category || '—')} &nbsp; <strong>Urgency:</strong> ${escHtml(requestData.urgency || '—')}</p>
      <p><strong>Status:</strong> ${escHtml(requestData.status || 'Draft')}</p>
      <p><strong>Location:</strong> ${escHtml(requestData.location || '—')}</p>
      <p><strong>Preferred Contact:</strong> ${escHtml(requestData.contactMethod || '—')}</p>
      <p><strong>Access Instructions:</strong> ${escHtml(requestData.accessInstructions || '—')}</p>
      <p><strong>Notes:</strong> ${escHtml(requestData.notes || '—')}</p>
    `;

    estimatedCostInput.value = requestData.estimatedCost ?? '';
    quotedCostInput.value = requestData.quotedCost ?? '';
    finalCostInput.value = requestData.finalCost ?? '';

    await refreshGallery();
  } catch (error) {
    console.error("Error loading request:", error);
    requestInfoDiv.innerHTML = `<p class="text-red-500">Failed to load request data. It may not exist or you may not have access.</p>`;
  }
}

async function refreshGallery() {
  gallery.textContent = "Loading…";
  try {
    const photos = await getRequestPhotos(requestId);
    renderGallery(gallery, photos);
  } catch (error) {
    console.error("Error loading photos:", error);
    gallery.innerHTML = '<p class="text-red-500">Failed to load photos.</p>';
  }
}

costForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  costStatus.textContent = "Saving…";
  try {
    const updates = {
      estimatedCost: estimatedCostInput.value === '' ? null : parseFloat(estimatedCostInput.value),
      quotedCost: quotedCostInput.value === '' ? null : parseFloat(quotedCostInput.value),
      finalCost: finalCostInput.value === '' ? null : parseFloat(finalCostInput.value)
    };
    await updateRequest(requestId, updates);
    Object.assign(requestData, updates);
    costStatus.textContent = `Saved ✓ (current cost: $${costForRequest(requestData).toFixed(2)}, ${costLabelForRequest(requestData)})`;
  } catch (error) {
    console.error("Error saving cost fields:", error);
    costStatus.textContent = "Failed to save. Try again.";
  }
});

document.querySelectorAll(".uploadBtn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const type = btn.dataset.type;
    const input = document.getElementById(type + "Input");
    const file = input.files?.[0];
    if (!file) { uploadStatus.textContent = "No file selected."; return; }

    try {
      await uploadRequestPhoto(requestId, type, file, (pct) => {
        uploadStatus.textContent = `Uploading ${type}… ${pct}%`;
      });
      uploadStatus.textContent = `Uploaded ${type} ✓`;
      input.value = "";
      await refreshGallery();
    } catch (error) {
      console.error("Error uploading photo:", error);
      uploadStatus.textContent = error.message || "Upload failed.";
    }
  });
});

function downloadPDF() {
  if (!requestData) return;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("TurnFlow Home — Maintenance Request", 10, 10);
  doc.setFontSize(12);

  doc.text(`Title: ${requestData.title || ''}`, 10, 25);
  doc.text(`Category: ${requestData.category || ''}    Urgency: ${requestData.urgency || ''}`, 10, 35);
  doc.text(`Status: ${requestData.status || 'Draft'}`, 10, 45);
  doc.text(`Location: ${requestData.location || ''}`, 10, 55);
  doc.text(`Notes: ${requestData.notes || ''}`, 10, 65);
  doc.text(`Cost (${costLabelForRequest(requestData)}): $${costForRequest(requestData).toFixed(2)}`, 10, 80);

  doc.save("turnflow-request.pdf");
}

downloadPdfBtn?.addEventListener("click", downloadPDF);

loadRequest();
