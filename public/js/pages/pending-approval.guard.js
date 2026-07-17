import { requireRole } from '../auth.js';
await requireRole('client'); // if not client or not logged in -> redirected
