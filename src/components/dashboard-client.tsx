
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

  const handleExportData = () => {
    const dataToExport = {
      expenses,
      income,
      budget,
    };
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `paisa-view-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Data Exported", description: "Your data has been successfully exported." });
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          const importedData = JSON.parse(result);
          if (importedData.expenses && importedData.income && importedData.budget) {
            setExpenses(importedData.expenses);
            setIncome(importedData.income);
            setBudget(importedData.budget);
            toast({ title: "Data Imported", description: "Your data has been successfully imported." });
          } else {
            toast({ variant: "destructive", title: "Invalid File", description: "The selected file has an invalid format." });
          }
        } catch (error) {
          toast({ variant: "destructive", title: "Import Failed", description: "There was an error importing your data." });
        }
      };
      reader.readAsText(file);
    }
  };

  const { totalIncome, totalExpenses, savings } = useMemo(() => {
    const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const savings = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, savings };
  }, [income, expenses]);

  return (
    <>
      <div className="flex-1 flex flex-col bg-background container mx-auto">
        <DashboardHeader
          onSetBudget={() => setSetBudgetOpen(true)}
          onAddExpense={() => setAddExpenseOpen(true)}
          onAddIncome={() => setAddIncomeOpen(true)}
          onExport={handleExportData}
          onImport={handleImportData}
        />
        <main className="flex-1 space-y-4 md:space-y-6">
            <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-3">
                <SummaryCards
                    isClient={isClient}
                    totalIncome={totalIncome}
                    totalExpenses={totalExpenses}
                    savings={savings}
                />
            </div>
            <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-5">
                <div className="lg:col-span-3">
                    <ExpensePieChart isClient={isClient} expenses={expenses} />
                </div>
                <div className="lg:col-span-2">
                    <RecentTransactions isClient={isClient} expenses={expenses} income={income} />
                </div>
            </div>
        </main>
      </div>

       <div className="fixed bottom-20 left-0 right-0 z-10 p-4 md:hidden">
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
