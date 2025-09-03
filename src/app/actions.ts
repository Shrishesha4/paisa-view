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
    try {
        const existingCategories = [...new Set(expenses.map(e => capitalize(e.category)).filter(c => c.toLowerCase() !== 'other'))];
        
        const expensesToCategorize = expenses.filter(e => {
            const description = e.description?.trim();
            const category = e.category?.toLowerCase();
            return description && description !== 'N/A' && category === 'other';
        });
        
        if (expensesToCategorize.length === 0) {
            return { success: true, data: expenses };
        }

        const categorizationPromises = expensesToCategorize.map(async (expense) => {
            const newCategory = await categorizeExpense({ description: expense.description, existingCategories });
            return { ...expense, category: newCategory };
        });

        const categorizedExpenses = await Promise.all(categorizationPromises);

        const updatedExpenses = expenses.map(originalExpense => {
            const categorizedVersion = categorizedExpenses.find(e => e.id === originalExpense.id);
            return categorizedVersion || originalExpense;
        });

        return { success: true, data: updatedExpenses };
    } catch (error) {
        console.error('Error batch categorizing expenses:', error);
        return { success: false, error: 'Failed to categorize expenses.' };
    }
}
