import { currentUser } from '../auth.js';
import { getAllRequestsForOwner, createRequest } from '../firestore-requests.js';
import { getPropertiesForOwner, createProperty } from '../firestore-properties.js';

const backupBtn = document.getElementById("backupBtn");
const restoreBtn = document.getElementById("restoreBtn");
const fileInput = document.getElementById("fileInput");
const statusMsg = document.getElementById("statusMsg");

function setStatus(msg, isError = false) {
  statusMsg.textContent = msg;
  statusMsg.className = isError ? "mt-4 text-red-500" : "mt-4 text-green-600";
}

// Download all of the current owner's properties + requests as one JSON file.
backupBtn.addEventListener("click", async () => {
  const ownerUid = currentUser()?.uid;
  backupBtn.disabled = true;
  backupBtn.textContent = "Preparing…";
  setStatus("", false);

  try {
    const [properties, requests] = await Promise.all([
      getPropertiesForOwner(ownerUid),
      getAllRequestsForOwner(ownerUid)
    ]);

    // Strip Firestore-managed fields; keep property `id` on each request's
    // propertyId reference and on the property record itself so restore
    // can remap old -> new property IDs (they'll change on re-import).
    const exportData = {
      exportedAt: new Date().toISOString(),
      properties: properties.map(({ ownerUid, createdAt, updatedAt, ...rest }) => rest),
      requests: requests.map(({ ownerUid, createdAt, updatedAt, ...rest }) => rest)
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `turnflow_home_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(`✅ Exported ${properties.length} propert${properties.length === 1 ? 'y' : 'ies'} and ${requests.length} request(s).`);
  } catch (err) {
    console.error("Backup failed:", err);
    setStatus("❌ Backup failed. Check your connection and try again.", true);
  } finally {
    backupBtn.disabled = false;
    backupBtn.textContent = "📥 Download Backup (JSON)";
  }
});

// Restore: import properties + requests from a JSON file, re-owned by
// whoever is currently signed in, with propertyId remapped to the newly
// created property IDs.
restoreBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (!file) {
    setStatus("❌ Please select a JSON backup file first.", true);
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    let data;
    try {
      data = JSON.parse(e.target.result);
    } catch {
      setStatus("❌ Invalid JSON file.", true);
      return;
    }

    if (!data || !Array.isArray(data.properties) || !Array.isArray(data.requests)) {
      setStatus("❌ Backup file must contain \"properties\" and \"requests\" arrays.", true);
      return;
    }

    const ownerUid = currentUser()?.uid;
    restoreBtn.disabled = true;
    restoreBtn.textContent = "Restoring…";
    setStatus("", false);

    const propertyIdMap = {}; // old id -> new id
    let importedProperties = 0;
    let importedRequests = 0;
    const errors = [];

    for (const property of data.properties) {
      const { id: oldId, ...propertyData } = property;
      try {
        const newId = await createProperty({ ...propertyData, ownerUid });
        if (oldId) propertyIdMap[oldId] = newId;
        importedProperties++;
      } catch (err) {
        console.error("Failed to import property:", property, err);
        errors.push(`property "${property.address || '(no address)'}"`);
      }
    }

    for (const req of data.requests) {
      const { id: oldId, propertyId: oldPropertyId, ...requestData } = req;
      const newPropertyId = propertyIdMap[oldPropertyId] || null;
      try {
        await createRequest({ ...requestData, ownerUid, propertyId: newPropertyId });
        importedRequests++;
      } catch (err) {
        console.error("Failed to import request:", req, err);
        errors.push(`request "${req.title || '(untitled)'}"`);
      }
    }

    restoreBtn.disabled = false;
    restoreBtn.textContent = "📤 Restore Backup";
    fileInput.value = "";

    if (errors.length === 0) {
      setStatus(`✅ Restored ${importedProperties} propert${importedProperties === 1 ? 'y' : 'ies'} and ${importedRequests} request(s).`);
    } else {
      setStatus(`⚠️ Restored ${importedProperties} propert(ies) and ${importedRequests} request(s). Failed: ${errors.join(", ")}`, true);
    }
  };

  reader.readAsText(file);
});
