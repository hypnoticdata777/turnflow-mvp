// ===================================================
// TurnFlow™ Main Script
// ===================================================

import {
  createProject,
  getAllProjects,
  getProject,
  updateProject,
  deleteProject as deleteProjectFromFirestore,
  markTaskComplete as markTaskCompleteInFirestore
} from './firestore-projects.js';
import { escHtml } from './utils.js';

// --- Global Variables ---
let taskCount = 0;
let editingProjectId = null; // Track if we're editing an existing project

// --- Utility & Status Helper Functions ---
function tf_isValidDate(d) { return d instanceof Date && !isNaN(d); }

function tf_parseDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  const d = new Date(value);
  return tf_isValidDate(d) ? d : undefined;
}

// Returns one of: 'completed' | 'overdue' | 'blocked' | 'inprogress' | 'open'
function tf_getTaskStatus(task) {
  const now = new Date();
  if (task?.completed) return "completed";
  if (task?.blocked) return "blocked";
  const due = tf_parseDate(task?.dueDate);
  if (due && due < now) return "overdue";
  const start = tf_parseDate(task?.startTime);
  if (start && !task?.endTime) return "inprogress";
  return "open";
}

function tf_statusLabel(key) {
  const labels = {
    completed: "Completed",
    overdue: "Overdue",
    blocked: "Blocked",
    inprogress: "In Progress",
    open: "Pending"
  };
  return labels[key] || "Pending";
}


// --- Project & Task Functions ---

// Creates the HTML for a single task form
function createTaskHTML(id, task = { name: "", hours: "", rate: "", material: "" }) {
  // escHtml used in attribute context (value="...") to prevent attribute injection
  return `
    <div class="p-4 border rounded bg-gray-50 mb-3" id="task-${id}">
      <h3 class="font-semibold text-lg mb-2">Task #${id}</h3>
      <label>Task Name:</label>
      <input type="text" class="taskName block w-full mb-2 p-2 border rounded" value="${escHtml(task.name)}" />
      <label>Est. Labor Hours:</label>
      <input type="number" class="laborHours block w-full mb-2 p-2 border rounded" value="${escHtml(String(task.hours))}" />
      <label>Est. Labor Rate:</label>
      <input type="number" class="laborRate block w-full mb-2 p-2 border rounded" value="${escHtml(String(task.rate))}" />
      <label>Material Cost:</label>
      <input type="number" class="materialCost block w-full mb-2 p-2 border rounded" value="${escHtml(String(task.material))}" />
    </div>
  `;
}

// Adds a new task to the form
function addTask() {
  taskCount++;
  const taskHTML = createTaskHTML(taskCount);
  document.getElementById("taskList").insertAdjacentHTML("beforeend", taskHTML);
  attachLiveCalculation();
}

// Attaches listeners to recalculate the total on input
function attachLiveCalculation() {
  const inputs = document.querySelectorAll(".laborHours, .laborRate, .materialCost");
  inputs.forEach(input => input.addEventListener("input", calculateTotal));
}

// Calculates the total estimate from all tasks on the page
function calculateTotal() {
  let total = 0;
  document.querySelectorAll("#taskList > div").forEach(task => {
    const hours = parseFloat(task.querySelector(".laborHours")?.value) || 0;
    const rate = parseFloat(task.querySelector(".laborRate")?.value) || 0;
    const materials = parseFloat(task.querySelector(".materialCost")?.value) || 0;
    total += (hours * rate) + materials;
  });
  document.getElementById("totalEstimate").textContent = `$${total.toFixed(2)}`;
}

// Validates and saves the project from the form to Firestore
async function saveProject() {
  const projectName = document.getElementById("projectName").value.trim();
  const address = document.getElementById("propertyAddress").value.trim();
  const unit = document.getElementById("unitNumber").value.trim();
  const owner = document.getElementById("ownerName").value.trim();
  const date = document.getElementById("completionDate").value;

  // Validate required fields
  const errors = [];
  if (!projectName) errors.push("Project Name is required.");
  if (!address) errors.push("Property Address is required.");
  if (!owner) errors.push("Owner Name is required.");
  if (!date) errors.push("Target Completion Date is required.");

  const taskDivs = document.querySelectorAll("#taskList > div");
  if (taskDivs.length === 0) errors.push("At least one task is required.");

  if (errors.length > 0) {
    alert("Please fix the following issues:\n\n" + errors.join("\n"));
    return;
  }

  const projectData = {
    projectName,
    address,
    unit,
    owner,
    date,
    status: "Pending Approval",
    tasks: []
  };

  taskDivs.forEach(task => {
    const name = task.querySelector(".taskName").value.trim();
    const hours = parseFloat(task.querySelector(".laborHours").value) || 0;
    const rate = parseFloat(task.querySelector(".laborRate").value) || 0;
    const material = parseFloat(task.querySelector(".materialCost").value) || 0;
    projectData.tasks.push({ name, hours, rate, material, completed: false });
  });

  try {
    if (editingProjectId) {
      await updateProject(editingProjectId, projectData);
      sessionStorage.removeItem("editing_project_id");
    } else {
      await createProject(projectData);
    }
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Error saving project:", error);
    alert("Failed to save project. Check your connection and try again.");
  }
}


