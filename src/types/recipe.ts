export interface RecipeSummary {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  servings: number;
  imageUrl?: string | null;
}

export interface IngredientData {
  name: string;
  origin: string;
  supplierName: string;
  isAllergen: boolean;
}

export interface RecipeWithIngredients extends RecipeSummary {
  ingredients: Array<{
    ingredient: IngredientData;
  }>;
}