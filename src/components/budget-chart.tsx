"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type BudgetChartProps = {
  totalIncome: number;
  totalExpenses: number;
};

export function BudgetChart({ totalIncome, totalExpenses }: BudgetChartProps) {

    const chartData = [
        { name: 'Funds', spent: totalExpenses, remaining: Math.max(0, totalIncome - totalExpenses) }
    ];

    const spentPercentage = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Income vs. Spending</CardTitle>
        <CardDescription>
            {`You've spent ${spentPercentage.toFixed(0)}% of your income.`}
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
            <Bar dataKey="spent" fill="hsl(var(--primary))" name="spent" stackId="a"/>
            <Bar dataKey="remaining" fill="hsl(var(--secondary))" name="remaining" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
