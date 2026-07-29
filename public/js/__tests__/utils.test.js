import { describe, it, expect } from 'vitest';
import {
  escHtml,
  tf_parseDate,
  tf_isValidDate,
  formatUserLabel,
  assignedVendorLabel,
  assignedCollaboratorLabel,
  REQUEST_STATUSES,
  requestStatusBadgeClasses,
  costForRequest,
  costLabelForRequest,
  LOGIN_LOCKOUT_THRESHOLD,
  LOGIN_LOCKOUT_MS,
  normalizeEmailKey,
  getLockoutRemainingMs,
  recordFailedLogin,
  clearLoginAttempts
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

describe('assignedVendorLabel', () => {
  const vendors = [
    { uid: 'vendor-1', name: 'Jamie Rivera' },
    { uid: 'vendor-2', email: 'sam@turnflow.test' }
  ];

  it('returns Unassigned when no assignedVendorUid is set', () => {
    expect(assignedVendorLabel({}, vendors)).toBe('Unassigned');
    expect(assignedVendorLabel({ assignedVendorUid: '' }, vendors)).toBe('Unassigned');
  });

  it('resolves the assigned vendor to their display label', () => {
    expect(assignedVendorLabel({ assignedVendorUid: 'vendor-1' }, vendors)).toBe('Jamie Rivera');
    expect(assignedVendorLabel({ assignedVendorUid: 'vendor-2' }, vendors)).toBe('sam@turnflow.test');
  });

  it('falls back to a placeholder when the vendor is not in the provided list', () => {
    expect(assignedVendorLabel({ assignedVendorUid: 'ghost' }, vendors)).toBe('Unknown (ghost)');
  });

  it('defaults the vendor list to empty', () => {
    expect(assignedVendorLabel({ assignedVendorUid: 'vendor-1' })).toBe('Unknown (vendor-1)');
  });
});

describe('assignedCollaboratorLabel', () => {
  const collaborators = [{ uid: 'collab-1', name: 'Maria Felix' }];

  it('returns Unassigned when no collaboratorUid is set', () => {
    expect(assignedCollaboratorLabel({}, collaborators)).toBe('Unassigned');
  });

  it('resolves the assigned collaborator to their display label', () => {
    expect(assignedCollaboratorLabel({ collaboratorUid: 'collab-1' }, collaborators)).toBe('Maria Felix');
  });

  it('falls back to a placeholder when the collaborator is not in the provided list', () => {
    expect(assignedCollaboratorLabel({ collaboratorUid: 'ghost' }, collaborators)).toBe('Unknown (ghost)');
  });

  it('does not confuse vendor and collaborator assignment fields', () => {
    const reqData = { assignedVendorUid: 'vendor-1', collaboratorUid: 'collab-1' };
    expect(assignedCollaboratorLabel(reqData, collaborators)).toBe('Maria Felix');
    expect(assignedCollaboratorLabel(reqData, [{ uid: 'vendor-1', name: 'Jamie Rivera' }])).toBe('Unknown (collab-1)');
  });
});

describe('REQUEST_STATUSES', () => {
  it('lists the 8-state lifecycle in forward order', () => {
    expect(REQUEST_STATUSES).toEqual([
      'Draft', 'Needs Quote', 'Waiting', 'Scheduled',
      'In Progress', 'Needs Review', 'Complete', 'Archived'
    ]);
  });
});

describe('requestStatusBadgeClasses', () => {
  it('returns a distinct class set for each known status', () => {
    const classes = REQUEST_STATUSES.map(requestStatusBadgeClasses);
    expect(new Set(classes).size).toBe(REQUEST_STATUSES.length);
  });

  it('falls back to the Draft styling for unknown/missing status', () => {
    expect(requestStatusBadgeClasses('Draft')).toBe(requestStatusBadgeClasses(undefined));
    expect(requestStatusBadgeClasses('Draft')).toBe(requestStatusBadgeClasses('bogus'));
  });
});

describe('costForRequest / costLabelForRequest (BRL3)', () => {
  it('reports no cost recorded when nothing is set', () => {
    expect(costForRequest({})).toBe(0);
    expect(costLabelForRequest({})).toBe('No cost recorded');
  });

  it('prefers estimatedCost when only it is set', () => {
    expect(costForRequest({ estimatedCost: 100 })).toBe(100);
    expect(costLabelForRequest({ estimatedCost: 100 })).toBe('Estimated');
  });

  it('prefers quotedCost over estimatedCost', () => {
    expect(costForRequest({ estimatedCost: 100, quotedCost: 150 })).toBe(150);
    expect(costLabelForRequest({ estimatedCost: 100, quotedCost: 150 })).toBe('Quoted');
  });

  it('prefers finalCost over quotedCost and estimatedCost', () => {
    const reqData = { estimatedCost: 100, quotedCost: 150, finalCost: 175 };
    expect(costForRequest(reqData)).toBe(175);
    expect(costLabelForRequest(reqData)).toBe('Final');
  });

  it('treats null/empty-string cost fields as not set', () => {
    expect(costForRequest({ estimatedCost: 100, finalCost: null })).toBe(100);
    expect(costForRequest({ estimatedCost: 100, finalCost: '' })).toBe(100);
  });

  it('parses string-valued numeric fields (matches raw DOM input.value)', () => {
    expect(costForRequest({ estimatedCost: '42.50' })).toBe(42.5);
  });

  it('falls back to 0 for a non-numeric cost value', () => {
    expect(costForRequest({ estimatedCost: 'abc' })).toBe(0);
  });
});

describe('normalizeEmailKey', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmailKey('  Alex@Example.com  ')).toBe('alex@example.com');
  });

  it('handles null/undefined', () => {
    expect(normalizeEmailKey(null)).toBe('');
    expect(normalizeEmailKey(undefined)).toBe('');
  });
});

