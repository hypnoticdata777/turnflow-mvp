import { describe, it, expect } from 'vitest';
import {
  escHtml,
  tf_getTaskStatus,
  tf_statusLabel,
  tf_parseDate,
  tf_isValidDate,
  calculateEstimateTotal,
  formatUserLabel,
  assignedTechLabel,
  assignedClientLabel,
  PROJECT_STATUSES,
  projectStatusBadgeClasses
} from '../utils.js';

describe('escHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escHtml(`<script>alert("x")</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
  });

  it('escapes single quotes and ampersands', () => {
    expect(escHtml(`O'Brien & Sons`)).toBe('O&#39;Brien &amp; Sons');
  });

  it('returns an empty string for null/undefined', () => {
    expect(escHtml(null)).toBe('');
    expect(escHtml(undefined)).toBe('');
  });

  it('coerces non-string values to strings', () => {
    expect(escHtml(42)).toBe('42');
  });
});

describe('tf_isValidDate / tf_parseDate', () => {
  it('accepts a valid Date instance', () => {
    const d = new Date('2026-01-01');
    expect(tf_isValidDate(d)).toBe(true);
    expect(tf_parseDate(d)).toBe(d);
  });

  it('rejects an invalid Date', () => {
    expect(tf_isValidDate(new Date('not-a-date'))).toBe(false);
  });

  it('parses a numeric timestamp', () => {
    const ms = Date.now();
    expect(tf_parseDate(ms)?.getTime()).toBe(ms);
  });

  it('returns undefined for unparseable input', () => {
    expect(tf_parseDate('not-a-date')).toBeUndefined();
    expect(tf_parseDate(undefined)).toBeUndefined();
  });
});

describe('tf_getTaskStatus', () => {
  const now = new Date('2026-07-12T00:00:00Z');

  it('returns completed when task.completed is true, regardless of other fields', () => {
    expect(tf_getTaskStatus({ completed: true, blocked: true }, now)).toBe('completed');
  });

  it('returns blocked when task.blocked is true and not completed', () => {
    expect(tf_getTaskStatus({ blocked: true }, now)).toBe('blocked');
  });

  it('returns overdue when dueDate is in the past', () => {
    expect(tf_getTaskStatus({ dueDate: '2026-01-01' }, now)).toBe('overdue');
  });

  it('returns open when dueDate is in the future', () => {
    expect(tf_getTaskStatus({ dueDate: '2027-01-01' }, now)).toBe('open');
  });

  it('returns inprogress when started but not ended', () => {
    expect(tf_getTaskStatus({ startTime: '2026-07-01' }, now)).toBe('inprogress');
  });

  it('returns open when started and ended', () => {
    expect(tf_getTaskStatus({ startTime: '2026-07-01', endTime: '2026-07-02' }, now)).toBe('open');
  });

  it('returns open for a bare task with no signal fields', () => {
    expect(tf_getTaskStatus({}, now)).toBe('open');
  });
});

describe('tf_statusLabel', () => {
  it('maps known status keys to display labels', () => {
    expect(tf_statusLabel('completed')).toBe('Completed');
    expect(tf_statusLabel('overdue')).toBe('Overdue');
    expect(tf_statusLabel('blocked')).toBe('Blocked');
    expect(tf_statusLabel('inprogress')).toBe('In Progress');
    expect(tf_statusLabel('open')).toBe('Pending');
  });

  it('falls back to Pending for unknown keys', () => {
    expect(tf_statusLabel('bogus')).toBe('Pending');
  });
});

describe('calculateEstimateTotal', () => {
  it('sums (hours * rate) + material across tasks', () => {
    const tasks = [
      { hours: 2, rate: 50, material: 10 },
      { hours: 1, rate: 75, material: 0 }
    ];
    expect(calculateEstimateTotal(tasks)).toBe(2 * 50 + 10 + 1 * 75 + 0);
  });

  it('treats missing/non-numeric fields as 0', () => {
    expect(calculateEstimateTotal([{ hours: '', rate: undefined, material: 'abc' }])).toBe(0);
  });

  it('returns 0 for an empty task list', () => {
    expect(calculateEstimateTotal([])).toBe(0);
    expect(calculateEstimateTotal()).toBe(0);
  });

  it('parses string-valued numeric fields (matches raw DOM input.value)', () => {
    expect(calculateEstimateTotal([{ hours: '3', rate: '20', material: '15' }])).toBe(75);
  });
});

