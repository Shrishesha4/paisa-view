"use client"

import type { Expense } from "./types";
import { capitalize } from "./utils";

/**
 * A simple keyword-based categorization model that learns from past transactions.
 */
class CategorizationModel {
  private keywordToCategory: Map<string, string> = new Map();

  /**
   * Trains the model on a list of existing expenses.
   * It builds a map of keywords from descriptions to categories.
   * More specific keywords are given higher priority.
   */
  train(expenses: Expense[]): void {
    const keywordScores: Map<string, Map<string, number>> = new Map();

    for (const expense of expenses) {
      if (!expense.description || !expense.category) continue;
      
      const category = capitalize(expense.category);
      if (category.toLowerCase() === 'other') continue;

      const keywords = this.extractKeywords(expense.description);
      
      for (const keyword of keywords) {
        if (!keywordScores.has(keyword)) {
          keywordScores.set(keyword, new Map());
        }
        const categoryScores = keywordScores.get(keyword)!;
        categoryScores.set(category, (categoryScores.get(category) || 0) + 1);
      }
    }

    // Find the best category for each keyword
    for (const [keyword, categoryScores] of keywordScores.entries()) {
      let bestCategory = '';
      let maxScore = 0;
      for (const [category, score] of categoryScores.entries()) {
        if (score > maxScore) {
          maxScore = score;
          bestCategory = category;
        }
      }
      if (bestCategory) {
        this.keywordToCategory.set(keyword, bestCategory);
      }
    }
  }

  /**
   * Predicts a category for a given description.
   * It finds the keyword from the description with the highest priority (longest match).
   */
  predict(description: string): string | null {
    if (!description) return null;

    const keywords = this.extractKeywords(description);
    let bestMatch: string | null = null;

    for (const keyword of keywords) {
      if (this.keywordToCategory.has(keyword)) {
        if (!bestMatch || keyword.length > bestMatch.length) {
          bestMatch = keyword;
        }
      }
    }

    return bestMatch ? this.keywordToCategory.get(bestMatch) || null : null;
  }
  
  /**
   * Extracts meaningful keywords from a description string.
   * Splits by space and removes common stop words and short words.
   */
  private extractKeywords(description: string): string[] {
    const stopWords = new Set(['and', 'the', 'for', 'a', 'in', 'with', 'to', 'of']);
    return description
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.replace(/[^a-z0-9]/gi, ''))
      .filter(word => word.length > 2 && !stopWords.has(word));
  }
}

/**
 * Gets a category suggestion for a new expense description based on past expenses.
 * @param description The description of the new expense.
 * @param allExpenses The list of all past expenses to learn from.
 * @returns A suggested category string or null if no suggestion is found.
 */
export function getLocalCategorySuggestion(description: string, allExpenses: Expense[]): string | null {
  const model = new CategorizationModel();
  model.train(allExpenses);
  return model.predict(description);
}

/**
 * Re-categorizes all provided expenses based on a model trained on the same set.
 * This helps in cleaning up and standardizing categories.
 * @param allExpenses The list of all expenses to recategorize.
 * @returns An object containing the updated expenses list and the count of changed expenses.
 */
export function batchRecategorize(allExpenses: Expense[]): { updatedExpenses: Expense[], changedCount: number } {
  const model = new CategorizationModel();
  model.train(allExpenses);

  let changedCount = 0;
  const updatedExpenses = allExpenses.map(expense => {
    const currentCategory = capitalize(expense.category);
    const newCategorySuggestion = model.predict(expense.description);

    if (newCategorySuggestion && newCategorySuggestion !== currentCategory) {
      changedCount++;
      return { ...expense, category: newCategorySuggestion };
    }
    
    return expense;
  });

  return { updatedExpenses, changedCount };
}
