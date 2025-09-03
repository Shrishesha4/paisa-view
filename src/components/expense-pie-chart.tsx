
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Expense } from "@/lib/types";
import { capitalize } from "@/lib/utils";
import Link from 'next/link';
import { getCategoryIcon } from "@/lib/constants";

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
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
  "hsl(var(--chart-9))",
  "hsl(var(--chart-10))",
];

const renderLegend = (props: any) => {
  const { payload } = props;
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
      {payload.map((entry: any, index: number) => {
        const Icon = getCategoryIcon(entry.value);
        return (
          <li key={`item-${index}`} className="flex items-center">
            <Link href={`/category/${encodeURIComponent(entry.value)}`} className="flex items-center gap-1.5 hover:underline">
              <Icon className="h-4 w-4" style={{ color: entry.color }} />
              <span className="text-muted-foreground">{entry.value}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  );
};


export function ExpensePieChart({ isClient, expenses }: ExpensePieChartProps) {
  const chartData = expenses
    .reduce((acc, expense) => {
      const category = capitalize(expense.category);
      const existingCategory = acc.find((item) => item.name === category);
      if (existingCategory) {
        existingCategory.value += expense.amount;
      } else {
        acc.push({ name: category, value: expense.amount });
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
              background: "hsl(var(--popover))",
              borderColor: "hsl(var(--border))",
              color: "hsl(var(--popover-foreground))",
            }}
            formatter={(value) =>
              new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value as number)
            }
          />
          <Legend content={renderLegend}/>
        </PieChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card>
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
