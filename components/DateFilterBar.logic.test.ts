import { describe, it, expect } from 'vitest';
import { isoWeek, toDateStr, buildWeekOptions, buildVlwOptions, PROJECT_START } from './DateFilterBar';

describe('toDateStr', () => {
    it('formats a Date as YYYY-MM-DD', () => {
        expect(toDateStr(new Date('2026-09-14T12:34:56Z'))).toBe('2026-09-14');
    });
});

describe('isoWeek', () => {
    it('computes known ISO weeks', () => {
        // 2026-09-14 is a Monday in ISO week 38
        expect(isoWeek(new Date('2026-09-14T00:00:00Z'))).toBe(38);
        // mid-year reference
        expect(isoWeek(new Date('2026-01-05T00:00:00Z'))).toBe(2);
    });

    it('handles the year boundary (late December belongs to week 53/1)', () => {
        // 2026-12-31 is a Thursday → ISO week 53
        expect(isoWeek(new Date('2026-12-31T00:00:00Z'))).toBe(53);
        // 2027-01-01 is a Friday → still ISO week 53 of 2026
        expect(isoWeek(new Date('2027-01-01T00:00:00Z'))).toBe(53);
    });
});

describe('buildWeekOptions', () => {
    it('starts each week on Monday and ends on Sunday', () => {
        const opts = buildWeekOptions(new Date('2026-09-14'), new Date('2026-09-27'));
        // reversed → newest first
        const oldest = opts[opts.length - 1];
        expect(oldest.from).toBe('2026-09-14'); // Monday
        expect(oldest.to).toBe('2026-09-20');   // Sunday
    });

    it('returns options in reversed (newest-first) order', () => {
        const opts = buildWeekOptions(new Date('2026-09-14'), new Date('2026-09-28'));
        const froms = opts.map(o => o.from);
        const sorted = [...froms].sort();
        expect(froms).toEqual(sorted.reverse());
    });

    it('snaps a mid-week projectStart back to the containing Monday', () => {
        // 2026-09-16 is a Wednesday → should snap back to Monday 2026-09-14
        const opts = buildWeekOptions(new Date('2026-09-16'), new Date('2026-09-20'));
        expect(opts[opts.length - 1].from).toBe('2026-09-14');
    });

    it('labels with zero-padded KW and year', () => {
        const opts = buildWeekOptions(new Date('2026-09-14'), new Date('2026-09-20'));
        expect(opts[0].label).toBe('KW 38 / 2026');
        expect(opts[0].value).toBe('2026-38');
    });
});

describe('buildVlwOptions', () => {
    it('finds the first Tuesday on/after projectStart and builds Di–Mo buckets', () => {
        // PROJECT_START = 2026-09-14 (Monday) → first Tuesday = 2026-09-15
        const opts = buildVlwOptions(PROJECT_START, new Date('2026-09-28'));
        const first = opts[opts.length - 1]; // reversed → oldest last
        expect(first.from).toBe('2026-09-15'); // Tuesday
        expect(first.to).toBe('2026-09-21');   // Monday (Di + 6)
        expect(first.value).toBe('vlw-1');
        expect(first.label).toBe('VLW 01 · Di 15.09 – Mo 21.09');
    });

    it('increments the VLW counter and reverses the order', () => {
        const opts = buildVlwOptions(PROJECT_START, new Date('2026-09-29'));
        // newest first
        expect(opts[0].value).toBe(`vlw-${opts.length}`);
        expect(opts[opts.length - 1].value).toBe('vlw-1');
    });

    it('handles a Wednesday start by advancing to the following Tuesday', () => {
        // 2026-09-16 is a Wednesday (dow=3) → daysToTue = 9-3 = 6 → 2026-09-22 (Tuesday)
        const opts = buildVlwOptions(new Date('2026-09-16'), new Date('2026-09-30'));
        expect(opts[opts.length - 1].from).toBe('2026-09-22');
    });

    it('handles a Tuesday start by using that same day', () => {
        // 2026-09-15 is a Tuesday (dow=2) → daysToTue = 0
        const opts = buildVlwOptions(new Date('2026-09-15'), new Date('2026-09-22'));
        expect(opts[opts.length - 1].from).toBe('2026-09-15');
    });
});
