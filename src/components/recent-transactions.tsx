
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Expense, Income } from "@/lib/types";
import { getCategoryIcon } from "@/lib/constants";
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { cn, capitalize } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";

type Transaction = (Expense | Income) & { type: 'income' | 'expense' };

type RecentTransactionsProps = {
  isClient: boolean;
  expenses: Expense[];
  income: Income[];
};

export function RecentTransactions({ isClient, expenses, income }: RecentTransactionsProps) {
  const transactions: Transaction[] = [
    ...income.map(i => ({ ...i, type: 'income' as const })),
    ...expenses.map(e => ({ ...e, type: 'expense' as const }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const renderContent = () => {
    if (!isClient) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        )
    }

    if (transactions.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-10">No transactions yet.</div>
        )
    }
    
    return (
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            const category = transaction.type === 'expense' ? capitalize(transaction.category) : transaction.category;
            const Icon = getCategoryIcon(category);
            return (
              <TableRow key={transaction.id}>
                <TableCell>
                  {transaction.type === 'income' ? 
                    <ArrowUpCircle className="h-5 w-5 text-success"/> : 
                    <ArrowDownCircle className="h-5 w-5 text-destructive"/>
                  }
                </TableCell>
                <TableCell className="font-medium">{transaction.description}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="flex items-center w-fit">
                    <Icon className="mr-1 h-3 w-3" />
                    {category}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(transaction.date)}</TableCell>
                <TableCell className={cn('text-right font-semibold', transaction.type === 'income' ? 'text-success' : 'text-destructive')}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    )

  }

  return (
    <Card className="col-span-1 lg:col-span-3">
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Your last 10 transactions.</CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
