import { getAllProjects, updateProject } from '../firestore-projects.js';
import { getUsersByRole } from '../firestore-users.js';
import { escHtml, formatUserLabel, PROJECT_STATUSES, projectStatusBadgeClasses } from '../utils.js';

document.addEventListener("DOMContentLoaded", async () => {
  const projectList = document.getElementById("projectList");
  projectList.innerHTML = `<p class="text-gray-500">Loading projects…</p>`;

  try {
    const [allProjects, techs, clients] = await Promise.all([
      getAllProjects(),
      getUsersByRole('tech'),
      getUsersByRole('client')
    ]);

    if (allProjects.length === 0) {
      projectList.innerHTML = `<p class="text-gray-500">No projects saved yet.</p>`;
      return;
    }

    const tasksHTMLFor = (project) => project.tasks
      .map((t, i) => {
        const key = (window.tf_getTaskStatus) ? tf_getTaskStatus(t) : (t.completed ? "completed" : "open");
        const label = (window.tf_statusLabel) ? tf_statusLabel(key) : (t.completed ? "Completed" : "Pending");
        const badge = `<span class="task-status tf-badge" data-status="${escHtml(key)}">${escHtml(label)}</span>`;
        return `
          <li class="flex justify-between items-center border p-2 mb-1 bg-gray-50 rounded" data-task-id="${i}">
            <span>${escHtml(t.name)} - ${badge}</span>
            ${!t.completed ? `<button data-project-id="${escHtml(project.id)}" data-task-index="${i}" class="completeBtn bg-green-500 text-white px-2 py-1 rounded">Complete</button>` : ""}
          </li>`;
      }).join("");

    // Shared by the tech- and client-assignment dropdowns: builds
    // <option> tags for a list of users against whichever id field
    // (assignedTechId / clientId) is currently set on the project.
    const optionsFor = (project, users, idField) => {
      const currentId = project[idField];
      const unassignedSelected = !currentId ? "selected" : "";
      const options = users.map(u =>
        `<option value="${escHtml(u.uid)}" ${u.uid === currentId ? "selected" : ""}>${escHtml(formatUserLabel(u))}</option>`
      ).join("");
      return `<option value="" ${unassignedSelected}>— Unassigned —</option>${options}`;
    };

    const statusOptionsFor = (project) => PROJECT_STATUSES.map(s =>
      `<option value="${escHtml(s)}" ${s === (project.status || 'Pending Approval') ? "selected" : ""}>${escHtml(s)}</option>`
    ).join("");

    projectList.innerHTML = allProjects.map((project) => {
      const total = project.tasks.reduce((sum, task) => sum + task.hours * task.rate + task.material, 0);
      return `
        <div class="border p-4 rounded bg-white shadow">
          <div class="flex justify-between items-start">
            <h2 class="text-xl font-semibold">${escHtml(project.projectName)} (${escHtml(project.owner)})</h2>
            <span class="text-xs font-medium px-2 py-1 rounded-full ${projectStatusBadgeClasses(project.status)}">${escHtml(project.status || 'Pending Approval')}</span>
          </div>
          <p><strong>Address:</strong> ${escHtml(project.address)}, Unit ${escHtml(project.unit)}</p>
          <p><strong>Target Date:</strong> ${escHtml(project.date)}</p>
          <p><strong>Total Estimate:</strong> $${total.toFixed(2)}</p>
          <label class="block mt-2 text-sm">
            <strong>Status:</strong>
            <select class="assignSelect border rounded p-1 ml-1" data-field="status" data-project-id="${escHtml(project.id)}">
              ${statusOptionsFor(project)}
            </select>
            <span class="assignStatus text-xs text-gray-500 ml-1"></span>
          </label>
          <label class="block mt-2 text-sm">
            <strong>Assigned Technician:</strong>
            <select class="assignSelect border rounded p-1 ml-1" data-field="assignedTechId" data-project-id="${escHtml(project.id)}">
              ${optionsFor(project, techs, "assignedTechId")}
            </select>
            <span class="assignStatus text-xs text-gray-500 ml-1"></span>
          </label>
          <label class="block mt-1 text-sm">
            <strong>Client Portal Access:</strong>
            <select class="assignSelect border rounded p-1 ml-1" data-field="clientId" data-project-id="${escHtml(project.id)}">
              ${optionsFor(project, clients, "clientId")}
            </select>
            <span class="assignStatus text-xs text-gray-500 ml-1"></span>
          </label>
          <h3 class="mt-3 font-bold">Tasks:</h3>
          <ul class="mt-1">${tasksHTMLFor(project)}</ul>
          <div class="mt-3 flex gap-2">
            <button data-action="view" data-project-id="${escHtml(project.id)}" class="bg-blue-600 text-white px-3 py-1 rounded">View Estimate</button>
            <button data-action="edit" data-project-id="${escHtml(project.id)}" class="bg-yellow-500 text-white px-3 py-1 rounded">Edit</button>
            <button data-action="delete" data-project-id="${escHtml(project.id)}" class="bg-red-600 text-white px-3 py-1 rounded">Delete</button>
          </div>
        </div>`;
    }).join("");

    // Single event listener for all project action buttons
    projectList.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action], button.completeBtn");
      if (!btn) return;

      if (btn.classList.contains("completeBtn")) {
        const pid = btn.dataset.projectId;
        const idx = parseInt(btn.dataset.taskIndex, 10);
        if (pid && !isNaN(idx)) window.markTaskComplete(pid, idx);
        return;
      }

      const pid = btn.dataset.projectId;
      if (!pid) return;
      const action = btn.dataset.action;
      if (action === "view") window.viewProject(pid);
      else if (action === "edit") window.editProject(pid);
      else if (action === "delete") window.deleteProject(pid);
    });

    // Technician / client assignment dropdowns (both use .assignSelect,
    // distinguished by data-field so one handler covers both fields)
    projectList.addEventListener("change", async (e) => {
      const select = e.target.closest("select.assignSelect");
      if (!select) return;

      const pid = select.dataset.projectId;
      const field = select.dataset.field;
      const statusEl = select.parentElement.querySelector(".assignStatus");
      const newId = select.value;

      select.disabled = true;
      statusEl.textContent = "Saving…";
      try {
        await updateProject(pid, { [field]: newId || null });
        statusEl.textContent = "Saved ✓";
        setTimeout(() => { statusEl.textContent = ""; }, 2000);
      } catch (error) {
        console.error(`Error updating ${field}:`, error);
        statusEl.textContent = "Failed to save. Try again.";
      } finally {
        select.disabled = false;
      }
    });

  } catch (error) {
    console.error("Error loading projects:", error);
    projectList.innerHTML = `<p class="text-red-500">Failed to load projects. Check your connection and try refreshing.</p>`;
  }
});
