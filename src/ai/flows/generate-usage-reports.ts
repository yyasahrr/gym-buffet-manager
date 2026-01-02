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
  report: z.string().describe('A detailed report on predicted food usage and inventory optimization strategies in Persian.'),
});
export type GenerateUsageReportOutput = z.infer<typeof GenerateUsageReportOutputSchema>;

export async function generateUsageReport(input: GenerateUsageReportInput): Promise<GenerateUsageReportOutput> {
  return generateUsageReportFlow(input);
}

const generateUsageReportPrompt = ai.definePrompt({
  name: 'generateUsageReportPrompt',
  input: {schema: GenerateUsageReportInputSchema},
  output: {schema: GenerateUsageReportOutputSchema},
  prompt: `شما یک دستیار مدیر بوفه باشگاه متخصص هستید. داده‌های تاریخی را برای پیش‌بینی مصرف غذا تحلیل کرده و استراتژی‌های بهینه‌سازی موجودی را برای به حداقل رساندن ضایعات پیشنهاد دهید. عواملی مانند روز هفته، ساعت روز و روندهای فصلی را در نظر بگیرید. یک گزارش دقیق به زبان فارسی ارائه دهید.\n\n  گزارش: `,
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
