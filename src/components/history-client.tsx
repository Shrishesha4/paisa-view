"use client";

import * as React from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Expense, Income } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

type Transaction = (Expense | Income) & { type: 'income' | 'expense' };

export function HistoryClient() {
  const [expenses] = useLocalStorage<Expense[]>("expenses", []);
  const [income] = useLocalStorage<Income[]>("income", []);
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const transactions: Transaction[] = React.useMemo(() => [
    ...income.map(i => ({ ...i, type: 'income' as const })),
    ...expenses.map(e => ({ ...e, type: 'expense' as const }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [income, expenses]);

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

  const groupedTransactions = React.useMemo(() => {
    return transactions.reduce((acc, transaction) => {
        const date = formatDate(transaction.date);
        if (!acc[date]) {
            acc[date] = {
                transactions: [],
                totalCredit: 0,
                totalDebit: 0,
            };
        }
        acc[date].transactions.push(transaction);
        if (transaction.type === 'income') {
            acc[date].totalCredit += transaction.amount;
        } else {
            acc[date].totalDebit += transaction.amount;
        }
        return acc;
    }, {} as Record<string, { transactions: Transaction[], totalCredit: number, totalDebit: number }>);
  }, [transactions]);

  const renderContent = () => {
    if (!isClient) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      );
    }
    if (transactions.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-10">No transactions yet. Start by adding some income or expenses.</div>
      );
    }
    return (
      <Accordion type="single" collapsible className="w-full">
        {Object.entries(groupedTransactions).map(([date, { transactions: dailyTransactions, totalCredit, totalDebit }], index) => (
           <AccordionItem value={`item-${index}`} key={date}>
             <AccordionTrigger>
               <div className="flex justify-between w-full pr-4">
                 <div className="text-left">
                   <div className="font-semibold">{date}</div>
                   <div className="text-xs text-muted-foreground">
                    {dailyTransactions.length} transaction(s)
                   </div>
                 </div>
                 <div className="text-right">
                    <div className="font-semibold text-success">{formatCurrency(totalCredit)}</div>
                    <div className="text-xs text-destructive">{formatCurrency(totalDebit)}</div>
                 </div>
               </div>
             </AccordionTrigger>
             <AccordionContent>
               <Table>
                  <TableHeader className="hidden md:table-header-group">
                  <TableRow>
                      <TableHead className="w-[60px]">S.No</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Credit (INR)</TableHead>
                      <TableHead className="text-right">Debit (INR)</TableHead>
                  </TableRow>
                  </TableHeader>
                  <TableBody>
                  {dailyTransactions.map((transaction, index) => (
                    <React.Fragment key={transaction.id}>
                      {/* Mobile Row */}
                      <TableRow className="md:hidden border-b">
                          <TableCell colSpan={2}>
                            <div className="font-medium">{transaction.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatTime(transaction.date)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {transaction.type === 'income' ?
                              <div className={cn("font-semibold", 'text-success')}>{formatCurrency(transaction.amount)}</div> :
                              <div className={cn("font-semibold", 'text-destructive')}>{formatCurrency(transaction.amount)}</div>
                            }
                          </TableCell>
                      </TableRow>

                      {/* Desktop Row */}
                      <TableRow className="hidden md:table-row">
                          <TableCell>{dailyTransactions.length - index}</TableCell>
                          <TableCell>{formatTime(transaction.date)}</TableCell>
                          <TableCell className="font-medium">{transaction.description}</TableCell>
                          <TableCell className={cn("text-right font-semibold", 'text-success')}>
                              {transaction.type === 'income' ? formatCurrency(transaction.amount) : '-'}
                          </TableCell>
                          <TableCell className={cn("text-right font-semibold", 'text-destructive')}>
                              {transaction.type === 'expense' ? formatCurrency(transaction.amount) : '-'}
                          </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                  </TableBody>
              </Table>
             </AccordionContent>
           </AccordionItem>
        ))}
      </Accordion>
    );
  }

  return (
     <div className="flex-1 flex flex-col bg-background p-4 md:p-6">
        <header className="mb-4 flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Transaction History</h1>
              <p className="text-muted-foreground">A detailed log of all your income and expenses.</p>
            </div>
        </header>
        <main className="flex-1">
            <Card>
                <CardContent className="pt-6">
                    {renderContent()}
                </CardContent>
            </Card>
        </main>
     </div>
  );
}
