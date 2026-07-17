import { getProject } from '../firestore-projects.js';
import { escHtml } from '../utils.js';

const { jsPDF } = window.jspdf;
let projectData = null;
let taskData = null;

const projectInfoDiv = document.getElementById("projectInfo");
const taskSummaryDiv = document.getElementById("taskSummary");
const finalEstimateSpan = document.getElementById("finalEstimate");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

// Get project ID from sessionStorage
const projectId = sessionStorage.getItem("viewing_project_id");

if (projectId) {
  try {
    projectData = await getProject(projectId);
    taskData = projectData.tasks || [];

    projectInfoDiv.innerHTML = `
      <p><strong>Project:</strong> ${escHtml(projectData.projectName)}</p>
      <p><strong>Address:</strong> ${escHtml(projectData.address)}, Unit ${escHtml(projectData.unit)}</p>
      <p><strong>Owner:</strong> ${escHtml(projectData.owner)}</p>
      <p><strong>Target Completion:</strong> ${escHtml(projectData.date)}</p>
    `;

    let grandTotal = 0;
    const taskItems = taskData.map((task, index) => {
      const cost = (task.hours * task.rate) + task.material;
      grandTotal += cost;
      return `
        <div class="border p-4 rounded bg-gray-50">
          <h3 class="font-semibold mb-1">Task #${index + 1}: ${escHtml(task.name)}</h3>
          <p><strong>Labor:</strong> ${escHtml(String(task.hours))} hrs @ $${escHtml(String(task.rate))}/hr = $${(task.hours * task.rate).toFixed(2)}</p>
          <p><strong>Materials:</strong> $${Number(task.material).toFixed(2)}</p>
          <p><strong>Total:</strong> $${cost.toFixed(2)}</p>
        </div>
      `;
    });
    taskSummaryDiv.innerHTML = taskItems.join('');
    finalEstimateSpan.textContent = `$${grandTotal.toFixed(2)}`;
  } catch (error) {
    console.error("Error loading project:", error);
    projectInfoDiv.innerHTML = `<p class="text-red-500">Failed to load project data. The project may not exist or you may not have access.</p>`;
  }
} else {
  projectInfoDiv.innerHTML = `<p class="text-red-500">No project selected. Please go back to the dashboard and select a project.</p>`;
}

function downloadPDF() {
  if (!projectData || !taskData) return;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Turn Estimate Summary", 10, 10);
  doc.setFontSize(12);

  doc.text(`Project: ${projectData.projectName}`, 10, 20);
  doc.text(`Address: ${projectData.address}, Unit ${projectData.unit}`, 10, 30);
  doc.text(`Owner: ${projectData.owner}`, 10, 40);
  doc.text(`Target Completion: ${projectData.date}`, 10, 50);

  let y = 70;
  taskData.forEach((task, i) => {
    doc.text(`Task ${i + 1}: ${task.name}`, 10, y); y += 10;
    doc.text(`Labor: ${task.hours} hrs @ $${task.rate}/hr`, 10, y); y += 10;
    doc.text(`Materials: $${task.material}`, 10, y); y += 10;
  });

  doc.text(`Total Estimate: $${finalEstimateSpan.textContent}`, 10, y + 10);
  doc.save("estimate.pdf");
}

downloadPdfBtn?.addEventListener("click", downloadPDF);
