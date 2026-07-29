import { requireRole } from '../auth.js';
await requireRole('vendor'); // if not vendor or not logged in -> goes to index.html
