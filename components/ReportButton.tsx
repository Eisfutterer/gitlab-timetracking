'use client';

import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChartData } from '@/lib/processData';
import { generateReport, downloadReport } from '@/lib/generateReport';
import { useSearchParams } from 'next/navigation';

interface Props {
    data: ChartData;
}

export default function ReportButton({ data }: Props) {
    const params = useSearchParams();

    function handleDownload() {
        const from = params.get('from') ?? '2026-09-01';
        const to   = params.get('to')   ?? '2027-09-01';
        const html = generateReport(data, { from, to });
        downloadReport(html, `time-tracking-report-${from}-${to}`);
    }

    return (
        <Button variant="ghost" size="icon" onClick={handleDownload} title="Report herunterladen" aria-label="Report herunterladen">
            <FileDown className="h-4 w-4" />
        </Button>
    );
}
