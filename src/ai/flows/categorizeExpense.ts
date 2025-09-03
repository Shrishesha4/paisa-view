'use server';
/**
 * @fileOverview A flow for categorizing expenses.
 *
 * - categorizeExpense - A function that suggests a category for an expense based on its description.
 * - CategorizeExpenseInput - The input type for the categorizeExpense function.
 * - CategorizeExpenseOutput - The return type for the categorizeExpense function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';

const CategorizeExpenseInputSchema = z.object({
  description: z.string().describe('The description of the expense.'),
  existingCategories: z.array(z.string()).describe('A list of existing categories to choose from.'),
});
export type CategorizeExpenseInput = z.infer<
  typeof CategorizeExpenseInputSchema
>;

const CategorizeExpenseOutputSchema = z
  .string()
  .describe(
    'A single, appropriate category for the expense. Choose from the list of existing categories if one fits. Otherwise, use a common category like Food, Transport, Shopping, Utilities, Entertainment, Health, or Other.'
  );
export type CategorizeExpenseOutput = z.infer<
  typeof CategorizeExpenseOutputSchema
>;

export async function categorizeExpense(
  input: CategorizeExpenseInput
): Promise<CategorizeExpenseOutput> {
  return categorizeExpenseFlow(input);
}

const categorizeExpensePrompt = ai.definePrompt({
  name: 'categorizeExpensePrompt',
  input: {schema: CategorizeExpenseInputSchema},
  output: {schema: CategorizeExpenseOutputSchema},
  prompt: `
      You are an expert at categorizing financial expenses.
      Based on the expense description, suggest the most appropriate category.

      Expense Description: {{{description}}}

      You can use one of the following existing categories if it's a good fit:
      {{#each existingCategories}}
      - {{{this}}}
      {{/each}}

      If none of the existing categories match well, choose one from this list: Food, Transport, Shopping, Utilities, Entertainment, Health, Rent, Other.
      If the description is empty, not descriptive enough, or you cannot determine a clear category, respond with "Other".
      Respond with only the category name.
    `,
});

const categorizeExpenseFlow = ai.defineFlow(
  {
    name: 'categorizeExpenseFlow',
    inputSchema: CategorizeExpenseInputSchema,
    outputSchema: CategorizeExpenseOutputSchema,
  },
  async (input: CategorizeExpenseInput) => {
    if (!input.description?.trim()) {
      return 'Other';
    }
    const {output} = await categorizeExpensePrompt(input);
    return output!;
  }
);
