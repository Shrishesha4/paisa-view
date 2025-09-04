export type Category = string;

export const INCOME_CATEGORY = 'Income';
export type IncomeCategory = typeof INCOME_CATEGORY;

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  description: string;
}

export interface Expense extends Transaction {
  category: Category;
}

export interface Income extends Transaction {
  category: IncomeCategory;
}

export interface Budget {
  id: string;
  amount: number;
}

export interface HouseholdBudget {
  id: string;
  householdId: string;
  monthlyBudget: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface BudgetGoal {
  id: string;
  householdId: string;
  title: string;
  description?: string;
  type: 'savings' | 'debt' | 'investment' | 'expense';
  targetAmount: number;
  monthlyTarget: number;
  weeklyTarget: number;
  dailyTarget: number;
  currentAmount: number;
  startDate: Date;
  targetDate?: Date;
  status: 'active' | 'completed' | 'paused';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
