'use client';

import { useState } from 'react';
import { generateUsageReport, type GenerateUsageReportOutput } from '@/ai/flows/generate-usage-reports';

import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

export default function ReportClient() {
  const [report, setReport] = useState<GenerateUsageReportOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setReport(null);
    try {
      const result = await generateUsageReport({});
      setReport(result);
    } catch (error) {
      console.error('Failed to generate report:', error);
      // You could add a toast notification here to inform the user of the error.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Button onClick={handleGenerateReport} disabled={isLoading}>
          <Wand2 className="mr-2 h-4 w-4" />
          {isLoading ? 'Generating...' : 'Generate Usage Report'}
        </Button>
      </div>
      {isLoading && (
        <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[500px]" />
            <Skeleton className="h-4 w-[450px]" />
            <Skeleton className="h-4 w-[300px]" />
        </div>
      )}
      {report && (
        <div>
          <pre className="mt-2 w-full rounded-md bg-card p-4 border text-sm font-code whitespace-pre-wrap">
            {report.report}
          </pre>
        </div>
      )}
    </div>
  );
}
