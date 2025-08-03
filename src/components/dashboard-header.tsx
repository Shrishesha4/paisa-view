"use client";

import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

type DashboardHeaderProps = {
  onAddExpense: () => void;
  onAddIncome: () => void;
  onSetBudget: () => void;
};

export function DashboardHeader({ onAddExpense, onAddIncome, onSetBudget }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
      <div className="flex gap-2">
        <Button onClick={onAddExpense}><PlusCircle className="mr-2 h-4 w-4" /> Expense</Button>
        <Button onClick={onAddIncome} variant="secondary">Income</Button>
        <Button onClick={onSetBudget} variant="outline">Budget</Button>
      </div>
    </div>
  );
}
