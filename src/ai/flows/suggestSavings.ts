'use server';
/**
 * @fileOverview A flow for suggesting savings tips.
 *
 * - suggestSavings - A function that suggests savings tips based on income and expenses.
 * - SuggestSavingsInput - The input type for the suggestSavings function.
 * - SuggestSavingsOutput - The return type for the suggestSavings function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';

const SuggestSavingsInputSchema = z.object({
  expenses: z
    .array(z.object({category: z.string(), amount: z.number()}))
    .describe('A list of expenses with their category and amount.'),
  income: z.number().describe('The total monthly income.'),
});
export type SuggestSavingsInput = z.infer<typeof SuggestSavingsInputSchema>;

const SuggestSavingsOutputSchema = z
  .string()
  .describe('Three personalized, actionable, and encouraging savings tips.');
export type SuggestSavingsOutput = z.infer<typeof SuggestSavingsOutputSchema>;

export async function suggestSavings(
  input: SuggestSavingsInput
): Promise<SuggestSavingsOutput> {
  return suggestSavingsFlow(input);
}

const सझावPrompt = ai.definePrompt({
  name: 'suggestSavingsPrompt',
  input: {schema: SuggestSavingsInputSchema},
  output: {schema: SuggestSavingsOutputSchema},
  prompt: `
      Given the following financial data for a user:
      - Monthly Income: {{{income}}}
      - Total Monthly Expenses: {{#expenses}}{{amount}}{{/expenses}}
      - Expenses by category: {{#expenses}}{{category}}: {{amount}}{{/expenses}}

      Provide three personalized, actionable, and encouraging savings tips for this user.
      The user is looking for practical advice. Format the output as a single string with each tip on a new line, starting with a dash.
      Do not include a header or any text other than the three tips.
      Example:
      - Tip 1...
      - Tip 2...
      - Tip 3...
    `,
});

const suggestSavingsFlow = ai.defineFlow(
  {
    name: 'suggestSavingsFlow',
    inputSchema: SuggestSavingsInputSchema,
    outputSchema: SuggestSavingsOutputSchema,
  },
  async (input: SuggestSavingsInput) => {
    const {output} = await सझावPrompt(input);
    return output!;
  }
);