// --- Dashboard Action Functions ---

async function deleteProject(id) {
  try {
    await deleteProjectFromFirestore(id);
    window.location.reload();
  } catch (error) {
    console.error("Error deleting project:", error);
    alert("Failed to delete project. Please try again.");
  }
}

function editProject(id) {
  // Store the project ID in sessionStorage for editing
  sessionStorage.setItem("editing_project_id", id);
  window.location.href = "new-project.html";
}

function viewProject(id) {
  // Store the project ID in sessionStorage for viewing
  sessionStorage.setItem("viewing_project_id", id);
  window.location.href = "estimate.html";
}

async function markTaskComplete(projectId, taskIndex) {
  try {
    await markTaskCompleteInFirestore(projectId, taskIndex);
    window.location.reload();
  } catch (error) {
    console.error("Error marking task complete:", error);
    alert("Failed to update task. Please try again.");
  }
}


// --- Make Functions Globally Accessible for HTML `onclick` ---
window.addTask = addTask;
window.saveProject = saveProject;
window.deleteProject = deleteProject;
window.editProject = editProject;
window.viewProject = viewProject;
window.markTaskComplete = markTaskComplete;
window.tf_getTaskStatus = tf_getTaskStatus;
window.tf_statusLabel = tf_statusLabel;


// ===================================================
// Main Execution Block - Runs After Page Loads
// ===================================================
document.addEventListener("DOMContentLoaded", () => {
  
  // Load the reusable sidebar component into its placeholder
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    // Path is relative to root-level HTML pages where this script is used
    fetch('public/components/sidebar.html')
      .then(response => {
        if (!response.ok) throw new Error(`Sidebar fetch failed: ${response.status}`);
        return response.text();
      })
      .then(data => {
        sidebarContainer.innerHTML = data;
      })
      .catch(error => console.warn('Sidebar could not be loaded:', error));
  }

  // --- Logic for the "New Project" Page ---
  const addTaskBtn = document.getElementById("addTaskBtn");
  const saveProjectBtn = document.getElementById("saveProjectBtn");
  if (addTaskBtn) addTaskBtn.addEventListener("click", addTask);
  if (saveProjectBtn) saveProjectBtn.addEventListener("click", saveProject);

  // Check if we are editing a project and populate the form
  const editingProjectIdStr = sessionStorage.getItem("editing_project_id");
  if (editingProjectIdStr && document.getElementById("projectName")) {
    editingProjectId = editingProjectIdStr;

    // Load project from Firestore
    getProject(editingProjectId).then(project => {
      document.getElementById("projectName").value = project.projectName;
      document.getElementById("propertyAddress").value = project.address;
      document.getElementById("unitNumber").value = project.unit;
      document.getElementById("ownerName").value = project.owner;
      document.getElementById("completionDate").value = project.date;

      project.tasks.forEach((task) => {
        taskCount++;
        const taskHTML = createTaskHTML(taskCount, task);
        document.getElementById("taskList").insertAdjacentHTML("beforeend", taskHTML);
      });

      attachLiveCalculation();
      calculateTotal();
    }).catch(error => {
      console.error("Error loading project for editing:", error);
      sessionStorage.removeItem("editing_project_id");
    });
  }

  // --- Logic for the "Stats" Page ---
  if (document.getElementById("taskChart") || document.getElementById("costChart")) {
    getAllProjects().then(allProjects => {
      let completed = 0, pending = 0, costData = {};

      allProjects.forEach((p) => {
        let totalCost = 0;
        p.tasks.forEach((t) => {
          if (t.completed) completed++;
          else pending++;
          totalCost += (t.hours * t.rate) + t.material;
        });
        costData[p.address] = (costData[p.address] || 0) + totalCost;
      });

      // PIE CHART
      if (document.getElementById("taskChart")) {
        new Chart(document.getElementById("taskChart"), {
          type: "pie",
          data: {
            labels: ["Completed", "Pending"],
            datasets: [{ data: [completed, pending], backgroundColor: ["#22c55e", "#ef4444"] }]
          }
        });
      }

      // BAR CHART
      if (document.getElementById("costChart")) {
        new Chart(document.getElementById("costChart"), {
          type: "bar",
          data: {
            labels: Object.keys(costData),
            datasets: [{ label: "Total Cost", data: Object.values(costData), backgroundColor: "#3b82f6" }]
          },
          options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
      }
    }).catch(error => {
      console.error("Error loading stats:", error);
    });
  }
});

