'use server';

/**
 * @fileOverview Provides personalized productivity insights based on user activity data.
 *
 * - getProductivityInsights - A function that generates productivity insights for a user.
 * - ProductivityInsightsInput - The input type for the getProductivityInsights function.
 * - ProductivityInsightsOutput - The return type for the getProductivityInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProductivityInsightsInputSchema = z.object({
  userId: z.string().describe('The ID of the user.'),
  activityHistory: z.array(z.object({
    activityName: z.string(),
    activityType: z.string(),
    durationMinutes: z.number(),
    details: z.record(z.any()).optional(),
    createdAt: z.string(), // Should be ISO date string
  })).describe('The user activity history.'),
});

export type ProductivityInsightsInput = z.infer<typeof ProductivityInsightsInputSchema>;

const InsightItemSchema = z.object({
  title: z.string().describe("The title of the insight."),
  description: z.string().describe("The detailed description of the insight provided."),
});

const ProductivityInsightsOutputSchema = z.object({
  insights: z.object({
    consistency: InsightItemSchema.describe("Insight about the user's consistency in performing activities."),
    focus: InsightItemSchema.describe("Insight about the user's study/work focus patterns."),
    rest: InsightItemSchema.describe("Insight about the user's rest and break patterns."),
  }),
});

export type ProductivityInsightsOutput = z.infer<typeof ProductivityInsightsOutputSchema>;

export async function getProductivityInsights(input: ProductivityInsightsInput): Promise<ProductivityInsightsOutput> {
  return productivityInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'productivityInsightsPrompt',
  input: {schema: ProductivityInsightsInputSchema},
  output: {schema: ProductivityInsightsOutputSchema},
  prompt: `Anda adalah seorang ahli produktivitas bernama "SmartRoutine AI". Analisis riwayat aktivitas pengguna berikut dalam bahasa Indonesia dan berikan analisis cerdas yang dibagi menjadi tiga bagian: konsistensi, fokus belajar, dan waktu istirahat.

  Berikan judul dan deskripsi untuk setiap bagian. Analisis harus singkat, jelas, dan memberikan saran yang dapat ditindaklanjuti.

  Riwayat Aktivitas Pengguna:
  {{#each activityHistory}}
  - Aktivitas: {{activityName}}, Tipe: {{activityType}}, Durasi: {{durationMinutes}} menit, Detail: {{json details}}, Tanggal: {{createdAt}}
  {{/each}}
  `,
});

const productivityInsightsFlow = ai.defineFlow(
  {
    name: 'productivityInsightsFlow',
    inputSchema: ProductivityInsightsInputSchema,
    outputSchema: ProductivityInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
