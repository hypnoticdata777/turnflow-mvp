import { getAllProjects, createProject } from '../firestore-projects.js';

const backupBtn = document.getElementById("backupBtn");
const restoreBtn = document.getElementById("restoreBtn");
const fileInput = document.getElementById("fileInput");
const statusMsg = document.getElementById("statusMsg");

function setStatus(msg, isError = false) {
  statusMsg.textContent = msg;
  statusMsg.className = isError ? "mt-4 text-red-500" : "mt-4 text-green-600";
}

// Download all Firestore projects as a JSON file
backupBtn.addEventListener("click", async () => {
  backupBtn.disabled = true;
  backupBtn.textContent = "Preparing…";
  setStatus("", false);

  try {
    const projects = await getAllProjects();
    // Strip Firestore-managed fields before export so the file is clean for re-import
    const exportData = projects.map(({ id, createdAt, updatedAt, ...rest }) => rest);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `turnflow_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(`✅ Exported ${projects.length} project(s).`);
  } catch (err) {
    console.error("Backup failed:", err);
    setStatus("❌ Backup failed. Check your connection and try again.", true);
  } finally {
    backupBtn.disabled = false;
    backupBtn.textContent = "📥 Download Backup (JSON)";
  }
});

// Restore: import projects from a JSON file into Firestore
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

    if (!Array.isArray(data)) {
      setStatus("❌ Backup file must contain an array of projects.", true);
      return;
    }

    restoreBtn.disabled = true;
    restoreBtn.textContent = "Restoring…";
    setStatus("", false);

    let imported = 0;
    const errors = [];

    for (const project of data) {
      try {
        await createProject(project);
        imported++;
      } catch (err) {
        console.error("Failed to import project:", project, err);
        errors.push(project.projectName || "(unnamed)");
      }
    }

    restoreBtn.disabled = false;
    restoreBtn.textContent = "📤 Restore Backup";
    fileInput.value = "";

    if (errors.length === 0) {
      setStatus(`✅ Restored ${imported} project(s) successfully.`);
    } else {
      setStatus(`⚠️ Imported ${imported} project(s). Failed: ${errors.join(", ")}`, true);
    }
  };

  reader.readAsText(file);
});
