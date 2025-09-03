

"use client"

import type { Expense } from "./types";
import { capitalize } from "./utils";

// A dictionary for common misspellings and aliases to normalize keywords.
const KEYWORD_ALIAS_MAP: Record<string, string> = {
  parrata: 'paratha',
  maligai: 'groceries',
  maliahi: 'groceries',
  med: 'medicine',
  tablet: 'medicine',
  vagetables: 'vegetable',
  shop: 'shopping',
};

// A dictionary to directly map certain keywords to a final category.
const KEYWORD_TO_CATEGORY_MAP: Record<string, string> = {
  paratha: 'Food',
  groceries: 'Groceries',
  medicine: 'Health',
  vegetable: 'Groceries',
  milk: 'Groceries',
  rice: 'Groceries',
  oil: 'Groceries',
  soap: 'Personal Care',
  water: 'Utilities',
  coffee: 'Food',
  tea: 'Food',
  snacks: 'Food',
  gift: 'Gifts',
  mango: 'Utilities',
  leaves: 'Utilities',
};

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
      
      const category = normalizeCategory(expense.category);
      // We don't want to learn from 'Other' as it's not a specific category.
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

    // Find the best category for each keyword based on user's history
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
    let predictedCategory: string | null = null;

    for (const keyword of keywords) {
      // Priority 1: Direct mapping from our dictionary
      if (KEYWORD_TO_CATEGORY_MAP[keyword]) {
        return KEYWORD_TO_CATEGORY_MAP[keyword];
      }
      
      // Priority 2: Learned from user's history
      if (this.keywordToCategory.has(keyword)) {
        if (!bestMatch || keyword.length > bestMatch.length) {
          bestMatch = keyword;
          predictedCategory = this.keywordToCategory.get(keyword) || null;
        }
      }
    }

    return predictedCategory;
  }
  
  /**
   * Extracts, normalizes, and corrects meaningful keywords from a description string.
   */
  private extractKeywords(description: string): string[] {
    const stopWords = new Set(['and', 'the', 'for', 'a', 'in', 'with', 'to', 'of', 'from']);
    return description
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.replace(/[^a-z0-9]/gi, '')) // Sanitize
      .map(word => KEYWORD_ALIAS_MAP[word] || word) // Correct aliases/misspellings
      .filter(word => word.length > 2 && !stopWords.has(word));
  }
}

/**
 * Cleans and normalizes a category name.
 * - Trims whitespace
 * - Capitalizes the first letter
 * - Handles simple comma-separated values by taking the first part
 */
function normalizeCategory(category: string): string {
    if (!category) return 'Other';
    // Take the first part of a comma-separated list, trim it, and capitalize it.
    const primaryCategory = category.split(',')[0].trim();
    return capitalize(primaryCategory);
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
    const originalCategory = expense.category;
    const newCategorySuggestion = model.predict(expense.description);

    // If we have a suggestion and it's different from the original (normalized) category
    if (newCategorySuggestion && newCategorySuggestion !== normalizeCategory(originalCategory)) {
        changedCount++;
        return { ...expense, category: newCategorySuggestion };
    }
    
    // If no new suggestion, just normalize the existing category.
    const normalizedOriginalCategory = normalizeCategory(originalCategory);
    if (normalizedOriginalCategory !== originalCategory) {
      changedCount++;
      return { ...expense, category: normalizedOriginalCategory };
    }
    
    return expense;
  });

  return { updatedExpenses, changedCount };
}
