# Turnflow MVP

Turnflow is a web application designed to help manage and track property turnover projects, from creating estimates to assigning tasks to technicians.

---

### ✨ Features

* **User Authentication:** Secure login for different user roles (PMs, Technicians).
* **Project Management:** Create, edit, and delete turnover projects.
* **Task Tracking:** Add tasks with cost estimates (labor, materials) to each project.
* **Status Dashboards:** View projects based on their status (Pending Approval, Pending Send).
* **Technician View:** A dedicated dashboard for technicians to view their assigned projects and upload photos.
* **Data Backup:** Simple JSON backup and restore functionality for all project data.

---

### 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **Styling:** Tailwind CSS (via CDN)
* **Backend & Database:** Firebase (Authentication, Firestore, Storage)
* **Charting:** Chart.js for project statistics

---

### 🚀 Getting Started

To run this project locally:

1.  Clone the repository:
    `git clone https://github.com/your-username/turnflow-mvp.git`

2.  Create a `public/js/firebase-config.js` file and add your own Firebase project credentials.

3.  Open the `index.html` file in your browser to access the login page.
