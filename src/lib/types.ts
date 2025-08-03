export type Category = 
  | 'Food' 
  | 'Transport' 
  | 'Utilities' 
  | 'Rent' 
  | 'Entertainment' 
  | 'Health' 
  | 'Shopping' 
  | 'Other';

export const incomeCategory = 'Income';
export type IncomeCategory = typeof incomeCategory;

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
  category: Category;
  amount: number;
}
