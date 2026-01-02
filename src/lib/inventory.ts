import type { OrderItem, Product, Ingredient, Food } from './types';

type Inventory = {
    products: Product[];
    ingredients: Ingredient[];
}

/**
 * Checks if a single order item can be fulfilled given the current inventory and items already in the cart.
 * This function simulates the state of inventory *after* considering items already in the cart.
 * @param orderItem - The item and quantity to check. (e.g., adding 1 more unit)
 * @param inventory - The current state of all products and ingredients from storage.
 * @param cart - The current items in the shopping cart.
 * @returns boolean - True if the item can be fulfilled, false otherwise.
 */
export function canFulfillOrderItem(orderItem: OrderItem, inventory: Inventory, cart: OrderItem[]): boolean {
    const { item, quantity: requestedQuantity } = orderItem;

    const tempInventory = {
        products: new Map(inventory.products.map(p => [p.id, {...p}])),
        ingredients: new Map(inventory.ingredients.map(i => [i.id, {...i}]))
    };

    // First, tentatively deduct what's already in the cart from our temporary inventory
    for (const cartItem of cart) {
        if ('recipe' in cartItem.item) { // It's a Food
            for (const recipeItem of cartItem.item.recipe) {
                const tempIngredient = tempInventory.ingredients.get(recipeItem.ingredientId);
                if (tempIngredient) {
                    tempIngredient.stock -= recipeItem.quantity * cartItem.quantity;
                }
            }
        } else { // It's a Product
            const tempProduct = tempInventory.products.get(cartItem.item.id);
            if (tempProduct) {
                tempProduct.stock -= cartItem.quantity;
            }
        }
    }

    // Now, check if we can fulfill the NEW requested item against the temporary inventory
    if ('recipe' in item) { // It's a Food
        for (const recipeItem of item.recipe) {
            const ingredient = tempInventory.ingredients.get(recipeItem.ingredientId);
            const required = recipeItem.quantity * requestedQuantity;
            if (!ingredient || ingredient.stock < required) {
                return false; // Not enough ingredient stock
            }
        }
    } else { // It's a Product
        const product = tempInventory.products.get(item.id);
        if (!product || product.stock < requestedQuantity) {
            return false; // Not enough product stock
        }
    }

    return true;
}


/**
 * Fulfills an entire order by deducting stock for all items in the cart.
 * This is an "atomic" operation; it either succeeds for all items or fails and changes nothing.
 * @param cart - The list of items in the order.
 * @param inventory - The current state of all products and ingredients.
 * @returns An object with updated products, ingredients, and a success flag.
 */
export function fulfillOrder(cart: OrderItem[], inventory: Inventory): { updatedProducts: Product[], updatedIngredients: Ingredient[], success: boolean } {
    // Create deep copies for manipulation to ensure atomicity.
    const updatedProductsMap = new Map(inventory.products.map(p => [p.id, { ...p }]));
    const updatedIngredientsMap = new Map(inventory.ingredients.map(i => [i.id, { ...i }]));

    for (const orderItem of cart) {
        const { item, quantity } = orderItem;

        if ('recipe' in item) { // It's a Food
            for (const recipeItem of item.recipe) {
                const ingredient = updatedIngredientsMap.get(recipeItem.ingredientId);
                const requiredQuantity = recipeItem.quantity * quantity;
                if (!ingredient || ingredient.stock < requiredQuantity) {
                    // Not enough stock for an ingredient, so fail the entire transaction.
                    console.error(`Inventory shortfall: Need ${requiredQuantity} of ${ingredient?.name}, but only have ${ingredient?.stock}`);
                    return { updatedProducts: inventory.products, updatedIngredients: inventory.ingredients, success: false }; // Return original inventory
                }
                ingredient.stock -= requiredQuantity;
            }
        } else { // It's a Product
            const product = updatedProductsMap.get(item.id);
            if (!product || product.stock < quantity) {
                // Not enough stock for a product, so fail the entire transaction.
                 console.error(`Inventory shortfall: Need ${quantity} of ${product?.name}, but only have ${product?.stock}`);
                 return { updatedProducts: inventory.products, updatedIngredients: inventory.ingredients, success: false }; // Return original inventory
            }
            product.stock -= quantity;
        }
    }
    
    // If we reach here, all items can be fulfilled. Return the updated arrays.
    const updatedProducts = Array.from(updatedProductsMap.values());
    const updatedIngredients = Array.from(updatedIngredientsMap.values());

    return { updatedProducts, updatedIngredients, success: true };
}

    