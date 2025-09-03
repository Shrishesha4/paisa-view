
'use server';

import { suggestSavings } from '@/ai/flows/suggestSavings';
import type { Expense, Income } from '@/lib/types';

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
