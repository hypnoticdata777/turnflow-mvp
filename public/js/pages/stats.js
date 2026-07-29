import { currentUser } from '../auth.js';
import { getAllRequestsForOwner } from '../firestore-requests.js';
import { getPropertiesForOwner } from '../firestore-properties.js';
import { REQUEST_STATUSES, costForRequest } from '../utils.js';

document.addEventListener("DOMContentLoaded", async () => {
  const statusChartEl = document.getElementById("statusChart");
  const costChartEl = document.getElementById("costChart");
  if (!statusChartEl && !costChartEl) return;

  const ownerUid = currentUser()?.uid;

  try {
    const [requests, properties] = await Promise.all([
      getAllRequestsForOwner(ownerUid),
      getPropertiesForOwner(ownerUid)
    ]);

    const propertyLabel = (propertyId) => {
      const p = properties.find(p => p.id === propertyId);
      return p ? (p.nickname || p.address) : 'Unknown property';
    };

    const statusCounts = Object.fromEntries(REQUEST_STATUSES.map(s => [s, 0]));
    const costByProperty = {};

    requests.forEach((r) => {
      const status = REQUEST_STATUSES.includes(r.status) ? r.status : 'Draft';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      const label = propertyLabel(r.propertyId);
      costByProperty[label] = (costByProperty[label] || 0) + costForRequest(r);
    });

    if (statusChartEl) {
      new Chart(statusChartEl, {
        type: "pie",
        data: {
          labels: Object.keys(statusCounts),
          datasets: [{
            data: Object.values(statusCounts),
            backgroundColor: ["#9ca3af", "#facc15", "#fb923c", "#3b82f6", "#6366f1", "#a855f7", "#22c55e", "#6b7280"]
          }]
        }
      });
    }

    if (costChartEl) {
      new Chart(costChartEl, {
        type: "bar",
        data: {
          labels: Object.keys(costByProperty),
          datasets: [{ label: "Total Cost", data: Object.values(costByProperty), backgroundColor: "#3b82f6" }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
      });
    }
  } catch (error) {
    console.error("Error loading stats:", error);
  }
});
