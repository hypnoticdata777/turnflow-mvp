import { db } from '../firebase-config.js';
import { currentUser } from '../auth.js';
import { escHtml } from '../utils.js';
import { collection, query, where, getDocs }
  from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

const u = currentUser();
const listContainer = document.getElementById('tech-projects');
const projectSelect = document.getElementById('projectId');
const taskSelect = document.getElementById('taskId');

// Keyed by Firestore doc ID so the task select can be populated on demand
const projectCache = {};

function populateTaskSelect(projectId) {
  taskSelect.innerHTML = '<option value="">— select a task —</option>';
  taskSelect.disabled = true;
  const tasks = projectCache[projectId]?.tasks || [];
  tasks.forEach((t, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = t.name || `Task ${i + 1}`;
    taskSelect.appendChild(opt);
  });
  taskSelect.disabled = tasks.length === 0;
}

projectSelect.addEventListener('change', () => {
  populateTaskSelect(projectSelect.value);
  // Reset task select and trigger gallery update via the existing technician.js listener
  taskSelect.value = '';
  taskSelect.dispatchEvent(new Event('change'));
});

async function loadProjectsForTech() {
  if (!u) {
    listContainer.innerHTML = '<p class="text-red-500">User not found. Cannot load projects.</p>';
    return;
  }
  listContainer.innerHTML = '<p class="text-gray-500">Loading…</p>';

  try {
    const q = query(
      collection(db, 'projects'),
      where('assignedTechId', '==', u.uid)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      listContainer.innerHTML = '<p class="text-gray-500">No projects assigned to you.</p>';
      return;
    }

    listContainer.textContent = '';
    snap.forEach(docSnap => {
      const p = docSnap.data();
      projectCache[docSnap.id] = p;

      // Populate the upload-section project dropdown
      const opt = document.createElement('option');
      opt.value = docSnap.id;
      opt.textContent = p.projectName || p.name || docSnap.id;
      projectSelect.appendChild(opt);

      // Build task list using safe DOM methods
      const taskList = document.createElement('ul');
      taskList.className = 'list-disc ml-5';
      (p.tasks || []).forEach(t => {
        const li = document.createElement('li');
        const statusSpan = document.createElement('span');
        statusSpan.className = 'text-gray-600';
        statusSpan.textContent = t.completed ? 'Completed' : 'Pending';
        li.textContent = `${t.name || '(unnamed task)'} — `;
        li.appendChild(statusSpan);
        taskList.appendChild(li);
      });

      // Build card using escHtml for user-controlled values
      const card = document.createElement('div');
      card.className = 'bg-white border rounded-xl p-4 shadow-sm';
      card.innerHTML = `
        <h3 class="text-lg font-semibold mb-1">${escHtml(p.projectName || p.name || 'Project')}</h3>
        <p class="text-sm"><strong>Address:</strong> ${escHtml(p.address || '')}${p.unit ? ', Unit ' + escHtml(p.unit) : ''}</p>
        <p class="text-sm"><strong>Owner:</strong> ${escHtml(p.owner || p.ownerName || '')}</p>
        <p class="text-sm mb-2"><strong>Target Date:</strong> ${escHtml(p.date || p.targetDate || '')}</p>
        <div class="mt-2"><strong>Tasks:</strong></div>
      `;
      card.lastElementChild.appendChild(taskList);
      listContainer.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading projects for technician:', error);
    listContainer.innerHTML = '<p class="text-red-500">Failed to load projects. Check your connection and try refreshing.</p>';
  }
}

loadProjectsForTech();
