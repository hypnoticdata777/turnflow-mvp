// ============================                               // #LINE 1
// TurnFlow™ Main Script                                      // #LINE 2
// ============================                               // #LINE 3

let taskCount = 0;                                           // #LINE 4

// ============================                               // #LINE 5
// Load Editing Project if Exists                             // #LINE 6
const editingProject = JSON.parse(localStorage.getItem("editing_project")); // #LINE 7
if (editingProject) {                                        // #LINE 8
  document.getElementById("projectName").value = editingProject.projectName; // #LINE 9
  document.getElementById("propertyAddress").value = editingProject.address; // #LINE 10
  document.getElementById("unitNumber").value = editingProject.unit;         // #LINE 11
  document.getElementById("ownerName").value = editingProject.owner;         // #LINE 12
  document.getElementById("completionDate").value = editingProject.date;     // #LINE 13

  editingProject.tasks.forEach((task) => {                   // #LINE 14
    taskCount++;                                             // #LINE 15
    const taskHTML = createTaskHTML(taskCount, task);        // #LINE 16
    document.getElementById("taskList").insertAdjacentHTML("beforeend", taskHTML); // #LINE 17
  });

  attachLiveCalculation();                                   // #LINE 18
  calculateTotal();                                          // #LINE 19
  localStorage.removeItem("editing_project");               // #LINE 20
}                                                            // #LINE 21

// ============================                               // #LINE 22
// Create Task HTML                                           // #LINE 23
function createTaskHTML(id, task = { name: "", hours: "", rate: "", material: "" }) {
  return `
    <div class="p-4 border rounded bg-gray-50 mb-3" id="task-${id}">
      <h3 class="font-semibold text-lg mb-2">Task #${id}</h3>
      
      <label class="block mb-1">Task Name:</label>
      <input type="text" class="taskName block w-full mb-2 p-2 border rounded" value="${task.name}" />

      <label class="block mb-1">Est. Labor Hours:</label>
      <input type="number" class="laborHours block w-full mb-2 p-2 border rounded" value="${task.hours}" />

      <label class="block mb-1">Est. Labor Rate:</label>
      <input type="number" class="laborRate block w-full mb-2 p-2 border rounded" value="${task.rate}" />

      <label class="block mb-1">Material Cost:</label>
      <input type="number" class="materialCost block w-full mb-2 p-2 border rounded" value="${task.material}" />
    </div>
  `;
}

// ============================                               // #LINE 39
// Attach Live Calculation Listeners                         // #LINE 40
function attachLiveCalculation() {                           // #LINE 41
  const inputs = document.querySelectorAll(".laborHours, .laborRate, .materialCost"); // #LINE 42
  inputs.forEach((input) => input.addEventListener("input", calculateTotal)); // #LINE 43
}                                                            // #LINE 44

