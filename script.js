// ============================
// TurnFlow™ Main Script
// ============================

// #LINE 1 – Global Variables
let taskCount = 0;

/* ============================================================
   CHECKPOINT 2 – Status Helpers (added, NOT used yet)
   Safe to keep; no behavior changes until we call them later.
============================================================ */
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
  const completed = !!task?.completed;
  const blocked = !!task?.blocked;     // optional field; fine if undefined
  const start = tf_parseDate(task?.startTime);
  const end   = tf_parseDate(task?.endTime);
  const due   = tf_parseDate(task?.dueDate);

  if (completed) return "completed";
  if (blocked)   return "blocked";
  if (due && due < now) return "overdue";
  if (start && !end)    return "inprogress";
  return "open"; // aligns with your current "Pending" vibe
}

function tf_statusLabel(key) {
  switch (key) {
    case "completed":  return "Completed";
    case "overdue":    return "Overdue";
    case "blocked":    return "Blocked";
    case "inprogress": return "In Progress";
    default:           return "Pending";
  }
}
// ============================

// #LINE 5 – Load Editing Project if Exists
const editingProject = JSON.parse(localStorage.getItem("editing_project"));
if (editingProject) {
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

// ============================
// #LINE 25 – Create Task HTML Function
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

// ============================
// #LINE 55 – Add Task Function
function addTask() {
  taskCount++;
  const taskHTML = createTaskHTML(taskCount);
  document.getElementById("taskList").insertAdjacentHTML("beforeend", taskHTML);
  attachLiveCalculation();
}

// ============================
// #LINE 65 – Attach Calculation Listeners
function attachLiveCalculation() {
  const inputs = document.querySelectorAll(".laborHours, .laborRate, .materialCost");
  inputs.forEach(input => input.addEventListener("input", calculateTotal));
}

// ============================
// #LINE 72 – Calculate Total
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

// ============================
// #LINE 90 – Save Project
function saveProject() {
  const project = {
    id: Date.now(),
    projectName: document.getElementById("projectName").value,
    address: document.getElementById("propertyAddress").value,
    unit: document.getElementById("unitNumber").value,
    owner: document.getElementById("ownerName").value,
    date: document.getElementById("completionDate").value,
    status: "Pending Approval", // NEW FIELD
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

// ============================
// #LINE 120 – Dashboard Functions
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
  window.location.href = "index.html";
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

// ============================
// =============================
// Stats Logic (Fixed)
// =============================
if (document.getElementById("taskChart") || document.getElementById("costChart")) {
  const allProjects = JSON.parse(localStorage.getItem("turnflow_projects")) || [];

  let completed = 0,
      pending = 0,
      costData = {};

  allProjects.forEach((p) => {
    let total = 0;

    p.tasks.forEach(t => {
      const hours = parseFloat(t.hours) || 0;
      const rate = parseFloat(t.rate) || 0;
      const materials = parseFloat(t.material) || 0;

      if (t.completed) completed++;
      else pending++;

      total += (hours * rate) + materials;
    });

    costData[p.address] = (costData[p.address] || 0) + total;
  });

  // PIE CHART
  if (document.getElementById("taskChart")) {
    new Chart(document.getElementById("taskChart"), {
      type: "pie",
      data: {
        labels: ["Completed", "Pending"],
        datasets: [
          {
            data: [completed, pending],
            backgroundColor: ["#22c55e", "#ef4444"]
          }
        ]
      }
    });
  }

  // BAR CHART
  if (document.getElementById("costChart")) {
    new Chart(document.getElementById("costChart"), {
      type: "bar",
      data: {
        labels: Object.keys(costData),
        datasets: [
          {
            label: "Total Cost",
            data: Object.values(costData),
            backgroundColor: "#3b82f6"
          }
        ]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } }
      }
    });
  }
}



// ============================
// #LINE 210 – Make Functions Global
window.addTask = addTask;
window.saveProject = saveProject;
window.deleteProject = deleteProject;
window.editProject = editProject;
window.viewProject = viewProject;
window.markTaskComplete = markTaskComplete;
// ============================
// #LINE 220 – Attach Events on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded.");

  // ✅ BUTTON EVENTS
  const addTaskBtn = document.getElementById("addTaskBtn");
  const saveProjectBtn = document.getElementById("saveProjectBtn");

  if (addTaskBtn) {
    addTaskBtn.addEventListener("click", addTask);
    console.log("addTaskBtn found ✅");
  } else {
    console.log("addTaskBtn not found ❌");
  }

  if (saveProjectBtn) {
    saveProjectBtn.addEventListener("click", saveProject);
    console.log("saveProjectBtn found ✅");
  } else {
    console.log("saveProjectBtn not found ❌");
  }

  // ✅ STATS LOGIC
  if (document.getElementById("taskChart") || document.getElementById("costChart")) {
    console.log("Stats page detected, loading charts...");

    const allProjects = JSON.parse(localStorage.getItem("turnflow_projects")) || [];
    let completed = 0, pending = 0, costData = {};

    allProjects.forEach((p) => {
      let total = 0;
      p.tasks.forEach((t) => {
        const hours = parseFloat(t.hours) || 0;
        const rate = parseFloat(t.rate) || 0;
        const materials = parseFloat(t.material) || 0;

        if (t.completed) completed++;
        else pending++;

        total += (hours * rate) + materials;
      });
      costData[p.address] = (costData[p.address] || 0) + total;
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