describe('login lockout (recordFailedLogin / getLockoutRemainingMs / clearLoginAttempts)', () => {
  const now = 1_000_000;

  it('is not locked out with no history', () => {
    expect(getLockoutRemainingMs({}, 'a@b.com', now)).toBe(0);
  });

  it('does not lock out before reaching the threshold', () => {
    let attempts = {};
    for (let i = 0; i < LOGIN_LOCKOUT_THRESHOLD - 1; i++) {
      attempts = recordFailedLogin(attempts, 'a@b.com', now);
    }
    expect(getLockoutRemainingMs(attempts, 'a@b.com', now)).toBe(0);
  });

  it('locks out exactly at the threshold, for LOGIN_LOCKOUT_MS', () => {
    let attempts = {};
    for (let i = 0; i < LOGIN_LOCKOUT_THRESHOLD; i++) {
      attempts = recordFailedLogin(attempts, 'a@b.com', now);
    }
    expect(getLockoutRemainingMs(attempts, 'a@b.com', now)).toBe(LOGIN_LOCKOUT_MS);
    // still locked out just before expiry
    expect(getLockoutRemainingMs(attempts, 'a@b.com', now + LOGIN_LOCKOUT_MS - 1)).toBe(1);
    // unlocked once the window passes
    expect(getLockoutRemainingMs(attempts, 'a@b.com', now + LOGIN_LOCKOUT_MS)).toBe(0);
  });

  it('is case/whitespace-insensitive on the email key', () => {
    let attempts = {};
    for (let i = 0; i < LOGIN_LOCKOUT_THRESHOLD; i++) {
      attempts = recordFailedLogin(attempts, '  A@B.com', now);
    }
    expect(getLockoutRemainingMs(attempts, 'a@b.com  ', now)).toBe(LOGIN_LOCKOUT_MS);
  });

  it('tracks separate emails independently', () => {
    let attempts = {};
    for (let i = 0; i < LOGIN_LOCKOUT_THRESHOLD; i++) {
      attempts = recordFailedLogin(attempts, 'locked@b.com', now);
    }
    attempts = recordFailedLogin(attempts, 'other@b.com', now);
    expect(getLockoutRemainingMs(attempts, 'locked@b.com', now)).toBe(LOGIN_LOCKOUT_MS);
    expect(getLockoutRemainingMs(attempts, 'other@b.com', now)).toBe(0);
  });

  it('clearLoginAttempts removes only the given email and is a no-op if absent', () => {
    let attempts = recordFailedLogin({}, 'a@b.com', now);
    attempts = recordFailedLogin(attempts, 'c@d.com', now);
    const cleared = clearLoginAttempts(attempts, 'a@b.com');
    expect(cleared['a@b.com']).toBeUndefined();
    expect(cleared['c@d.com']).toBeDefined();
    expect(clearLoginAttempts({}, 'nobody@x.com')).toEqual({});
  });
});
