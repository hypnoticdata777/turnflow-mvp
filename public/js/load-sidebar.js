// Loads the shared owner-nav sidebar into any page with a
// <div id="sidebar-container">. Extracted from the pre-pivot script.js,
// which bundled this together with a lot of project/task-form logic that
// no longer applies under the new domain model.
document.addEventListener("DOMContentLoaded", () => {
  const sidebarContainer = document.getElementById('sidebar-container');
  if (!sidebarContainer) return;

  fetch('public/components/sidebar.html')
    .then(response => {
      if (!response.ok) throw new Error(`Sidebar fetch failed: ${response.status}`);
      return response.text();
    })
    .then(data => {
      sidebarContainer.innerHTML = data;
    })
    .catch(error => console.warn('Sidebar could not be loaded:', error));
});
