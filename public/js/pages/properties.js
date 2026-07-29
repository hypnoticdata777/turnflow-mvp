import { getPropertiesForOwner, createProperty, deleteProperty } from '../firestore-properties.js';
import { currentUser } from '../auth.js';
import { escHtml } from '../utils.js';

const ownerUid = currentUser()?.uid;
const propertyListDiv = document.getElementById("propertyList");
const propertyForm = document.getElementById("property-form");
const formError = document.getElementById("formError");
const submitBtn = document.getElementById("submitBtn");

function showError(msg) {
  formError.textContent = msg;
  formError.classList.remove("hidden");
}
function clearError() {
  formError.textContent = "";
  formError.classList.add("hidden");
}

async function renderProperties() {
  propertyListDiv.innerHTML = '<p class="text-gray-500">Loading properties…</p>';

  try {
    const properties = await getPropertiesForOwner(ownerUid);
    propertyListDiv.textContent = "";

    if (properties.length === 0) {
      const p = document.createElement("p");
      p.className = "text-gray-500";
      p.textContent = "No properties yet. Add one above to start creating requests.";
      propertyListDiv.appendChild(p);
      return;
    }

    properties.forEach(prop => {
      const row = document.createElement("div");
      row.className = "p-3 border rounded flex justify-between items-center";

      const info = document.createElement("div");
      const nameLine = document.createElement("p");
      const nameStrong = document.createElement("strong");
      nameStrong.textContent = prop.nickname || prop.address;
      nameLine.appendChild(nameStrong);
      if (prop.nickname) nameLine.appendChild(document.createTextNode(` — ${prop.address}`));
      info.appendChild(nameLine);
      if (prop.unit) {
        const unitLine = document.createElement("p");
        unitLine.textContent = `Unit ${prop.unit}`;
        info.appendChild(unitLine);
      }

      const delBtn = document.createElement("button");
      delBtn.className = "bg-red-500 text-white px-3 py-1 rounded";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", async () => {
        if (!confirm("Delete this property? This also permanently deletes every request (and their photos) tied to it. This cannot be undone.")) return;
        try {
          await deleteProperty(prop.id);
          await renderProperties();
        } catch (err) {
          console.error("Error deleting property:", err);
          alert("Failed to delete property. Please try again.");
        }
      });

      row.appendChild(info);
      row.appendChild(delBtn);
      propertyListDiv.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading properties:", err);
    propertyListDiv.innerHTML = '<p class="text-red-500">Failed to load properties. Check your connection and try refreshing.</p>';
  }
}

propertyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const address = document.getElementById("propertyAddress").value.trim();
  const unit = document.getElementById("propertyUnit").value.trim();
  const nickname = document.getElementById("propertyNickname").value.trim();

  if (!address) { showError("Address is required."); return; }

  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";

  try {
    await createProperty({ ownerUid, address, unit, nickname });
    propertyForm.reset();
    await renderProperties();
  } catch (err) {
    console.error("Error saving property:", err);
    showError("Failed to save property. Check your connection and try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Add Property";
  }
});

renderProperties();
