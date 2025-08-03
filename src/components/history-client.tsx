"use client";

import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Expense, Income } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Transaction = (Expense | Income) & { type: 'income' | 'expense' };

export function HistoryClient() {
  const [expenses] = useLocalStorage<Expense[]>("expenses", []);
  const [income] = useLocalStorage<Income[]>("income", []);

  const transactions: Transaction[] = [
    ...income.map(i => ({ ...i, type: 'income' as const })),
    ...expenses.map(e => ({ ...e, type: 'expense' as const }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  }

  return (
     <div className="flex-1 flex flex-col bg-background p-4 md:p-6">
        <header className="mb-4">
            <h1 className="text-2xl md:text-3xl font-bold">Transaction History</h1>
            <p className="text-muted-foreground">A detailed log of all your income and expenses.</p>
        </header>
        <main className="flex-1">
            <Card>
                <CardContent className="pt-6">
                    {transactions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">No transactions yet. Start by adding some income or expenses.</div>
                    ) : (
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px]">S.No</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Credit (INR)</TableHead>
                            <TableHead className="text-right">Debit (INR)</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {transactions.map((transaction, index) => (
                            <TableRow key={transaction.id}>
                                <TableCell>{transactions.length - index}</TableCell>
                                <TableCell>{formatDate(transaction.date)}</TableCell>
                                <TableCell>{formatTime(transaction.date)}</TableCell>
                                <TableCell className="font-medium">{transaction.description}</TableCell>
                                <TableCell className={cn("text-right font-semibold", 'text-success')}>
                                    {transaction.type === 'income' ? formatCurrency(transaction.amount) : '-'}
                                </TableCell>
                                <TableCell className={cn("text-right font-semibold", 'text-destructive')}>
                                    {transaction.type === 'expense' ? formatCurrency(transaction.amount) : '-'}
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    )}
                </CardContent>
            </Card>
        </main>
     </div>
  );
}
