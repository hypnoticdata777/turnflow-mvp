import { createRequest, getRequest, updateRequest } from '../firestore-requests.js';
import { getPropertiesForOwner } from '../firestore-properties.js';
import { currentUser } from '../auth.js';
import { escHtml, REQUEST_CATEGORIES, REQUEST_URGENCIES, CONTACT_METHODS } from '../utils.js';

const ownerUid = currentUser()?.uid;
let editingRequestId = null;

const propertySelect = document.getElementById("propertyId");
const categorySelect = document.getElementById("category");
const urgencySelect = document.getElementById("urgency");
const emergencyNotice = document.getElementById("emergencyNotice");
const contactMethodSelect = document.getElementById("contactMethod");
const titleInput = document.getElementById("title");
const locationInput = document.getElementById("location");
const accessInstructionsInput = document.getElementById("accessInstructions");
const notesInput = document.getElementById("notes");
const saveBtn = document.getElementById("saveRequestBtn");
const formError = document.getElementById("formError");

function populateSelect(select, values, placeholder) {
  select.innerHTML = `<option value="">${escHtml(placeholder)}</option>` +
    values.map(v => `<option value="${escHtml(v)}">${escHtml(v)}</option>`).join("");
}

populateSelect(categorySelect, REQUEST_CATEGORIES, "— select a category —");
populateSelect(urgencySelect, REQUEST_URGENCIES, "— select urgency —");
populateSelect(contactMethodSelect, CONTACT_METHODS, "— preferred contact method —");

urgencySelect.addEventListener("change", () => {
  emergencyNotice.classList.toggle("hidden", urgencySelect.value !== "Emergency");
});

function showError(msg) {
  formError.textContent = msg;
  formError.classList.remove("hidden");
}
function clearError() {
  formError.textContent = "";
  formError.classList.add("hidden");
}

async function loadProperties(selectedId) {
  try {
    const properties = await getPropertiesForOwner(ownerUid);
    if (properties.length === 0) {
      propertySelect.innerHTML = `<option value="">— no properties yet —</option>`;
      showError('You need to add a property before creating a request. Go to "Properties" in the sidebar to add one.');
      return;
    }
    propertySelect.innerHTML = properties.map(p =>
      `<option value="${escHtml(p.id)}" ${p.id === selectedId ? "selected" : ""}>${escHtml(p.nickname ? `${p.nickname} — ${p.address}` : p.address)}</option>`
    ).join("");
  } catch (error) {
    console.error("Error loading properties:", error);
    showError("Failed to load your properties. Check your connection and try refreshing.");
  }
}

async function saveRequest() {
  clearError();

  const propertyId = propertySelect.value;
  const title = titleInput.value.trim();
  const category = categorySelect.value;
  const urgency = urgencySelect.value;

  const errors = [];
  if (!propertyId) errors.push("Property is required.");
  if (!title) errors.push("A short title is required.");
  if (!category) errors.push("Category is required.");
  if (!urgency) errors.push("Urgency is required.");

  if (errors.length > 0) {
    showError(errors.join(" "));
    return;
  }

  const requestData = {
    ownerUid,
    propertyId,
    title,
    category,
    urgency,
    location: locationInput.value.trim(),
    contactMethod: contactMethodSelect.value,
    accessInstructions: accessInstructionsInput.value.trim(),
    notes: notesInput.value.trim()
  };

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  try {
    if (editingRequestId) {
      await updateRequest(editingRequestId, requestData);
      sessionStorage.removeItem("editing_request_id");
    } else {
      requestData.status = "Draft";
      await createRequest(requestData);
    }
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Error saving request:", error);
    showError("Failed to save request. Check your connection and try again.");
    saveBtn.disabled = false;
    saveBtn.textContent = "💾 Save Request";
  }
}

saveBtn.addEventListener("click", saveRequest);

document.addEventListener("DOMContentLoaded", async () => {
  const editingId = sessionStorage.getItem("editing_request_id");

  if (editingId) {
    editingRequestId = editingId;
    document.getElementById("pageTitle").textContent = "✏️ Edit Request";
    try {
      const reqData = await getRequest(editingId);
      await loadProperties(reqData.propertyId);
      titleInput.value = reqData.title || "";
      categorySelect.value = reqData.category || "";
      urgencySelect.value = reqData.urgency || "";
      emergencyNotice.classList.toggle("hidden", reqData.urgency !== "Emergency");
      contactMethodSelect.value = reqData.contactMethod || "";
      locationInput.value = reqData.location || "";
      accessInstructionsInput.value = reqData.accessInstructions || "";
      notesInput.value = reqData.notes || "";
    } catch (error) {
      console.error("Error loading request for editing:", error);
      sessionStorage.removeItem("editing_request_id");
      showError("Failed to load the request to edit.");
    }
  } else {
    await loadProperties();
  }
});
