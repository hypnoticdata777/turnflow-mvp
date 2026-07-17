import { requireRole } from '../auth.js';
await requireRole('tech'); // if not tech or not logged in -> goes to index.html
