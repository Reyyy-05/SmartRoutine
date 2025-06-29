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

const ProductivityInsightsOutputSchema = z.object({
  insights: z.array(z.string()).describe('Array of productivity insights and suggestions.'),
});

export type ProductivityInsightsOutput = z.infer<typeof ProductivityInsightsOutputSchema>;

export async function getProductivityInsights(input: ProductivityInsightsInput): Promise<ProductivityInsightsOutput> {
  return productivityInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'productivityInsightsPrompt',
  input: {schema: ProductivityInsightsInputSchema},
  output: {schema: ProductivityInsightsOutputSchema},
  prompt: `You are a productivity expert providing insights based on user activity data.

  Analyze the following activity history and provide personalized insights and suggestions to improve the user's routines.
  Focus on consistency, balance across activity types, and sleep patterns if data is available.

  Activity History:
  {{#each activityHistory}}
  - Activity: {{activityName}}, Type: {{activityType}}, Duration: {{durationMinutes}} minutes, CreatedAt: {{createdAt}}
  {{/each}}

  Insights & Suggestions:
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
