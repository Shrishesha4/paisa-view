"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, Loader2, AlertCircle } from "lucide-react";
import { getSavingsSuggestions } from "@/app/actions";
import type { Expense, Income } from "@/lib/types";

type AiAssistantProps = {
  expenses: Expense[];
  income: Income[];
};

export function AiAssistant({ expenses, income }: AiAssistantProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGetSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    setSuggestions(null);
    const result = await getSavingsSuggestions(expenses, income);
    if (result.success) {
      setSuggestions(result.data);
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  };

  return (
    <Card className="col-span-1 lg:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="text-amber-500" />
          AI Savings Assistant
        </CardTitle>
        <CardDescription>Get personalized tips to improve your savings.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={handleGetSuggestions} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : "Generate Savings Tips"}
          </Button>
          {error && (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
             </Alert>
          )}
          {suggestions && (
             <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertTitle>Your Personalized Tips</AlertTitle>
                <AlertDescription>
                    <ul className="list-none space-y-2 mt-2">
                        {suggestions.split('\n').filter(tip => tip.trim().length > 0).map((tip, index) => (
                            <li key={index} className="whitespace-pre-wrap">{tip}</li>
                        ))}
                    </ul>
                </AlertDescription>
             </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
