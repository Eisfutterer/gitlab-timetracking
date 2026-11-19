import { describe, it, expect } from 'vitest';
import { epicToTreeNode, layoutTree, getEpicColor } from './EpicGraph';
import { makeEpic, makeEpicIssue, labels } from '@/test/fixtures';
import { COLORS } from '@/config/dashboardConfig';

describe('getEpicColor', () => {
    it('returns the dominant category color', () => {
        const epic = makeEpic({
            issues: { nodes: [
                makeEpicIssue({ iid: '1', labels: labels('Architektur & Design') }),
                makeEpicIssue({ iid: '2', labels: labels('Architektur & Design') }),
                makeEpicIssue({ iid: '3', labels: labels('Implementierung') }),
            ] },
        });
        expect(getEpicColor(epic)).toBe(COLORS.CATEGORY['Architektur & Design']);
    });

    it('recurses into child epics for the tally', () => {
        const epic = makeEpic({
            issues: { nodes: [] },
            children: { nodes: [ makeEpic({ id: 'c', issues: { nodes: [ makeEpicIssue({ labels: labels('Projektmanagement') }) ] } }) ] },
        });
        expect(getEpicColor(epic)).toBe(COLORS.CATEGORY['Projektmanagement']);
    });

    it('falls back to a neutral color when no categories match', () => {
        expect(getEpicColor(makeEpic({ issues: { nodes: [ makeEpicIssue({ labels: labels() }) ] } }))).toBe('#94a3b8');
    });
});

describe('epicToTreeNode', () => {
    it('builds a 2-letter label from the first two words', () => {
        const node = epicToTreeNode(makeEpic({ title: 'Backend Service' }), 0);
        expect(node.label).toBe('BS');
    });

    it('builds a label from the first two characters for single-word titles', () => {
        const node = epicToTreeNode(makeEpic({ title: 'Infrastructure' }), 0);
        expect(node.label).toBe('IN');
    });

    it('merges child epics and issue children into the children array', () => {
        const epic = makeEpic({
            id: 'gid://gitlab/Epic/1',
            issues: { nodes: [
                makeEpicIssue({ iid: '1', state: 'closed' }),
                makeEpicIssue({ iid: '2', state: 'opened' }),
            ] },
            children: { nodes: [ makeEpic({ id: 'gid://gitlab/Epic/2', title: 'Child Epic' }) ] },
        });
        const node = epicToTreeNode(epic, 0);
        expect(node.isEpic).toBe(true);
        expect(node.totalIssues).toBe(2);
        expect(node.closedIssues).toBe(1);
        // first the child epic, then the 2 issues
        expect(node.children).toHaveLength(3);
        expect(node.children[0].isEpic).toBe(true);
        expect(node.children[0].depth).toBe(1);
        const issueChild = node.children.find(c => c.id === 'issue-gid://gitlab/Epic/1-1')!;
        expect(issueChild.label).toBe('#1');
        expect(issueChild.isClosed).toBe(true);
        expect(issueChild.depth).toBe(1);
    });
});

describe('layoutTree', () => {
    it('places a single collapsed node with plausible geometry', () => {
        const root = epicToTreeNode(makeEpic({ title: 'Solo Epic', issues: { nodes: [] } }), 0);
        const { nodes, width, height } = layoutTree(root, new Set());
        expect(nodes).toHaveLength(1);
        expect(nodes[0].x).toBeGreaterThan(0);
        expect(nodes[0].y).toBeGreaterThan(0);
        expect(width).toBeGreaterThan(0);
        expect(height).toBeGreaterThan(0);
    });

    it('lays children below the parent and widens the canvas when expanded', () => {
        const epic = makeEpic({
            id: 'e1',
            issues: { nodes: [ makeEpicIssue({ iid: '1' }), makeEpicIssue({ iid: '2' }) ] },
        });
        const root = epicToTreeNode(epic, 0);
        const expanded = new Set<string>(['e1']);
        const { nodes } = layoutTree(root, expanded);
        // root + 2 issue children
        expect(nodes).toHaveLength(3);
        const parent = nodes.find(n => n.node.id === 'e1')!;
        const children = nodes.filter(n => n.node.id !== 'e1');
        for (const c of children) {
            expect(c.y).toBeGreaterThan(parent.y);
        }
        // children spread horizontally — distinct x positions
        expect(children[0].x).not.toBe(children[1].x);
    });

    it('does not descend into collapsed nodes', () => {
        const epic = makeEpic({ id: 'e1', issues: { nodes: [ makeEpicIssue({ iid: '1' }) ] } });
        const root = epicToTreeNode(epic, 0);
        const { nodes } = layoutTree(root, new Set()); // nothing expanded
        expect(nodes).toHaveLength(1);
    });
});
