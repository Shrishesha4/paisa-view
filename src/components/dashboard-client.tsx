"use client";

import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Expense, Income, Budget } from "@/lib/types";
import { CATEGORIES, INCOME_CATEGORY } from "@/lib/constants";
import { AddExpenseDialog } from "./dialogs/add-expense-dialog";
import { AddIncomeDialog } from "./dialogs/add-income-dialog";
import { SetBudgetDialog } from "./dialogs/set-budget-dialog";
import { DashboardHeader } from "./dashboard-header";
import { SummaryCards } from "./summary-cards";
import { BudgetChart } from "./budget-chart";
import { RecentTransactions } from "./recent-transactions";
import { AiAssistant } from "./ai-assistant";
import { useToast } from "@/hooks/use-toast";

export function DashboardClient() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useLocalStorage<Expense[]>("expenses", []);
  const [income, setIncome] = useLocalStorage<Income[]>("income", []);
  const [budgets, setBudgets] = useLocalStorage<Budget[]>("budgets", []);
  
  const [isAddExpenseOpen, setAddExpenseOpen] = useState(false);
  const [isAddIncomeOpen, setAddIncomeOpen] = useState(false);
  const [isSetBudgetOpen, setSetBudgetOpen] = useState(false);

  const handleAddExpense = (expense: Omit<Expense, "id">) => {
    setExpenses([...expenses, { ...expense, id: crypto.randomUUID() }]);
    toast({ title: "Expense Added", description: "Your expense has been successfully recorded." });
  };

  const handleAddIncome = (newIncome: Omit<Income, "id" | "category">) => {
    setIncome([...income, { ...newIncome, id: crypto.randomUUID(), category: INCOME_CATEGORY }]);
    toast({ title: "Income Added", description: "Your income has been successfully recorded." });
  };

  const handleSetBudgets = (newBudgets: Budget[]) => {
    setBudgets(newBudgets);
    toast({ title: "Budgets Updated", description: "Your new budget goals have been saved." });
  };

  const { totalIncome, totalExpenses, savings, budgetChartData } = useMemo(() => {
    const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const savings = totalIncome - totalExpenses;

    const expensesByCategory = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const budgetChartData = CATEGORIES.map(category => {
      const budgetAmount = budgets.find(b => b.category === category)?.amount || 0;
      const spentAmount = expensesByCategory[category] || 0;
      return {
        category,
        budget: budgetAmount,
        spent: spentAmount,
      };
    }).filter(d => d.budget > 0 || d.spent > 0);

    return { totalIncome, totalExpenses, savings, budgetChartData };
  }, [income, expenses, budgets]);

  return (
    <>
      <div className="flex-1 flex flex-col bg-background">
        <DashboardHeader
          onAddExpense={() => setAddExpenseOpen(true)}
          onAddIncome={() => setAddIncomeOpen(true)}
          onSetBudget={() => setSetBudgetOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <SummaryCards
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            savings={savings}
          />
          <div className="grid gap-4 md:gap-6 p-4 md:p-6 grid-cols-1 lg:grid-cols-3">
            <BudgetChart data={budgetChartData} />
            <AiAssistant expenses={expenses} income={income} />
            <RecentTransactions expenses={expenses} income={income} />
          </div>
        </main>
      </div>

      <AddExpenseDialog
        isOpen={isAddExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        onAddExpense={handleAddExpense}
      />
      <AddIncomeDialog
        isOpen={isAddIncomeOpen}
        onClose={() => setAddIncomeOpen(false)}
        onAddIncome={handleAddIncome}
      />
      <SetBudgetDialog
        isOpen={isSetBudgetOpen}
        onClose={() => setSetBudgetOpen(false)}
        onSetBudgets={handleSetBudgets}
        currentBudgets={budgets}
      />
    </>
  );
}
