import { db, vendorsTable, productsTable } from "@workspace/db";
import { logger } from "./lib/logger";

const VENDORS = [
  {
    name: "Sunrise Hollow Orchard",
    slug: "sunrise-hollow-orchard",
    tagline: "Heirloom apples and stone fruit, picked the morning you eat them.",
    description:
      "A third-generation orchard tucked into the foothills outside Hood River. We grow forty varieties of apples, pears, and stone fruit using regenerative practices, and have never sprayed since 1998.",
    category: "Farm",
    location: "Hood River",
    region: "Oregon",
    contactEmail: "hello@sunrisehollow.example",
    websiteUrl: "https://sunrisehollow.example",
    imageUrl:
      "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=1200&q=80",
    established: 1962,
    featured: true,
  },
  {
    name: "Ember Lane Bakehouse",
    slug: "ember-lane-bakehouse",
    tagline: "Wild-fermented sourdough from a wood-fired oven on Ember Lane.",
    description:
      "We mill our own flour from regional grains and bake everything in a single wood-fired hearth. Naturally leavened breads, laminated pastries, and the occasional weekend pizza.",
    category: "Bakery",
    location: "Asheville",
    region: "North Carolina",
    contactEmail: "loaves@emberlane.example",
    websiteUrl: "https://emberlane.example",
    imageUrl:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=80",
    established: 2014,
    featured: true,
  },
  {
    name: "Tideline Apiary",
    slug: "tideline-apiary",
    tagline: "Single-origin honey from the salt-marsh wildflowers of the coast.",
    description:
      "Forty hives along the brackish marshes of the Outer Banks. Our honey changes with the bloom — sea lavender in spring, tupelo in summer, sourwood in late fall.",
    category: "Apiary",
    location: "Beaufort",
    region: "North Carolina",
    contactEmail: "hives@tideline.example",
    websiteUrl: null,
    imageUrl:
      "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=1200&q=80",
    established: 2009,
    featured: true,
  },
  {
    name: "North Field Creamery",
    slug: "north-field-creamery",
    tagline: "Aged cow and sheep cheeses from a single grass-fed herd.",
    description:
      "Family-run dairy on the rolling pastures of Vermont's Northeast Kingdom. Bloomy rinds, washed rinds, and a hard alpine-style we age for eighteen months in our cellar.",
    category: "Dairy",
    location: "Greensboro",
    region: "Vermont",
    contactEmail: "barn@northfield.example",
    websiteUrl: "https://northfield.example",
    imageUrl:
      "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=1200&q=80",
    established: 1987,
    featured: true,
  },
  {
    name: "Rough Coast Ceramics",
    slug: "rough-coast-ceramics",
    tagline: "Hand-thrown stoneware made for the daily table.",
    description:
      "A one-woman studio overlooking the cold Pacific. Wheel-thrown stoneware in muted ash and clay glazes, fired in a small gas kiln in batches of forty pieces.",
    category: "Crafts",
    location: "Mendocino",
    region: "California",
    contactEmail: "studio@roughcoast.example",
    websiteUrl: "https://roughcoast.example",
    imageUrl:
      "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&q=80",
    established: 2017,
    featured: false,
  },
  {
    name: "Cobblestone Brewing Co.",
    slug: "cobblestone-brewing",
    tagline: "Small-batch farmhouse ales from the old fire station.",
    description:
      "We brew open-fermented saisons, dry-hopped pales, and the occasional barrel-aged sour in a converted 1908 fire station. Twelve-barrel system, no cans, no shortcuts.",
    category: "Brewery",
    location: "Burlington",
    region: "Vermont",
    contactEmail: "taproom@cobblestone.example",
    websiteUrl: "https://cobblestone.example",
    imageUrl:
      "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=1200&q=80",
    established: 2011,
    featured: true,
  },
  {
    name: "Marigold & Vine",
    slug: "marigold-and-vine",
    tagline: "Seasonal cut flowers from a one-acre flower farm.",
    description:
      "Specialty cut flowers grown on a single hilly acre. Dahlias in late summer, ranunculus in spring, and an unreasonable amount of cosmos all year. CSA bouquets and weekly market bunches.",
    category: "Florist",
    location: "Hudson",
    region: "New York",
    contactEmail: "bunches@marigoldvine.example",
    websiteUrl: "https://marigoldvine.example",
    imageUrl:
      "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1200&q=80",
    established: 2019,
    featured: false,
  },
  {
    name: "Heritage Pasture Butcher",
    slug: "heritage-pasture-butcher",
    tagline: "Whole-animal butchery from heritage-breed pastured livestock.",
    description:
      "We work with five small farms within fifty miles, taking in whole animals and breaking them down by hand. Dry-aged beef, heritage pork, and house-made charcuterie.",
    category: "Butcher",
    location: "Lancaster",
    region: "Pennsylvania",
    contactEmail: "shop@heritagepasture.example",
    websiteUrl: "https://heritagepasture.example",
    imageUrl:
      "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=1200&q=80",
    established: 2016,
    featured: false,
  },
];

