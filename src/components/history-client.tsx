
"use client";

import * as React from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Expense, Income } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, capitalize } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "./ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { batchCategorizeExpenses } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";

type Transaction = (Expense | Income) & { type: 'income' | 'expense' };

export function HistoryClient() {
  const [expenses, setExpenses] = useLocalStorage<Expense[]>("expenses", []);
  const [income, setIncome] = useLocalStorage<Income[]>("income", []);
  const [isClient, setIsClient] = React.useState(false);
  const [isCategorizing, setIsCategorizing] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const transactions: Transaction[] = React.useMemo(() => [
    ...income.map(i => ({ ...i, type: 'income' as const })),
    ...expenses.map(e => ({ ...e, category: capitalize(e.category), type: 'expense' as const }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [income, expenses]);

  const handleBatchCategorize = async () => {
    setIsCategorizing(true);
    
    const expensesBefore = JSON.parse(JSON.stringify(expenses));

    const result = await batchCategorizeExpenses(expenses);

    if (result.success && result.data) {
        setExpenses(result.data);

        let categorizedCount = 0;
        result.data.forEach(newExpense => {
            const oldExpense = expensesBefore.find((old: Expense) => old.id === newExpense.id);
            if (oldExpense && capitalize(oldExpense.category) !== capitalize(newExpense.category)) {
                categorizedCount++;
            }
        });

        toast({
            title: "Categorization Complete",
            description: `Successfully categorized ${categorizedCount} expense(s).`,
        });
    } else {
        toast({
            variant: "destructive",
            title: "Categorization Failed",
            description: result.error || "An unknown error occurred.",
        });
    }
    setIsCategorizing(false);
};
  
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

  const groupedTransactionsByDay = React.useMemo(() => {
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

  const groupedTransactionsByMonth = React.useMemo(() => {
    return transactions.reduce((acc, transaction) => {
        const month = new Date(transaction.date).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
        if (!acc[month]) {
            acc[month] = {
                transactions: [],
                totalCredit: 0,
                totalDebit: 0,
            };
        }
        acc[month].transactions.push(transaction);
        if (transaction.type === 'income') {
            acc[month].totalCredit += transaction.amount;
        } else {
            acc[month].totalDebit += transaction.amount;
        }
        return acc;
    }, {} as Record<string, { transactions: Transaction[], totalCredit: number, totalDebit: number }>);
  }, [transactions]);


  const renderTransactionAccordion = (
      groupedData: Record<string, { transactions: Transaction[], totalCredit: number, totalDebit: number }>,
      groupBy: "day" | "month"
    ) => {
      if (Object.keys(groupedData).length === 0) {
        return <div className="text-center text-muted-foreground py-10">No transactions yet. Start by adding some income or expenses.</div>;
      }
  
      return (
        <Accordion type="single" collapsible className="w-full">
          {Object.entries(groupedData).map(([groupKey, { transactions: dailyTransactions, totalCredit, totalDebit }], index) => {
            const netAmount = totalCredit - totalDebit;
            const isSavings = netAmount >= 0;
            return (
              <AccordionItem value={`item-${index}`} key={groupKey}>
                <AccordionTrigger>
                  <div className="flex justify-between w-full pr-4">
                    <div className="text-left">
                      <div className="font-semibold">{groupKey}</div>
                      <div className="text-xs text-muted-foreground">
                        {dailyTransactions.length} transaction(s)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn("font-semibold", isSavings ? 'text-success' : 'text-destructive')}>
                        {isSavings ? '+' : ''}{formatCurrency(netAmount)}
                      </div>
                      <div className="text-xs text-muted-foreground">{isSavings ? 'Saved' : 'Overspent'}</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader className="hidden md:table-header-group">
                      <TableRow>
                        <TableHead className="w-[60px]">S.No</TableHead>
                        <TableHead>{groupBy === 'day' ? "Time" : "Date"}</TableHead>
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
                                {groupBy === 'day' ? formatTime(transaction.date) : formatDate(transaction.date)}
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
                            <TableCell>{groupBy === 'day' ? formatTime(transaction.date) : formatDate(transaction.date)}</TableCell>
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
            );
          })}
        </Accordion>
      );
    };

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
        <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="daily">Daily View</TabsTrigger>
                <TabsTrigger value="monthly">Monthly View</TabsTrigger>
            </TabsList>
            <TabsContent value="daily">
                {renderTransactionAccordion(groupedTransactionsByDay, "day")}
            </TabsContent>
            <TabsContent value="monthly">
                {renderTransactionAccordion(groupedTransactionsByMonth, "month")}
            </TabsContent>
        </Tabs>
    );
  }

  return (
     <div className="flex-1 flex flex-col bg-background p-4 md:p-6">
        <header className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Transaction History</h1>
              <p className="text-muted-foreground">A detailed log of all your income and expenses.</p>
            </div>
          </div>
          <Button
            onClick={handleBatchCategorize}
            disabled={isCategorizing}
            size="sm"
            variant="outline"
          >
            {isCategorizing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Categorize with AI
          </Button>
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
