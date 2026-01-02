'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating food usage reports based on historical data to minimize waste.
 *
 * - generateUsageReport - A function that generates a report on food usage predictions.
 * - GenerateUsageReportInput - The input type for the generateUsageReport function (empty).
 * - GenerateUsageReportOutput - The return type for the generateUsageReport function (string report).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateUsageReportInputSchema = z.object({});
export type GenerateUsageReportInput = z.infer<typeof GenerateUsageReportInputSchema>;

const GenerateUsageReportOutputSchema = z.object({
  report: z.string().describe('A detailed report on predicted food usage and inventory optimization strategies.'),
});
export type GenerateUsageReportOutput = z.infer<typeof GenerateUsageReportOutputSchema>;

export async function generateUsageReport(input: GenerateUsageReportInput): Promise<GenerateUsageReportOutput> {
  return generateUsageReportFlow(input);
}

const generateUsageReportPrompt = ai.definePrompt({
  name: 'generateUsageReportPrompt',
  input: {schema: GenerateUsageReportInputSchema},
  output: {schema: GenerateUsageReportOutputSchema},
  prompt: `You are an expert gym buffet manager assistant. Analyze historical data to predict food usage and suggest inventory optimization strategies to minimize waste. Consider factors like day of the week, time of day, and seasonal trends.  Provide a detailed report.\n\n  Report: `,
});

const generateUsageReportFlow = ai.defineFlow(
  {
    name: 'generateUsageReportFlow',
    inputSchema: GenerateUsageReportInputSchema,
    outputSchema: GenerateUsageReportOutputSchema,
  },
  async input => {
    const {output} = await generateUsageReportPrompt(input);
    return output!;
  }
);
