import { getProjectsByStatus, updateProject } from '../firestore-projects.js';
import { escHtml } from '../utils.js';

async function render() {
  const projectList = document.getElementById("projectList");
  projectList.innerHTML = `<p class="text-gray-500">Loading…</p>`;

  try {
    const filtered = await getProjectsByStatus("Approved");

    if (filtered.length === 0) {
      projectList.innerHTML = `<p class="text-gray-500">No projects pending to send.</p>`;
      return;
    }

    projectList.innerHTML = filtered.map(p => `
      <div class="border p-4 rounded bg-white shadow">
        <h2 class="text-xl font-semibold">${escHtml(p.projectName)}</h2>
        <p><strong>Owner:</strong> ${escHtml(p.owner)}</p>
        <p><strong>Address:</strong> ${escHtml(p.address)}, Unit ${escHtml(p.unit)}</p>
        <p><strong>Target Date:</strong> ${escHtml(p.date)}</p>
        <div class="mt-2 flex gap-2 items-center">
          <button data-project-id="${escHtml(p.id)}" class="viewBtn bg-blue-500 text-white px-3 py-1 rounded">View</button>
          <button data-project-id="${escHtml(p.id)}" class="sendBtn bg-green-600 text-white px-3 py-1 rounded">Mark as Sent</button>
          <span class="sendStatus text-xs text-gray-500"></span>
        </div>
      </div>
    `).join("");
  } catch (error) {
    console.error("Error loading projects:", error);
    projectList.innerHTML = `<p class="text-red-500">Failed to load projects. Check your connection and try refreshing.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const projectList = document.getElementById("projectList");

  projectList.addEventListener("click", async (e) => {
    const viewBtn = e.target.closest("button.viewBtn");
    if (viewBtn?.dataset.projectId) { window.viewProject(viewBtn.dataset.projectId); return; }

    const sendBtn = e.target.closest("button.sendBtn");
    if (!sendBtn?.dataset.projectId) return;

    const pid = sendBtn.dataset.projectId;
    const statusEl = sendBtn.parentElement.querySelector(".sendStatus");
    sendBtn.disabled = true;
    statusEl.textContent = "Sending…";
    try {
      await updateProject(pid, { status: "Sent" });
      await render(); // project no longer matches "Approved" — refresh the list
    } catch (error) {
      console.error("Error marking project as sent:", error);
      statusEl.textContent = "Failed. Try again.";
      sendBtn.disabled = false;
    }
  });

  render();
});
