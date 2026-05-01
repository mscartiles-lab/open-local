import { getUncachableStripeClient } from "./stripeClient";

const PRODUCTS = [
  {
    name: "Open Local Vendor Plan",
    description: "Sell your handmade & local products on Open Local. $10.98/month after trial.",
  },
  {
    name: "Open Local Business Listing",
    description: "List your independently-owned business on Open Local's map. $10.98/month after trial.",
  },
];

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  for (const p of PRODUCTS) {
    const existing = await stripe.products.search({
      query: `name:'${p.name}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      console.log(`✓ Already exists: ${p.name} (${existing.data[0].id})`);

      const prices = await stripe.prices.list({
        product: existing.data[0].id,
        active: true,
      });
      if (prices.data.length > 0) {
        console.log(`  Price: $${(prices.data[0].unit_amount ?? 0) / 100}/month (${prices.data[0].id})`);
      }
      continue;
    }

    const product = await stripe.products.create({
      name: p.name,
      description: p.description,
    });
    console.log(`+ Created product: ${product.name} (${product.id})`);

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 1098,
      currency: "usd",
      recurring: { interval: "month" },
    });
    console.log(`  + Created price: $10.98/month (${price.id})`);
  }

  console.log("\nDone! Webhooks will sync these to your database automatically.");
}

seedProducts().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
