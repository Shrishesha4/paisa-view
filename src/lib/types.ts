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
