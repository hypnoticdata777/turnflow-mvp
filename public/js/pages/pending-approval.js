import { currentUser } from '../auth.js';
import { getProjectsForClient } from '../firestore-projects.js';
import { escHtml, tf_getTaskStatus, tf_statusLabel, calculateEstimateTotal, projectStatusBadgeClasses } from '../utils.js';

const projectList = document.getElementById('projectList');

async function loadProjects() {
  const u = currentUser();
  if (!u) return; // requireRole('client') above already redirects unauthenticated users

  projectList.innerHTML = '<p class="text-gray-500">Loading…</p>';

  try {
    const projects = await getProjectsForClient(u.uid);

    if (projects.length === 0) {
      projectList.innerHTML = '<p class="text-gray-500">No projects have been shared with you yet.</p>';
      return;
    }

    projectList.innerHTML = projects.map((p) => {
      const total = calculateEstimateTotal(p.tasks || []);
      const taskRows = (p.tasks || []).map((t) => {
        const key = tf_getTaskStatus(t);
        const label = tf_statusLabel(key);
        return `
          <li class="flex justify-between items-center border-t py-1.5 text-sm">
            <span>${escHtml(t.name)}</span>
            <span class="tf-badge" data-status="${escHtml(key)}">${escHtml(label)}</span>
          </li>`;
      }).join("");

      return `
        <div class="border p-4 rounded bg-white shadow">
          <div class="flex justify-between items-start">
            <h2 class="text-xl font-semibold">${escHtml(p.projectName)}</h2>
            <span class="text-xs font-medium px-2 py-1 rounded-full ${projectStatusBadgeClasses(p.status)}">${escHtml(p.status || 'Pending Approval')}</span>
          </div>
          <p class="text-sm mt-1"><strong>Address:</strong> ${escHtml(p.address)}${p.unit ? ', Unit ' + escHtml(p.unit) : ''}</p>
          <p class="text-sm"><strong>Target Date:</strong> ${escHtml(p.date)}</p>
          <p class="text-sm"><strong>Estimate Total:</strong> $${total.toFixed(2)}</p>
          <h3 class="mt-3 font-semibold text-sm">Tasks</h3>
          <ul class="mt-1">${taskRows || '<li class="text-sm text-gray-500 py-1.5">No tasks listed.</li>'}</ul>
        </div>`;
    }).join("");
  } catch (error) {
    console.error('Error loading client projects:', error);
    projectList.innerHTML = '<p class="text-red-500">Failed to load your projects. Check your connection and try refreshing.</p>';
  }
}

loadProjects();
