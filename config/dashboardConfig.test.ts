import { describe, it, expect } from 'vitest';
import {
    resolveCategoryLabel,
    CATEGORIES,
    CATEGORY_LIST,
    CATEGORY_MAP,
    CATEGORY_ALIASES,
    CATEGORY_PATTERNS,
} from '@/config/dashboardConfig';

describe('resolveCategoryLabel', () => {
    it('matches a canonical label exactly (case-insensitive)', () => {
        expect(resolveCategoryLabel('Projektmanagement')).toBe(CATEGORIES.PROJEKTMANAGEMENT);
        expect(resolveCategoryLabel('projektmanagement')).toBe(CATEGORIES.PROJEKTMANAGEMENT);
        expect(resolveCategoryLabel('ARCHITEKTUR & DESIGN')).toBe(CATEGORIES.ARCHITEKTUR_DESIGN);
    });

    it('strips a namespace:: prefix before matching', () => {
        expect(resolveCategoryLabel('category::project-management')).toBe(CATEGORIES.PROJEKTMANAGEMENT);
        expect(resolveCategoryLabel('type::Implementierung')).toBe(CATEGORIES.IMPLEMENTIERUNG);
    });

    it('handles multi-segment namespaces (join after first ::)', () => {
        // "a::b::requirements" -> stripped "b::requirements" won't exact-match,
        // but regex fallback on "requirements" should still catch it via original.
        expect(resolveCategoryLabel('ns::requirements')).toBe(CATEGORIES.REQUIREMENTS_ENGINEERING);
    });

    it('resolves exact-match aliases', () => {
        expect(resolveCategoryLabel('architecture')).toBe(CATEGORIES.ARCHITEKTUR_DESIGN);
        expect(resolveCategoryLabel('implementation')).toBe(CATEGORIES.IMPLEMENTIERUNG);
        expect(resolveCategoryLabel('project-management')).toBe(CATEGORIES.PROJEKTMANAGEMENT);
        expect(resolveCategoryLabel('requirements')).toBe(CATEGORIES.REQUIREMENTS_ENGINEERING);
    });

    it('resolves aliases case-insensitively', () => {
        expect(resolveCategoryLabel('Architecture')).toBe(CATEGORIES.ARCHITEKTUR_DESIGN);
    });

    it('falls back to regex patterns', () => {
        expect(resolveCategoryLabel('sprint')).toBe(CATEGORIES.PROJEKTMANAGEMENT);
        expect(resolveCategoryLabel('use-case')).toBe(CATEGORIES.REQUIREMENTS_ENGINEERING);
        expect(resolveCategoryLabel('backend')).toBe(CATEGORIES.IMPLEMENTIERUNG);
        expect(resolveCategoryLabel('erd')).toBe(CATEGORIES.ARCHITEKTUR_DESIGN);
    });

    it('returns null for an unrelated label', () => {
        expect(resolveCategoryLabel('bug')).toBeNull();
        expect(resolveCategoryLabel('')).toBeNull();
        expect(resolveCategoryLabel('zzzz-nonsense')).toBeNull();
    });

    it('respects pattern order (first match wins)', () => {
        // "management" is in the PM pattern; ensure it resolves to PM, not something later.
        expect(resolveCategoryLabel('management')).toBe(CATEGORIES.PROJEKTMANAGEMENT);
    });
});

describe('category config consistency', () => {
    it('CATEGORY_LIST contains exactly the four canonical categories', () => {
        expect(CATEGORY_LIST).toHaveLength(4);
        expect(CATEGORY_LIST).toEqual(Object.values(CATEGORIES));
    });

    it('CATEGORY_MAP seeds every category to 0', () => {
        for (const c of CATEGORY_LIST) {
            expect(CATEGORY_MAP[c as keyof typeof CATEGORY_MAP]).toBe(0);
        }
    });

    it('every alias target is a canonical category', () => {
        for (const target of Object.values(CATEGORY_ALIASES)) {
            expect(CATEGORY_LIST).toContain(target);
        }
    });

    it('every pattern category is a canonical category', () => {
        for (const p of CATEGORY_PATTERNS) {
            expect(CATEGORY_LIST).toContain(p.category);
        }
    });
});
