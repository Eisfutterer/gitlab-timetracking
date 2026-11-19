import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
    it('merges multiple class strings', () => {
        expect(cn('a', 'b', 'c')).toBe('a b c');
    });

    it('resolves conflicting tailwind classes (last wins)', () => {
        expect(cn('p-2 p-4')).toBe('p-4');
        expect(cn('p-2', 'p-4')).toBe('p-4');
        expect(cn('text-sm text-lg')).toBe('text-lg');
    });

    it('ignores falsy / undefined / false / null values', () => {
        expect(cn('a', undefined, false, null, '', 'b')).toBe('a b');
        expect(cn(false && 'hidden', 'block')).toBe('block');
    });

    it('supports conditional object syntax', () => {
        expect(cn('base', { active: true, disabled: false })).toBe('base active');
    });

    it('flattens arrays of class values', () => {
        expect(cn(['a', 'b'], ['c'])).toBe('a b c');
        expect(cn(['p-2', 'p-4'])).toBe('p-4');
    });

    it('returns empty string for no / only-falsy input', () => {
        expect(cn()).toBe('');
        expect(cn(false, null, undefined)).toBe('');
    });
});
