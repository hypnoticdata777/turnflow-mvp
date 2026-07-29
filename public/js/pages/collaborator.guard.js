import { requireRole } from '../auth.js';
await requireRole('collaborator'); // if not collaborator or not logged in -> redirected
