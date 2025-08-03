"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type SummaryCardsProps = {
  isClient: boolean;
  totalIncome: number;
  totalExpenses: number;
  savings: number;
};

export function SummaryCards({ isClient, totalIncome, totalExpenses, savings }: SummaryCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const renderCardContent = (value: number) => {
    if (!isClient) {
      return <Skeleton className="h-8 w-3/4" />;
    }
    return <div className="text-2xl font-bold">{formatCurrency(value)}</div>;
  };
  
  const renderSavingsContent = (value: number) => {
    if (!isClient) {
      return <Skeleton className="h-8 w-3/4" />;
    }
    return (
       <div className={`text-2xl font-bold ${value < 0 ? 'text-destructive' : 'text-primary'}`}>
        {formatCurrency(value)}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 p-4 md:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          {renderCardContent(totalIncome)}
          <p className="text-xs text-muted-foreground">This month's earnings</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          {renderCardContent(totalExpenses)}
          <p className="text-xs text-muted-foreground">This month's spending</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Balance</CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          {renderSavingsContent(savings)}
          <p className="text-xs text-muted-foreground">Remaining after expenses</p>
        </CardContent>
      </Card>
    </div>
  );
}
