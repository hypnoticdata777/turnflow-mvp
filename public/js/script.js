// ===================================================
// TurnFlow™ Main Script
// ===================================================

// --- Global Variables ---
let taskCount = 0;

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
  return `
    <div class="p-4 border rounded bg-gray-50 mb-3" id="task-${id}">
      <h3 class="font-semibold text-lg mb-2">Task #${id}</h3>
      <label>Task Name:</label>
      <input type="text" class="taskName block w-full mb-2 p-2 border rounded" value="${task.name}" />
      <label>Est. Labor Hours:</label>
      <input type="number" class="laborHours block w-full mb-2 p-2 border rounded" value="${task.hours}" />
      <label>Est. Labor Rate:</label>
      <input type="number" class="laborRate block w-full mb-2 p-2 border rounded" value="${task.rate}" />
      <label>Material Cost:</label>
      <input type="number" class="materialCost block w-full mb-2 p-2 border rounded" value="${task.material}" />
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

// Saves the project from the form to localStorage
function saveProject() {
  const project = {
    id: Date.now(),
    projectName: document.getElementById("projectName").value,
    address: document.getElementById("propertyAddress").value,
    unit: document.getElementById("unitNumber").value,
    owner: document.getElementById("ownerName").value,
    date: document.getElementById("completionDate").value,
    status: "Pending Approval",
    tasks: []
  };

  document.querySelectorAll("#taskList > div").forEach(task => {
    project.tasks.push({
      name: task.querySelector(".taskName").value,
      hours: parseFloat(task.querySelector(".laborHours").value) || 0,
      rate: parseFloat(task.querySelector(".laborRate").value) || 0,
      material: parseFloat(task.querySelector(".materialCost").value) || 0,
      completed: false
    });
  });

  let allProjects = JSON.parse(localStorage.getItem("turnflow_projects")) || [];
  allProjects.push(project);
  localStorage.setItem("turnflow_projects", JSON.stringify(allProjects));

  window.location.href = "dashboard.html";
}


// --- Dashboard Action Functions ---

function deleteProject(id) {
  let all = JSON.parse(localStorage.getItem("turnflow_projects")) || [];
  all = all.filter((p) => p.id !== id);
  localStorage.setItem("turnflow_projects", JSON.stringify(all));
  window.location.reload();
}

function editProject(id) {
  const all = JSON.parse(localStorage.getItem("turnflow_projects")) || [];
  const selected = all.find((p) => p.id === id);
  localStorage.setItem("editing_project", JSON.stringify(selected));
  // ✅ BUG FIX: Redirect to the project form page, not the login page.
  window.location.href = "new-project.html"; 
}

function viewProject(id) {
  const all = JSON.parse(localStorage.getItem("turnflow_projects")) || [];
  const selected = all.find((p) => p.id === id);
  localStorage.setItem("turnflow_project", JSON.stringify(selected));
  localStorage.setItem("turnflow_tasks", JSON.stringify(selected.tasks));
  window.location.href = "estimate.html";
}

function markTaskComplete(projectId, taskIndex) {
  let all = JSON.parse(localStorage.getItem("turnflow_projects")) || [];
  let projIndex = all.findIndex((p) => p.id === projectId);

  if (projIndex !== -1) {
    all[projIndex].tasks[taskIndex].completed = true;
    localStorage.setItem("turnflow_projects", JSON.stringify(all));
    window.location.reload();
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
  
  // ✅ NEW: Load the reusable sidebar component into its placeholder
  const sidebarContainer = document.getElementById('sidebar-container');
  if (sidebarContainer) {
    fetch('public/components/sidebar.html')
      .then(response => response.text())
      .then(data => {
        sidebarContainer.innerHTML = data;
      })
      .catch(error => console.error('Error loading sidebar:', error));
  }

  // --- Logic for the "New Project" Page ---
  const addTaskBtn = document.getElementById("addTaskBtn");
  const saveProjectBtn = document.getElementById("saveProjectBtn");
  if (addTaskBtn) addTaskBtn.addEventListener("click", addTask);
  if (saveProjectBtn) saveProjectBtn.addEventListener("click", saveProject);

  // Check if we are editing a project and populate the form
  const editingProject = JSON.parse(localStorage.getItem("editing_project"));
  if (editingProject && document.getElementById("projectName")) {
    document.getElementById("projectName").value = editingProject.projectName;
    document.getElementById("propertyAddress").value = editingProject.address;
    document.getElementById("unitNumber").value = editingProject.unit;
    document.getElementById("ownerName").value = editingProject.owner;
    document.getElementById("completionDate").value = editingProject.date;

    editingProject.tasks.forEach((task) => {
      taskCount++;
      const taskHTML = createTaskHTML(taskCount, task);
      document.getElementById("taskList").insertAdjacentHTML("beforeend", taskHTML);
    });

    attachLiveCalculation();
    calculateTotal();
    localStorage.removeItem("editing_project");
  }

  // --- Logic for the "Stats" Page ---
  if (document.getElementById("taskChart") || document.getElementById("costChart")) {
    const allProjects = JSON.parse(localStorage.getItem("turnflow_projects")) || [];
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
  }
});

