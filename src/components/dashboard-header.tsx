
"use client";

import * as React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Settings, Download, Upload, Landmark } from "lucide-react";

type DashboardHeaderProps = {
  onSetBudget: () => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function DashboardHeader({ onSetBudget, onExport, onImport }: DashboardHeaderProps) {
  const importInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  return (
    <div className="flex items-center justify-between p-4 md:p-6">
      <div className="flex items-center gap-2">
         <SidebarTrigger className="md:hidden" />
         <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
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
