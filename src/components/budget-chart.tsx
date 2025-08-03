"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type BudgetChartProps = {
  data: {
    name: string;
    value: number;
  }[];
  totalBudget: number;
};

export function BudgetChart({ data, totalBudget }: BudgetChartProps) {
    const totalSpent = data.reduce((sum, item) => sum + item.value, 0);

    const chartData = [
        { name: 'Spent', spent: totalSpent, budget: totalBudget - totalSpent }
    ];

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Budget vs. Spending</CardTitle>
        <CardDescription>A comparison of your monthly budget and total expenses.</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart layout="vertical" data={chartData} stackOffset="expand">
             <XAxis type="number" hide domain={[0, 100]} tickFormatter={(value) => `${value}%`}/>
             <YAxis type="category" dataKey="name" hide/>
            <Tooltip
                contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderColor: "hsl(var(--border))",
                }}
                formatter={(value, name, props) => {
                    const total = props.payload.spent + props.payload.budget;
                    const percentage = total > 0 ? (props.payload.spent / total) * 100 : 0;
                    if(name === 'spent'){
                         return [`${percentage.toFixed(0)}%`, "Spent"]
                    }
                    return null;
                }}
            />
            <Bar dataKey="spent" fill="hsl(var(--primary))" name="Spent" stackId="a"/>
            <Bar dataKey="budget" fill="hsl(var(--secondary-foreground))" name="Remaining" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
