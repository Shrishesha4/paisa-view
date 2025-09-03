
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Settings, Download, Upload, Landmark, PlusCircle } from "lucide-react";

type DashboardHeaderProps = {
  onSetBudget: () => void;
  onAddExpense: () => void;
  onAddIncome: () => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function DashboardHeader({ onSetBudget, onAddExpense, onAddIncome, onExport, onImport }: DashboardHeaderProps) {
  const importInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  return (
    <div className="flex items-center justify-between p-4 md:p-6">
      <div className="flex items-center gap-2">
         <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
      </div>
       <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2">
            <Button onClick={onAddExpense}><PlusCircle /> Expense</Button>
            <Button onClick={onAddIncome} variant="secondary">Add Income</Button>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
                <span className="sr-only">Settings</span>
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onSetBudget}>
                <Landmark className="mr-2 h-4 w-4" />
                <span>Set Budget</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExport}>
                <Download className="mr-2 h-4 w-4" />
                <span>Export Data</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleImportClick}>
                <Upload className="mr-2 h-4 w-4" />
                <span>Import Data</span>
            </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
       </div>
      <input
        type="file"
        ref={importInputRef}
        className="hidden"
        accept=".json"
        onChange={onImport}
      />
    </div>
  );
}
