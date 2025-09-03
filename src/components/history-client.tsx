
"use client";

import * as React from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Expense, Income } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, capitalize } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "./ui/button";
import { Sparkles, Loader2, ArrowUpDown } from "lucide-react";
import { batchRecategorize } from "@/lib/categorization";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { getCategoryIcon } from "@/lib/constants";

type Transaction = (Expense | Income) & { type: 'income' | 'expense' };

type GroupedData = Record<string, { transactions: Transaction[], totalCredit: number, totalDebit: number }>;


export function HistoryClient() {
  const [expenses, setExpenses] = useLocalStorage<Expense[]>("expenses", []);
  const [income, setIncome] = useLocalStorage<Income[]>("income", []);
  const [isClient, setIsClient] = React.useState(false);
  const [isCategorizing, setIsCategorizing] = React.useState(false);
  const { toast } = useToast();
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const sort = searchParams.get('sort') || 'date-desc';

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', value);
    router.replace(`${pathname}?${params.toString()}`);
  }
  
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
  
  const allTransactions: Transaction[] = React.useMemo(() => {
    const combined: Transaction[] = [
      ...income.map(i => ({ ...i, type: 'income' as const })),
      ...expenses.map(e => ({ ...e, category: capitalize(e.category), type: 'expense' as const }))
    ];
    return combined.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [income, expenses]);

  const groupedTransactionsByDay = React.useMemo(() => {
    return allTransactions.reduce((acc, transaction) => {
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
    }, {} as GroupedData);
  }, [allTransactions]);

  const groupedTransactionsByMonth = React.useMemo(() => {
    return allTransactions.reduce((acc, transaction) => {
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
    }, {} as GroupedData);
  }, [allTransactions]);

  const sortedIncome: Income[] = React.useMemo(() => {
    return [...income].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [income]);


  const handleBatchCategorize = () => {
    setIsCategorizing(true);
    try {
      const { updatedExpenses, changedCount } = batchRecategorize(expenses);
      setExpenses(updatedExpenses);
      toast({
          title: "Categorization Complete",
          description: `Successfully updated ${changedCount} expense(s).`,
      });
    } catch (e) {
      console.error("Batch categorization failed:", e);
      toast({
        variant: "destructive",
        title: "Categorization Failed",
        description: "Could not recategorize your expenses.",
      });
    } finally {
      setIsCategorizing(false);
    }
  };
  

  const renderTransactionAccordion = (
      groupedData: GroupedData,
      groupBy: "day" | "month"
    ) => {
      if (Object.keys(groupedData).length === 0) {
        return <div className="text-center text-muted-foreground py-10">No transactions yet. Start by adding some income or expenses.</div>;
      }
      
      let sortedGroupKeys = Object.keys(groupedData);

      if (sort === 'saved-desc') {
        sortedGroupKeys.sort((a, b) => {
          const netA = groupedData[a].totalCredit - groupedData[a].totalDebit;
          const netB = groupedData[b].totalCredit - groupedData[b].totalDebit;
          return netB - netA;
        });
      } else if (sort === 'saved-asc') {
         sortedGroupKeys.sort((a, b) => {
          const netA = groupedData[a].totalCredit - groupedData[a].totalDebit;
          const netB = groupedData[b].totalCredit - groupedData[b].totalDebit;
          return netA - netB;
        });
      }
  
      return (
        <Accordion type="single" collapsible className="w-full">
          {sortedGroupKeys.map((groupKey, index) => {
            const { transactions: dailyTransactions, totalCredit, totalDebit } = groupedData[groupKey];
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
                         {groupBy === 'month' && ` | Total Income: ${formatCurrency(totalCredit)}`}
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

  const renderIncomeList = () => {
    if(sortedIncome.length === 0) {
        return <div className="text-center text-muted-foreground py-10">No income recorded yet.</div>;
    }

    const Icon = getCategoryIcon("Income");

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedIncome.map(item => (
                    <TableRow key={item.id}>
                        <TableCell>{formatDate(item.date)}</TableCell>
                        <TableCell className="font-medium flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {item.description}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-success">
                            {formatCurrency(item.amount)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

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
    if (allTransactions.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-10">No transactions yet. Start by adding some income or expenses.</div>
      );
    }
    return (
        <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="daily">Daily View</TabsTrigger>
                <TabsTrigger value="monthly">Monthly View</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
            <TabsContent value="daily">
                {renderTransactionAccordion(groupedTransactionsByDay, "day")}
            </TabsContent>
            <TabsContent value="monthly">
                {renderTransactionAccordion(groupedTransactionsByMonth, "month")}
            </TabsContent>
            <TabsContent value="income">
                {renderIncomeList()}
            </TabsContent>
        </Tabs>
    );
  }

  return (
     <div className="flex-1 flex flex-col bg-background p-4 md:p-6 container mx-auto">
        <header className="mb-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Transaction History</h1>
              <p className="text-muted-foreground">A detailed log of all your income and expenses.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select onValueChange={handleSortChange} defaultValue={sort}>
              <SelectTrigger className="w-[220px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date: Newest to Oldest</SelectItem>
                <SelectItem value="saved-desc">Saved: High to Low</SelectItem>
                <SelectItem value="saved-asc">Overspent: High to Low</SelectItem>
              </SelectContent>
            </Select>
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
              Recategorize
            </Button>
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
