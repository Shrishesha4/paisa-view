"use client";

import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Expense, Income } from "@/lib/types";
import { INCOME_CATEGORY } from "@/lib/constants";
import { AddExpenseDialog } from "./dialogs/add-expense-dialog";
import { AddIncomeDialog } from "./dialogs/add-income-dialog";
import { DashboardHeader } from "./dashboard-header";
import { SummaryCards } from "./summary-cards";
import { BudgetChart } from "./budget-chart";
import { RecentTransactions } from "./recent-transactions";
import { AiAssistant } from "./ai-assistant";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export function DashboardClient() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useLocalStorage<Expense[]>("expenses", []);
  const [income, setIncome] = useLocalStorage<Income[]>("income", []);
  
  const [isAddExpenseOpen, setAddExpenseOpen] = useState(false);
  const [isAddIncomeOpen, setAddIncomeOpen] = useState(false);

  const handleAddExpense = (expense: Omit<Expense, "id">) => {
    setExpenses([...expenses, { ...expense, id: crypto.randomUUID(), date: new Date().toISOString() }]);
    toast({ title: "Expense Added", description: "Your expense has been successfully recorded." });
  };

  const handleAddIncome = (newIncome: Omit<Income, "id" | "category" | "date">) => {
    setIncome([...income, { ...newIncome, id: crypto.randomUUID(), category: INCOME_CATEGORY, date: new Date().toISOString() }]);
    toast({ title: "Income Added", description: "Your income has been successfully recorded." });
  };

  const { totalIncome, totalExpenses, savings } = useMemo(() => {
    const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const savings = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, savings };
  }, [income, expenses]);

  return (
    <>
      <div className="flex-1 flex flex-col bg-background">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto pb-28">
          <SummaryCards
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            savings={savings}
          />
          <div className="grid gap-4 md:gap-6 p-4 md:p-6 grid-cols-1 lg:grid-cols-3">
            <BudgetChart totalIncome={totalIncome} totalExpenses={totalExpenses} />
            <AiAssistant expenses={expenses} income={income} />
            <RecentTransactions expenses={expenses} income={income} />
          </div>
        </main>
      </div>

       <div className="fixed bottom-0 left-0 right-0 z-10 p-4">
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none"></div>
        <div className="relative flex justify-center items-center gap-2">
            <Button onClick={() => setAddExpenseOpen(true)} size="lg" className="shadow-lg"><PlusCircle className="mr-2 h-4 w-4" /> Expense</Button>
            <Button onClick={() => setAddIncomeOpen(true)} variant="secondary" size="lg" className="shadow-lg">Add Income</Button>
        </div>
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
    </>
  );
}
