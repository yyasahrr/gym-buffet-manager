import type { OrderItem, Product, Ingredient } from './types';

type Inventory = {
    products: Product[];
    ingredients: Ingredient[];
}

/**
 * Checks if a single order item can be fulfilled given the current inventory and items already in the cart.
 * @param orderItem - The item and quantity to check.
 * @param inventory - The current state of all products and ingredients.
 * @param cart - The current items in the shopping cart.
 * @returns boolean - True if the item can be fulfilled, false otherwise.
 */
export function canFulfillOrderItem(orderItem: OrderItem, inventory: Inventory, cart: OrderItem[]): boolean {
    const { item, quantity } = orderItem;

    // Check if item is a Food or a Product
    if ('recipe' in item) { // It's a Food
        const food = item;
        const ingredientMap = new Map(inventory.ingredients.map(i => [i.id, i]));

        for (const recipeItem of food.recipe) {
            const ingredient = ingredientMap.get(recipeItem.ingredientId);
            if (!ingredient) return false; // Ingredient not found in inventory

            const cartQuantity = cart
                .filter(ci => 'recipe' in ci.item)
                .flatMap(ci => (ci.item as typeof food).recipe)
                .filter(ri => ri.ingredientId === recipeItem.ingredientId)
                .reduce((total, ri) => total + ri.quantity * (cart.find(c => 'recipe' in c.item && (c.item as typeof food).recipe.some(r => r.ingredientId === ri.ingredientId))?.quantity || 0), 0);

            const requiredQuantity = recipeItem.quantity * quantity;
            if (ingredient.stock < (cartQuantity + requiredQuantity)) {
                return false; // Not enough ingredient stock
            }
        }
    } else { // It's a Product
        const product = inventory.products.find(p => p.id === item.id);
        if (!product) return false; // Product not found

        const cartQuantity = cart
            .filter(ci => !('recipe' in ci.item) && ci.item.id === item.id)
            .reduce((total, ci) => total + ci.quantity, 0);

        if (product.stock < (cartQuantity + quantity)) {
            return false; // Not enough product stock
        }
    }

    return true;
}


/**
 * Fulfills an order by deducting stock from products and ingredients.
 * @param cart - The list of items in the order.
 * @param inventory - The current state of all products and ingredients.
 * @returns An object with updated products, ingredients, and a success flag.
 */
export function fulfillOrder(cart: OrderItem[], inventory: Inventory): { updatedProducts: Product[], updatedIngredients: Ingredient[], success: boolean } {
    let updatedProducts = [...inventory.products];
    let updatedIngredients = [...inventory.ingredients];
    const ingredientMap = new Map(updatedIngredients.map(i => [i.id, { ...i }]));

    for (const orderItem of cart) {
        const { item, quantity } = orderItem;

        if ('recipe' in item) { // It's a Food
            for (const recipeItem of item.recipe) {
                const ingredient = ingredientMap.get(recipeItem.ingredientId);
                if (!ingredient || ingredient.stock < recipeItem.quantity * quantity) {
                    return { updatedProducts: inventory.products, updatedIngredients: inventory.ingredients, success: false }; // Rollback
                }
                ingredient.stock -= recipeItem.quantity * quantity;
                ingredientMap.set(recipeItem.ingredientId, ingredient);
            }
        } else { // It's a Product
            const productIndex = updatedProducts.findIndex(p => p.id === item.id);
            if (productIndex === -1 || updatedProducts[productIndex].stock < quantity) {
                 return { updatedProducts: inventory.products, updatedIngredients: inventory.ingredients, success: false }; // Rollback
            }
            updatedProducts[productIndex] = {
                ...updatedProducts[productIndex],
                stock: updatedProducts[productIndex].stock - quantity,
            };
        }
    }
    
    updatedIngredients = Array.from(ingredientMap.values());

    return { updatedProducts, updatedIngredients, success: true };
}
