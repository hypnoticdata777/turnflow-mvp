import { currentUser, logout } from '../auth.js';
document.addEventListener('DOMContentLoaded', () => {
  const u = currentUser();
  const hdr = document.createElement('header');
  hdr.className = 'w-full bg-white border-b p-3 flex items-center justify-between sticky top-0 z-50';
  hdr.innerHTML = `
    <div class="font-semibold">TurnFlow™ — Technician</div>
    <div class="text-sm flex items-center gap-3">
      <span class="text-gray-600">${u?.email ?? ''}</span>
      <button id="tf-logout" class="px-3 py-1 rounded bg-gray-800 text-white">Logout</button>
    </div>
  `;
  document.body.prepend(hdr);
  document.getElementById('tf-logout')?.addEventListener('click', async () => { await logout(); });
});
