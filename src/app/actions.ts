'use server';

import { suggestSavings } from '@/ai/flows/suggestSavings';
import { categorizeExpense } from '@/ai/flows/categorizeExpense';
import type { Expense, Income } from '@/lib/types';
import { capitalize } from '@/lib/utils';

export async function getSavingsSuggestions(expenses: Expense[], income: Income[]) {
  try {
    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
    const expenseData = expenses.map(e => ({ category: e.category, amount: e.amount }));

    if (expenseData.length === 0 && totalIncome === 0) {
      return { success: true, data: "- Start by adding your income and first few expenses to get personalized tips!\n- Create a budget for categories like 'Food' or 'Shopping'.\n- Try setting a small savings goal for this month." };
    }

    const suggestions = await suggestSavings({
      expenses: expenseData,
      income: totalIncome,
    });
    return { success: true, data: suggestions };
  } catch (error) {
    console.error('Error getting savings suggestions:', error);
    return { success: false, error: 'Failed to get suggestions. Please try again.' };
  }
}

export async function getCategorySuggestion(description: string, existingCategories: string[]) {
    try {
        const suggestion = await categorizeExpense({ description, existingCategories });
        return { success: true, data: suggestion };
    } catch (error) {
        console.error('Error getting category suggestion:', error);
        return { success: false, error: 'Failed to get category suggestion.' };
    }
}

export async function batchCategorizeExpenses(expenses: Expense[]): Promise<{ success: boolean, data?: Expense[], error?: string }> {
    console.log('[AI Debug] Starting batch categorization...');
    try {
        const existingCategories = [...new Set(expenses.map(e => capitalize(e.category)).filter(c => c && c.toLowerCase() !== 'other'))];
        console.log('[AI Debug] Found existing categories:', existingCategories);
        
        const expensesToCategorize = expenses.filter(e => {
            const description = e.description?.trim();
            const category = e.category?.toLowerCase();
            return description && description !== 'N/A' && category === 'other';
        });
        
        console.log(`[AI Debug] Found ${expensesToCategorize.length} expenses to categorize.`);

        if (expensesToCategorize.length === 0) {
            console.log('[AI Debug] No expenses to categorize. Exiting.');
            return { success: true, data: expenses };
        }

        console.log('[AI Debug] Expenses to be sent to AI:', expensesToCategorize.map(e => ({ id: e.id, description: e.description })));

        const categorizationPromises = expensesToCategorize.map(async (expense) => {
            try {
                const newCategory = await categorizeExpense({ description: expense.description, existingCategories });
                console.log(`[AI Debug] AI suggested category '${newCategory}' for description '${expense.description}'`);
                return { ...expense, category: newCategory || 'Other' };
            } catch (err) {
                console.error(`[AI Debug] Error categorizing expense ID ${expense.id} ('${expense.description}'):`, err);
                return { ...expense, category: 'Other' }; // Default to 'Other' on individual failure
            }
        });

        const categorizedExpenses = await Promise.all(categorizationPromises);
        console.log('[AI Debug] AI processing finished. All promises resolved.');

        const updatedExpenses = expenses.map(originalExpense => {
            const categorizedVersion = categorizedExpenses.find(e => e.id === originalExpense.id);
            return categorizedVersion || originalExpense;
        });
        
        console.log('[AI Debug] Batch categorization successful.');
        return { success: true, data: updatedExpenses };
    } catch (error) {
        console.error('[AI Debug] A critical error occurred during batch categorization:', error);
        return { success: false, error: 'Failed to categorize expenses due to a critical error.' };
    }
}
