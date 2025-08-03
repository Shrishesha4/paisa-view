"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Expense } from "@/lib/types";

type ExpensePieChartProps = {
  isClient: boolean;
  expenses: Expense[];
};

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function ExpensePieChart({ isClient, expenses }: ExpensePieChartProps) {
  const chartData = expenses
    .reduce((acc, expense) => {
      const existingCategory = acc.find((item) => item.name === expense.category);
      if (existingCategory) {
        existingCategory.value += expense.amount;
      } else {
        acc.push({ name: expense.category, value: expense.amount });
      }
      return acc;
    }, [] as { name: string; value: number }[])
    .sort((a, b) => b.value - a.value);

  const renderContent = () => {
    if (!isClient) {
      return <Skeleton className="h-[350px] w-full" />;
    }

    if (chartData.length === 0) {
      return (
        <div className="flex h-[350px] items-center justify-center text-muted-foreground">
          No expenses to display.
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              borderColor: "hsl(var(--border))",
            }}
            formatter={(value) =>
              new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value as number)
            }
          />
          <Legend
            wrapperStyle={{
                fontSize: "14px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Expense Breakdown</CardTitle>
        <CardDescription>
          A look at where your money is going by category.
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
