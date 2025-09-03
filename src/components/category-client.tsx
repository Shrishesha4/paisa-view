
"use client";

import * as React from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Expense } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { capitalize, cn } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/constants";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "./ui/skeleton";

type CategoryClientProps = {
  categoryName: string;
};

export function CategoryClient({ categoryName: encodedCategoryName }: CategoryClientProps) {
  const [expenses] = useLocalStorage<Expense[]>("expenses", []);
  const router = useRouter();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);


  const categoryName = React.useMemo(() => decodeURIComponent(encodedCategoryName), [encodedCategoryName]);

  const filteredExpenses = React.useMemo(() => {
    return expenses
      .filter((expense) => capitalize(expense.category) === capitalize(categoryName))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, categoryName]);

  const totalAmount = React.useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const Icon = getCategoryIcon(categoryName);

  return (
    <div className="flex-1 flex flex-col bg-background p-4 md:p-6 container mx-auto">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft />
          </Button>
          <div className="flex items-center gap-3">
             <Icon className="h-7 w-7 text-muted-foreground" />
            <div>
                 <h1 className="text-2xl md:text-3xl font-bold">{capitalize(categoryName)}</h1>
                {isClient ? (
                    <p className="text-muted-foreground">
                        Total spent: {formatCurrency(totalAmount)} on {filteredExpenses.length} transactions.
                    </p>
                ) : (
                    <Skeleton className="h-5 w-48 mt-1" />
                )}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Card>
          <CardContent className="pt-6">
            {!isClient ? (
                <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredExpenses.length > 0 ? (
                        filteredExpenses.map((expense) => (
                            <TableRow key={expense.id}>
                                <TableCell>{formatDate(expense.date)}</TableCell>
                                <TableCell className="font-medium">{expense.description}</TableCell>
                                <TableCell className="text-right font-semibold text-destructive">
                                    -{formatCurrency(expense.amount)}
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                                No expenses found for this category.
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