const PRODUCTS_BY_VENDOR_SLUG: Record<
  string,
  Array<{
    name: string;
    description: string;
    priceCents: number;
    unit: string;
    category: string;
    imageUrl: string;
    inStock?: boolean;
    featured?: boolean;
  }>
> = {
  "sunrise-hollow-orchard": [
    {
      name: "Newtown Pippin Apples",
      description:
        "Tart, dense, and sharply aromatic — the apple Thomas Jefferson grew at Monticello. Excellent for eating and for pie.",
      priceCents: 425,
      unit: "lb",
      category: "Produce",
      imageUrl:
        "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=900&q=80",
      featured: true,
    },
    {
      name: "Italian Prune Plums",
      description:
        "Small, oval freestone plums with deep purple skin. Perfect for tarts, jam, or eating warm off the tree.",
      priceCents: 550,
      unit: "lb",
      category: "Produce",
      imageUrl:
        "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=900&q=80",
    },
    {
      name: "Heritage Cider, Still",
      description:
        "Unfiltered single-orchard cider from a four-variety blend. Pressed cold, bottled still.",
      priceCents: 1800,
      unit: "bottle",
      category: "Beverages",
      imageUrl:
        "https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=900&q=80",
      featured: true,
    },
  ],
  "ember-lane-bakehouse": [
    {
      name: "Country Sourdough Loaf",
      description:
        "Naturally leavened with our seven-year-old starter. Open crumb, deep crust, two-day cold ferment.",
      priceCents: 950,
      unit: "loaf",
      category: "Baked Goods",
      imageUrl:
        "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900&q=80",
      featured: true,
    },
    {
      name: "Brown Butter Croissants",
      description:
        "Laminated with cultured butter, brushed with brown butter glaze. Sold by the half-dozen.",
      priceCents: 2400,
      unit: "half-dozen",
      category: "Baked Goods",
      imageUrl:
        "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=900&q=80",
    },
    {
      name: "Stone-Milled Rye Flour",
      description:
        "Whole-grain rye milled fresh in-shop from local Appalachian-grown grain. One-pound bags.",
      priceCents: 875,
      unit: "lb",
      category: "Pantry",
      imageUrl:
        "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=900&q=80",
    },
  ],
  "tideline-apiary": [
    {
      name: "Sea Lavender Honey",
      description:
        "Pale gold and lightly briny. A spring single-origin from our coastal hives — limited each year.",
      priceCents: 1650,
      unit: "jar",
      category: "Pantry",
      imageUrl:
        "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=900&q=80",
      featured: true,
    },
    {
      name: "Sourwood Honey",
      description:
        "Late-season Appalachian classic — buttery, with a long anise-like finish. Bottled raw and unfiltered.",
      priceCents: 1850,
      unit: "jar",
      category: "Pantry",
      imageUrl:
        "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=900&q=80",
    },
    {
      name: "Beeswax Pillar Candle",
      description:
        "Hand-rolled from cappings wax. Warm honey scent, clean burn, twelve-hour life.",
      priceCents: 1200,
      unit: "each",
      category: "Crafts",
      imageUrl:
        "https://images.unsplash.com/photo-1602874801006-e26c9aac2c61?w=900&q=80",
    },
  ],
  "north-field-creamery": [
    {
      name: "Northeast Kingdom Tomme",
      description:
        "Eighteen-month aged alpine-style from raw cow's milk. Nutty, dense, with a long mineral finish.",
      priceCents: 2400,
      unit: "half-pound",
      category: "Dairy",
      imageUrl:
        "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=900&q=80",
      featured: true,
    },
    {
      name: "Bloomy Rind Sheep Cheese",
      description:
        "A small soft-ripened wheel from our Lacaune ewes. Mushroomy, creamy, lightly grassy.",
      priceCents: 1850,
      unit: "wheel",
      category: "Dairy",
      imageUrl:
        "https://images.unsplash.com/photo-1452195100486-9cc805987862?w=900&q=80",
    },
    {
      name: "Cultured Butter, Salted",
      description:
        "Slow-cultured for thirty-six hours then churned in small batches. Hand-rolled half-pound logs.",
      priceCents: 1100,
      unit: "half-pound",
      category: "Dairy",
      imageUrl:
        "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=900&q=80",
    },
  ],
  "rough-coast-ceramics": [
    {
      name: "Ash-Glaze Dinner Plate",
      description:
        "Wheel-thrown stoneware in a soft greige ash glaze. 10\" diameter. No two are alike.",
      priceCents: 5800,
      unit: "each",
      category: "Crafts",
      imageUrl:
        "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=900&q=80",
      featured: true,
    },
    {
      name: "Tea Bowl, Iron Speckle",
      description:
        "A small cupped bowl with a satin iron-flecked glaze. Holds about eight ounces.",
      priceCents: 4200,
      unit: "each",
      category: "Crafts",
      imageUrl:
        "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=900&q=80",
    },
  ],
  "cobblestone-brewing": [
    {
      name: "Old Station Saison",
      description:
        "Open-fermented farmhouse ale, dry, peppery, citric on the finish. 750ml corked and caged.",
      priceCents: 1600,
      unit: "bottle",
      category: "Beverages",
      imageUrl:
        "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=900&q=80",
      featured: true,
    },
    {
      name: "Cellar Sour, Apricot",
      description:
        "Barrel-aged golden sour conditioned on local apricots for six months.",
      priceCents: 2400,
      unit: "bottle",
      category: "Beverages",
      imageUrl:
        "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=900&q=80",
    },
  ],
  "marigold-and-vine": [
    {
      name: "Garden Bouquet, Seasonal",
      description:
        "A loose hand-tied bouquet of whatever is best this week. Wrapped in butcher paper.",
      priceCents: 3500,
      unit: "bouquet",
      category: "Flowers",
      imageUrl:
        "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=900&q=80",
      featured: true,
    },
    {
      name: "Cafe au Lait Dahlias",
      description:
        "Dinnerplate dahlias in soft blush. Sold by the bunch of five stems, late summer through first frost.",
      priceCents: 2800,
      unit: "bunch",
      category: "Flowers",
      imageUrl:
        "https://images.unsplash.com/photo-1521543298578-7e1989c61b4f?w=900&q=80",
      inStock: false,
    },
  ],
  "heritage-pasture-butcher": [
    {
      name: "Dry-Aged Ribeye, 28-Day",
      description:
        "From a single 100% grass-fed Devon steer raised twelve miles from the shop. Cut to order.",
      priceCents: 3600,
      unit: "lb",
      category: "Meat",
      imageUrl:
        "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=900&q=80",
      featured: true,
    },
    {
      name: "Pasture Pork Sausage, Fennel",
      description:
        "Fresh sausage from Berkshire pork, fennel seed, and a little white wine. Sold in one-pound coils.",
      priceCents: 1450,
      unit: "lb",
      category: "Meat",
      imageUrl:
        "https://images.unsplash.com/photo-1606851181064-0a5d23bb47df?w=900&q=80",
    },
    {
      name: "House Country Pâté",
      description:
        "Coarse pork and chicken-liver pâté with brandy and pink peppercorn. Eight-ounce terrine.",
      priceCents: 1800,
      unit: "terrine",
      category: "Meat",
      imageUrl:
        "https://images.unsplash.com/photo-1598514982901-90c8d05a4ce7?w=900&q=80",
    },
  ],
};

async function main() {
  const existing = await db.select({ id: vendorsTable.id }).from(vendorsTable);
  if (existing.length > 0) {
    logger.info({ count: existing.length }, "Vendors already seeded, skipping");
    return;
  }

  logger.info("Seeding vendors and products...");

  for (const v of VENDORS) {
    const [inserted] = await db.insert(vendorsTable).values(v).returning();
    if (!inserted) continue;
    const products = PRODUCTS_BY_VENDOR_SLUG[v.slug] ?? [];
    for (const p of products) {
      await db.insert(productsTable).values({
        ...p,
        vendorId: inserted.id,
        inStock: p.inStock ?? true,
        featured: p.featured ?? false,
      });
    }
  }

  logger.info("Seed complete");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, "Seed failed");
    process.exit(1);
  });
