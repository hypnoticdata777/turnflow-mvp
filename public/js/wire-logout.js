// Shared logout-button wiring for pages using the standard
// <button id="logoutBtn"> in their header (dashboard, backup, contacts,
// pending-send, stats). One file instead of five identical inline blocks.
import { logout } from './auth.js';
document.getElementById("logoutBtn")?.addEventListener("click", logout);
