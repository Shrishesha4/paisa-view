"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type BudgetChartProps = {
  totalExpenses: number;
  budget: number;
};

export function BudgetChart({ totalExpenses, budget }: BudgetChartProps) {

    const chartData = [
        { name: 'Funds', spent: totalExpenses, remaining: Math.max(0, budget - totalExpenses) }
    ];

    const spentPercentage = budget > 0 ? (totalExpenses / budget) * 100 : 0;

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Budget vs. Spending</CardTitle>
        <CardDescription>
            {budget > 0 
                ? `You've spent ${spentPercentage.toFixed(0)}% of your budget.`
                : "Set a budget to track your spending."
            }
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart layout="vertical" data={chartData} stackOffset="expand">
             <XAxis type="number" hide domain={[0, 100]} />
             <YAxis type="category" dataKey="name" hide/>
            <Tooltip
                contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderColor: "hsl(var(--border))",
                }}
                formatter={(value, name, props) => {
                    if (budget === 0) {
                        return [new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value as number), "Spent"];
                    }
                    const { spent, remaining } = props.payload;
                    const total = spent + remaining;
                    const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
                    
                    if (name === 'spent') {
                        return [`${formatCurrency(value as number)} (${((value as number)/total * 100).toFixed(0)}%)`, "Spent"];
                    }
                    if (name === 'remaining') {
                        return [`${formatCurrency(value as number)} (${((value as number)/total * 100).toFixed(0)}%)`, "Remaining"];
                    }
                    return null;
                }}
            />
            <Bar dataKey="spent" fill="hsl(var(--primary))" name="spent" stackId="a" radius={budget === 0 || totalExpenses >= budget ? [4, 4, 4, 4] : [4, 0, 0, 4]}/>
            <Bar dataKey="remaining" fill="hsl(var(--secondary))" name="remaining" stackId="a" radius={[0, 4, 4, 0]}/>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