describe('formatUserLabel', () => {
  it('prefers name over email over uid', () => {
    expect(formatUserLabel({ uid: 'u1', email: 'a@b.com', name: 'Alex' })).toBe('Alex');
    expect(formatUserLabel({ uid: 'u1', email: 'a@b.com' })).toBe('a@b.com');
    expect(formatUserLabel({ uid: 'u1' })).toBe('u1');
  });

  it('returns an empty string for null/undefined', () => {
    expect(formatUserLabel(null)).toBe('');
    expect(formatUserLabel(undefined)).toBe('');
  });
});

describe('assignedTechLabel', () => {
  const techs = [
    { uid: 'tech-1', name: 'Jamie Rivera' },
    { uid: 'tech-2', email: 'sam@turnflow.test' }
  ];

  it('returns Unassigned when no assignedTechId is set', () => {
    expect(assignedTechLabel({}, techs)).toBe('Unassigned');
    expect(assignedTechLabel({ assignedTechId: '' }, techs)).toBe('Unassigned');
  });

  it('resolves the assigned tech to their display label', () => {
    expect(assignedTechLabel({ assignedTechId: 'tech-1' }, techs)).toBe('Jamie Rivera');
    expect(assignedTechLabel({ assignedTechId: 'tech-2' }, techs)).toBe('sam@turnflow.test');
  });

  it('falls back to a placeholder when the tech is not in the provided list', () => {
    expect(assignedTechLabel({ assignedTechId: 'ghost' }, techs)).toBe('Unknown (ghost)');
  });

  it('defaults the tech list to empty', () => {
    expect(assignedTechLabel({ assignedTechId: 'tech-1' })).toBe('Unknown (tech-1)');
  });
});

describe('assignedClientLabel', () => {
  const clients = [{ uid: 'client-1', name: 'Maria Felix' }];

  it('returns Unassigned when no clientId is set', () => {
    expect(assignedClientLabel({}, clients)).toBe('Unassigned');
  });

  it('resolves the assigned client to their display label', () => {
    expect(assignedClientLabel({ clientId: 'client-1' }, clients)).toBe('Maria Felix');
  });

  it('falls back to a placeholder when the client is not in the provided list', () => {
    expect(assignedClientLabel({ clientId: 'ghost' }, clients)).toBe('Unknown (ghost)');
  });

  it('does not confuse tech and client assignment fields', () => {
    const project = { assignedTechId: 'tech-1', clientId: 'client-1' };
    expect(assignedClientLabel(project, clients)).toBe('Maria Felix');
    expect(assignedClientLabel(project, [{ uid: 'tech-1', name: 'Jamie Rivera' }])).toBe('Unknown (client-1)');
  });
});

describe('PROJECT_STATUSES', () => {
  it('lists the lifecycle in forward order', () => {
    expect(PROJECT_STATUSES).toEqual(['Pending Approval', 'Approved', 'Sent', 'Completed']);
  });
});

describe('projectStatusBadgeClasses', () => {
  it('returns a distinct class set for each known status', () => {
    const classes = PROJECT_STATUSES.map(projectStatusBadgeClasses);
    expect(new Set(classes).size).toBe(PROJECT_STATUSES.length);
  });

  it('falls back to the Pending Approval styling for unknown/missing status', () => {
    expect(projectStatusBadgeClasses('Pending Approval')).toBe(projectStatusBadgeClasses(undefined));
    expect(projectStatusBadgeClasses('Pending Approval')).toBe(projectStatusBadgeClasses('bogus'));
  });
});
