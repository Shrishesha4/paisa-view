
"use client";

import { useState, useMemo, useEffect } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Expense, Income, Budget } from "@/lib/types";
import { INCOME_CATEGORY } from "@/lib/constants";
import { AddExpenseDialog } from "./dialogs/add-expense-dialog";
import { AddIncomeDialog } from "./dialogs/add-income-dialog";
import { SetBudgetDialog } from "./dialogs/set-budget-dialog";
import { DashboardHeader } from "./dashboard-header";
import { SummaryCards } from "./summary-cards";
import { ExpensePieChart } from "./expense-pie-chart";
import { RecentTransactions } from "./recent-transactions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AiAssistant } from "./ai-assistant";

export function DashboardClient() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useLocalStorage<Expense[]>("expenses", []);
  const [income, setIncome] = useLocalStorage<Income[]>("income", []);
  const [budget, setBudget] = useLocalStorage<Budget>("budget", { amount: 1000 });
  
  const [isAddExpenseOpen, setAddExpenseOpen] = useState(false);
  const [isAddIncomeOpen, setAddIncomeOpen] = useState(false);
  const [isSetBudgetOpen, setSetBudgetOpen] = useState(false);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAddExpense = (expense: Omit<Expense, "id">) => {
    setExpenses([...expenses, { ...expense, id: crypto.randomUUID(), date: new Date().toISOString() }]);
    toast({ title: "Expense Added", description: "Your expense has been successfully recorded." });
  };

  const handleAddIncome = (newIncome: Omit<Income, "id" | "category" | "date">) => {
    setIncome([...income, { ...newIncome, id: crypto.randomUUID(), category: INCOME_CATEGORY, date: new Date().toISOString() }]);
    toast({ title: "Income Added", description: "Your income has been successfully recorded." });
  };

  const handleSetBudget = (newBudget: Budget) => {
    setBudget(newBudget);
    toast({ title: "Budget Updated", description: "Your monthly budget has been set." });
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
        <DashboardHeader onSetBudget={() => setSetBudgetOpen(true)} />
        <main className="flex-1 overflow-y-auto pb-28">
          <SummaryCards
            isClient={isClient}
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            savings={savings}
          />
          <div className="grid gap-4 md:gap-6 p-4 md:p-6 grid-cols-1 lg:grid-cols-3">
            <ExpensePieChart isClient={isClient} expenses={expenses} />
            <AiAssistant expenses={expenses} income={income} />
            <RecentTransactions isClient={isClient} expenses={expenses} income={income} />
          </div>
        </main>
      </div>

       <div className="fixed bottom-0 left-0 right-0 z-10 p-4 md:hidden">
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none"></div>
        <div className="relative grid grid-cols-2 gap-2">
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
       <SetBudgetDialog
        isOpen={isSetBudgetOpen}
        onClose={() => setSetBudgetOpen(false)}
        onSetBudget={handleSetBudget}
        currentBudget={budget}
      />
    </>
  );
}
