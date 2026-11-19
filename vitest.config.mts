import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
    plugins: [react()],
    css: { postcss: { plugins: [] } },
    resolve: {
        alias: { '@': root },
    },
    test: {
        environment: 'node',
        globals: true,
        setupFiles: ['test/setup.ts'],
        include: ['**/*.test.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            // Only the files we deliberately test count toward the gate.
            include: [
                'lib/processData.ts',
                'lib/gamification.ts',
                'lib/auth.ts',
                'lib/auth-edge.ts',
                'lib/utils.ts',
                'lib/gitlab.ts',
                'lib/generateReport.ts',
                'config/dashboardConfig.ts',
                'app/api/status/route.ts',
                'components/MilestoneGanttView.tsx',
                'components/GanttView.tsx',
                'components/EpicGraph.tsx',
                'components/DateFilterBar.tsx',
                'components/SystemStatus.tsx',
            ],
            thresholds: {
                perFile: true,
                // Pure logic — full coverage expected.
                'lib/processData.ts': { lines: 100, functions: 100, statements: 100, branches: 95 },
                'lib/gamification.ts': { lines: 100, functions: 100, statements: 100, branches: 95 },
                'lib/auth.ts': { lines: 100, functions: 100, statements: 100, branches: 90 },
                'lib/auth-edge.ts': { lines: 100, functions: 100, statements: 100, branches: 90 },
                'lib/utils.ts': { lines: 100, functions: 100, statements: 100, branches: 100 },
                'lib/gitlab.ts': { lines: 90, functions: 100, statements: 90, branches: 80 },
                'lib/generateReport.ts': { lines: 85, functions: 100, statements: 85, branches: 70 },
                'config/dashboardConfig.ts': { lines: 100, functions: 100, statements: 100, branches: 95 },
                'app/api/status/route.ts': { lines: 100, functions: 100, statements: 100, branches: 90 },
                // Components — SVG/markup branches are not all meaningfully reachable.
                'components/MilestoneGanttView.tsx': { lines: 90, functions: 90, statements: 90, branches: 80 },
                'components/GanttView.tsx': { lines: 85, functions: 85, statements: 85, branches: 75 },
                'components/EpicGraph.tsx': { lines: 80, functions: 80, statements: 80, branches: 70 },
                'components/DateFilterBar.tsx': { lines: 85, functions: 85, statements: 85, branches: 75 },
                'components/SystemStatus.tsx': { lines: 85, functions: 85, statements: 85, branches: 75 },
            },
        },
    },
});
