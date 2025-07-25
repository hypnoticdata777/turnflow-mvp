let taskCount = 0;

document.getElementById("addTaskBtn").addEventListener("click", () => {
  taskCount++;
  const taskHTML = `
    <div class="p-4 border rounded bg-gray-50" id="task-${taskCount}">
      <h3 class="font-semibold text-lg mb-2">Task #${taskCount}</h3>
      
      <label>Task Name:</label>
      <input type="text" class="taskName block w-full mb-2 p-2 border rounded" />

      <label>Est. Labor Hours:</label>
      <input type="number" class="laborHours block w-full mb-2 p-2 border rounded" />

      <label>Est. Labor Rate:</label>
      <input type="number" class="laborRate block w-full mb-2 p-2 border rounded" />

      <label>Material Cost:</label>
      <input type="number" class="materialCost block w-full mb-2 p-2 border rounded" />
    </div>
  `;
  document.getElementById("taskList").insertAdjacentHTML("beforeend", taskHTML);
  attachLiveCalculation(); // Add listeners to new fields
});

function attachLiveCalculation() {
  const inputs = document.querySelectorAll('.laborHours, .laborRate, .materialCost');
  inputs.forEach(input => {
    input.addEventListener('input', calculateTotal);
  });
}

function calculateTotal() {
  let total = 0;
  const tasks = document.querySelectorAll("#taskList > div");

  tasks.forEach(task => {
    const hours = parseFloat(task.querySelector('.laborHours')?.value) || 0;
    const rate = parseFloat(task.querySelector('.laborRate')?.value) || 0;
    const materials = parseFloat(task.querySelector('.materialCost')?.value) || 0;

    const taskTotal = (hours * rate) + materials;
    total += taskTotal;
  });

  document.getElementById("totalCost").textContent = `$${total.toFixed(2)}`;
}
document.getElementById("project-form").addEventListener("submit", function(e) {
  e.preventDefault();

  const project = {
    id: Date.now(), // unique ID
    projectName: document.getElementById("projectName").value,
    address: document.getElementById("propertyAddress").value,
    unit: document.getElementById("unitNumber").value,
    owner: document.getElementById("ownerName").value,
    date: document.getElementById("completionDate").value,
    tasks: []
  };

  document.querySelectorAll("#taskList > div").forEach(task => {
    project.tasks.push({
      name: task.querySelector('.taskName').value,
      hours: parseFloat(task.querySelector('.laborHours').value) || 0,
      rate: parseFloat(task.querySelector('.laborRate').value) || 0,
      material: parseFloat(task.querySelector('.materialCost').value) || 0
    });
  });

  // Get all saved projects (or create empty array)
  let allProjects = JSON.parse(localStorage.getItem("turnflow_projects")) || [];
  allProjects.push(project);

  // Save back to localStorage
  localStorage.setItem("turnflow_projects", JSON.stringify(allProjects));

  // Redirect to dashboard
  window.location.href = "dashboard.html";
});