// ============================                               // #LINE 45
// Calculate Total                                           // #LINE 46
function calculateTotal() {                                  // #LINE 47
  let total = 0;                                             // #LINE 48
  document.querySelectorAll("#taskList > div").forEach((task) => { // #LINE 49
    const hours = parseFloat(task.querySelector(".laborHours")?.value) || 0; // #LINE 50
    const rate = parseFloat(task.querySelector(".laborRate")?.value) || 0;   // #LINE 51
    const materials = parseFloat(task.querySelector(".materialCost")?.value) || 0; // #LINE 52
    total += hours * rate + materials;                      // #LINE 53
  });                                                       // #LINE 54
  const totalEl = document.getElementById("totalEstimate") || document.getElementById("totalCost"); // #LINE 55
  if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`; // #LINE 56
}                                                           // #LINE 57

// ============================                               // #LINE 58
// Add Task Function                                         // #LINE 59
function addTask() {                                        // #LINE 60
  taskCount++;                                              // #LINE 61
  const taskHTML = createTaskHTML(taskCount);               // #LINE 62
  document.getElementById("taskList").insertAdjacentHTML("beforeend", taskHTML); // #LINE 63
  attachLiveCalculation();                                  // #LINE 64
}                                                           // #LINE 65

// ============================                               // #LINE 66
// Save Project Function                                     // #LINE 67
function saveProject() {                                    // #LINE 68
  const project = {                                         // #LINE 69
    id: Date.now(),                                         // #LINE 70
    projectName: document.getElementById("projectName").value, // #LINE 71
    address: document.getElementById("propertyAddress").value, // #LINE 72
    unit: document.getElementById("unitNumber").value,      // #LINE 73
    owner: document.getElementById("ownerName").value,      // #LINE 74
    date: document.getElementById("completionDate").value,  // #LINE 75
    tasks: []                                               // #LINE 76
  };                                                        // #LINE 77

  document.querySelectorAll("#taskList > div").forEach((task) => { // #LINE 78
    project.tasks.push({                                    // #LINE 79
      name: task.querySelector(".taskName").value,          // #LINE 80
      hours: parseFloat(task.querySelector(".laborHours").value) || 0, // #LINE 81
      rate: parseFloat(task.querySelector(".laborRate").value) || 0,   // #LINE 82
      material: parseFloat(task.querySelector(".materialCost").value) || 0, // #LINE 83
      completed: false                                      // #LINE 84
    });                                                     // #LINE 85
  });                                                       // #LINE 86

  let allProjects = JSON.parse(localStorage.getItem("turnflow_projects")) || []; // #LINE 87
  allProjects.push(project);                                // #LINE 88
  localStorage.setItem("turnflow_projects", JSON.stringify(allProjects)); // #LINE 89

  window.location.href = "dashboard.html";                  // #LINE 90
}                                                           // #LINE 91

// ============================                               // #LINE 92
// Dashboard Functions                                       // #LINE 93
function deleteProject(id) {                                // #LINE 94
  let all = JSON.parse(localStorage.getItem("turnflow_projects")) || []; // #LINE 95
  all = all.filter((p) => p.id !== id);                     // #LINE 96
  localStorage.setItem("turnflow_projects", JSON.stringify(all)); // #LINE 97
  window.location.reload();                                 // #LINE 98
}                                                           // #LINE 99

function editProject(id) {                                  // #LINE 100
  const all = JSON.parse(localStorage.getItem("turnflow_projects")) || []; // #LINE 101
  const selected = all.find((p) => p.id === id);            // #LINE 102
  localStorage.setItem("editing_project", JSON.stringify(selected)); // #LINE 103
  window.location.href = "index.html";                     // #LINE 104
}                                                           // #LINE 105

function viewProject(id) {                                  // #LINE 106
  const all = JSON.parse(localStorage.getItem("turnflow_projects")) || []; // #LINE 107
  const selected = all.find((p) => p.id === id);            // #LINE 108
  localStorage.setItem("turnflow_project", JSON.stringify(selected)); // #LINE 109
  localStorage.setItem("turnflow_tasks", JSON.stringify(selected.tasks)); // #LINE 110
  window.location.href = "estimate.html";                  // #LINE 111
}                                                           // #LINE 112

function markTaskComplete(projectId, taskIndex) {           // #LINE 113
  let all = JSON.parse(localStorage.getItem("turnflow_projects")) || []; // #LINE 114
  let projIndex = all.findIndex((p) => p.id === projectId); // #LINE 115
  if (projIndex !== -1) {                                   // #LINE 116
    all[projIndex].tasks[taskIndex].completed = true;       // #LINE 117
    localStorage.setItem("turnflow_projects", JSON.stringify(all)); // #LINE 118
    window.location.reload();                               // #LINE 119
  }                                                         // #LINE 120
}                                                           // #LINE 121
// ============================
// Render Stats Charts
// ============================
if (document.getElementById("tasksChart")) {
  const allProjects = JSON.parse(localStorage.getItem("turnflow_projects")) || [];

  let completed = 0;
  let pending = 0;
  let labels = [];
  let costs = [];

  allProjects.forEach(project => {
    labels.push(project.projectName || "Unnamed");
    const total = project.tasks.reduce((sum, t) => sum + (t.hours * t.rate) + t.material, 0);
    costs.push(total);

    project.tasks.forEach(t => {
      if (t.completed) completed++;
      else pending++;
    });
  });

  // Pie Chart
  new Chart(document.getElementById("tasksChart"), {
    type: "pie",
    data: {
      labels: ["Completed", "Pending"],
      datasets: [{
        data: [completed, pending],
        backgroundColor: ["#22c55e", "#ef4444"]
      }]
    }
  });

  // Bar Chart
  new Chart(document.getElementById("costsChart"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Total Estimate ($)",
        data: costs,
        backgroundColor: "#3b82f6"
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// ============================                               // #LINE 122
// Make Functions Global                                     // #LINE 123
// ============================                               // #LINE 124
window.addTask = addTask;                                   // #LINE 125
window.saveProject = saveProject;                           // #LINE 126
window.deleteProject = deleteProject;                       // #LINE 127
window.editProject = editProject;                           // #LINE 128
window.viewProject = viewProject;                           // #LINE 129
window.markTaskComplete = markTaskComplete;                 // #LINE 130

