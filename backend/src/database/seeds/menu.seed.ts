/**
 * Menu seed script — populates the database with initial menu products.
 * Idempotent: uses upsert (findOneAndUpdate with upsert) so it can be
 * run multiple times safely. Matches products by name to avoid duplicates.
 *
 * Run with: npm run seed:menu
 */
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

// All prices in integer cents
const products = [
  {
    name: 'Classic Burger',
    description:
      'Juicy handcrafted burger with your choice of protein and toppings',
    category: 'Burgers',
    basePrice: 899,
    available: true,
    modifierGroups: [
      {
        name: 'Protein',
        required: true,
        minSelections: 1,
        maxSelections: 1,
        options: [
          { name: 'Beef', priceAdjustment: 0 },
          { name: 'Chicken', priceAdjustment: 100 },
          { name: 'Veggie Patty', priceAdjustment: 150 },
        ],
      },
      {
        name: 'Toppings',
        required: false,
        minSelections: 0,
        maxSelections: 4,
        options: [
          { name: 'Cheese', priceAdjustment: 75 },
          { name: 'Bacon', priceAdjustment: 125 },
          { name: 'Lettuce', priceAdjustment: 0 },
          { name: 'Tomato', priceAdjustment: 0 },
          { name: 'Onion', priceAdjustment: 0 },
          { name: 'Pickles', priceAdjustment: 0 },
          { name: 'Jalapeños', priceAdjustment: 50 },
        ],
      },
      {
        name: 'Sauces',
        required: false,
        minSelections: 0,
        maxSelections: 2,
        options: [
          { name: 'Ketchup', priceAdjustment: 0 },
          { name: 'Mustard', priceAdjustment: 0 },
          { name: 'Mayo', priceAdjustment: 0 },
          { name: 'BBQ', priceAdjustment: 25 },
          { name: 'Hot Sauce', priceAdjustment: 0 },
        ],
      },
    ],
  },
  {
    name: 'Burrito Bowl',
    description:
      'Fresh burrito bowl with your choice of protein and toppings',
    category: 'Bowls',
    basePrice: 1099,
    available: true,
    modifierGroups: [
      {
        name: 'Protein',
        required: true,
        minSelections: 1,
        maxSelections: 1,
        options: [
          { name: 'Grilled Chicken', priceAdjustment: 0 },
          { name: 'Steak', priceAdjustment: 200 },
          { name: 'Carnitas', priceAdjustment: 150 },
          { name: 'Sofritas', priceAdjustment: 0 },
        ],
      },
      {
        name: 'Toppings',
        required: false,
        minSelections: 0,
        maxSelections: 5,
        options: [
          { name: 'Rice', priceAdjustment: 0 },
          { name: 'Black Beans', priceAdjustment: 0 },
          { name: 'Corn Salsa', priceAdjustment: 0 },
          { name: 'Pico de Gallo', priceAdjustment: 0 },
          { name: 'Sour Cream', priceAdjustment: 50 },
          { name: 'Guacamole', priceAdjustment: 150 },
          { name: 'Cheese', priceAdjustment: 75 },
        ],
      },
      {
        name: 'Sauces',
        required: false,
        minSelections: 0,
        maxSelections: 2,
        options: [
          { name: 'Mild Salsa', priceAdjustment: 0 },
          { name: 'Medium Salsa', priceAdjustment: 0 },
          { name: 'Hot Salsa', priceAdjustment: 0 },
          { name: 'Chipotle Dressing', priceAdjustment: 25 },
        ],
      },
    ],
  },
  {
    name: 'Margherita Pizza',
    description:
      'Classic pizza with fresh mozzarella, tomato sauce, and basil',
    category: 'Pizzas',
    basePrice: 1299,
    available: true,
    modifierGroups: [],
  },
  {
    name: 'Caesar Salad',
    description:
      'Crisp romaine lettuce with Caesar dressing, croutons, and parmesan',
    category: 'Salads',
    basePrice: 799,
    available: true,
    modifierGroups: [],
  },
  {
    name: 'French Fries',
    description: 'Golden crispy french fries',
    category: 'Sides',
    basePrice: 399,
    available: true,
    modifierGroups: [],
  },
  {
    name: 'Chocolate Milkshake',
    description: 'Rich and creamy chocolate milkshake',
    category: 'Drinks',
    basePrice: 549,
    available: true,
    modifierGroups: [],
  },
  {
    name: 'Sparkling Water',
    description: 'Refreshing sparkling water',
    category: 'Drinks',
    basePrice: 199,
    available: true,
    modifierGroups: [],
  },
];

async function seed() {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    console.error('MONGODB_URI is not set. Check your .env file.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected.');

  const collection = mongoose.connection.collection('products');

  for (const product of products) {
    // Upsert by name — idempotent: creates if missing, updates if exists
    const result = await collection.updateOne(
      { name: product.name },
      { $set: product },
      { upsert: true },
    );
    const action = result.upsertedCount > 0 ? 'CREATED' : 'UPDATED';
    console.log(
      `  ${action}: ${product.name} ($${(product.basePrice / 100).toFixed(2)})`,
    );
  }

  console.log(`\nSeed complete: ${products.length} products processed.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
