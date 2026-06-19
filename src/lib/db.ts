import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export type Product = {
  id: string;
  slug: string;
  title: string;
  description: string;
  image_url: string;
  category: string;
  supplier_cost: number;
  supplier_product_cost: number;
  supplier_shipping_cost: number;
  retail_price: number;
  trend_score: number;
  supplier_sku: string;
  supplier_pid: string;
  supplier_vid: string;
  supplier_name: string;
  tiktok_product_id: string;
  stock: number;
  view_count: number;
  is_pinned: number;
  hidden_reason: string | null;
  seo_title: string;
  seo_description: string;
  seo_faqs: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  stripe_session_id: string | null;
  customer_email: string;
  customer_name: string;
  shipping_address: string;
  shipping_line1: string;
  shipping_line2: string;
  shipping_city: string;
  shipping_county: string;
  shipping_postcode: string;
  shipping_phone: string;
  status: "pending" | "paid" | "fulfilled" | "shipped" | "failed";
  total: number;
  order_kind: "standard" | "manual";
  manual_description: string;
  manual_notes: string;
  supplier_order_id: string | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  supplier_cost: number;
};

export type AutomationLog = {
  id: string;
  job_type: string;
  status: "success" | "error";
  message: string;
  details: string | null;
  created_at: string;
};

export type SocialPost = {
  id: string;
  product_id: string;
  platform: string;
  caption: string;
  image_url: string;
  product_url: string;
  post_url: string | null;
  external_id: string | null;
  status: "posted" | "failed" | "skipped";
  error_message: string | null;
  posted_at: string | null;
  created_at: string;
};

const globalForDb = globalThis as typeof globalThis & { __trenddropDb?: Database.Database };

function isBuildTime(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  );
}

function resolveDbPath(): string {
  if (isBuildTime()) return ":memory:";
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "trenddrop.db");
}

function createDb(resolvedPath: string) {
  if (resolvedPath !== ":memory:") {
    const dataDir = path.dirname(resolvedPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  const database = new Database(resolvedPath);
  database.pragma("journal_mode = WAL");
  database.pragma("busy_timeout = 5000");

  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL,
      category TEXT NOT NULL,
      supplier_cost REAL NOT NULL,
      retail_price REAL NOT NULL,
      trend_score REAL NOT NULL DEFAULT 0,
      supplier_sku TEXT NOT NULL,
      supplier_pid TEXT NOT NULL DEFAULT '',
      supplier_vid TEXT NOT NULL DEFAULT '',
      supplier_name TEXT NOT NULL DEFAULT 'CJ Dropshipping',
      stock INTEGER NOT NULL DEFAULT 100,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      stripe_session_id TEXT,
      customer_email TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      shipping_line1 TEXT NOT NULL DEFAULT '',
      shipping_line2 TEXT NOT NULL DEFAULT '',
      shipping_city TEXT NOT NULL DEFAULT '',
      shipping_county TEXT NOT NULL DEFAULT '',
      shipping_postcode TEXT NOT NULL DEFAULT '',
      shipping_phone TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      total REAL NOT NULL,
      supplier_order_id TEXT,
      tracking_number TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      supplier_cost REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS automation_logs (
      id TEXT PRIMARY KEY,
      job_type TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_trend ON products(trend_score DESC);
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

    CREATE TABLE IF NOT EXISTS social_posts (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      caption TEXT NOT NULL,
      image_url TEXT NOT NULL,
      product_url TEXT NOT NULL,
      post_url TEXT,
      external_id TEXT,
      status TEXT NOT NULL,
      error_message TEXT,
      posted_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE INDEX IF NOT EXISTS idx_social_posts_product ON social_posts(product_id);
    CREATE INDEX IF NOT EXISTS idx_social_posts_posted ON social_posts(platform, posted_at);
  `);

  migrateSchema(database);

  return database;
}

function migrateSchema(database: Database.Database) {
  const productCols = (
    database.prepare("PRAGMA table_info(products)").all() as { name: string }[]
  ).map((c) => c.name);

  if (!productCols.includes("supplier_pid")) {
    database.exec("ALTER TABLE products ADD COLUMN supplier_pid TEXT NOT NULL DEFAULT ''");
  }
  if (!productCols.includes("supplier_vid")) {
    database.exec("ALTER TABLE products ADD COLUMN supplier_vid TEXT NOT NULL DEFAULT ''");
  }
  if (!productCols.includes("supplier_product_cost")) {
    database.exec("ALTER TABLE products ADD COLUMN supplier_product_cost REAL NOT NULL DEFAULT 0");
  }
  if (!productCols.includes("supplier_shipping_cost")) {
    database.exec("ALTER TABLE products ADD COLUMN supplier_shipping_cost REAL NOT NULL DEFAULT 0");
  }
  if (!productCols.includes("tiktok_product_id")) {
    database.exec("ALTER TABLE products ADD COLUMN tiktok_product_id TEXT NOT NULL DEFAULT ''");
  }
  if (!productCols.includes("view_count")) {
    database.exec("ALTER TABLE products ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0");
  }
  if (!productCols.includes("is_pinned")) {
    database.exec("ALTER TABLE products ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0");
  }
  if (!productCols.includes("hidden_reason")) {
    database.exec("ALTER TABLE products ADD COLUMN hidden_reason TEXT");
  }
  if (!productCols.includes("seo_title")) {
    database.exec("ALTER TABLE products ADD COLUMN seo_title TEXT NOT NULL DEFAULT ''");
  }
  if (!productCols.includes("seo_description")) {
    database.exec("ALTER TABLE products ADD COLUMN seo_description TEXT NOT NULL DEFAULT ''");
  }
  if (!productCols.includes("seo_faqs")) {
    database.exec("ALTER TABLE products ADD COLUMN seo_faqs TEXT NOT NULL DEFAULT ''");
  }

  database.exec(`
    UPDATE products
    SET supplier_product_cost = supplier_cost
    WHERE supplier_product_cost = 0 AND supplier_cost > 0
  `);

  const orderCols = (
    database.prepare("PRAGMA table_info(orders)").all() as { name: string }[]
  ).map((c) => c.name);

  const orderFields = [
    ["shipping_line1", "TEXT NOT NULL DEFAULT ''"],
    ["shipping_line2", "TEXT NOT NULL DEFAULT ''"],
    ["shipping_city", "TEXT NOT NULL DEFAULT ''"],
    ["shipping_county", "TEXT NOT NULL DEFAULT ''"],
    ["shipping_postcode", "TEXT NOT NULL DEFAULT ''"],
    ["shipping_phone", "TEXT NOT NULL DEFAULT ''"],
  ] as const;

  for (const [col, def] of orderFields) {
    if (!orderCols.includes(col)) {
      database.exec(`ALTER TABLE orders ADD COLUMN ${col} ${def}`);
    }
  }

  if (!orderCols.includes("order_kind")) {
    database.exec("ALTER TABLE orders ADD COLUMN order_kind TEXT NOT NULL DEFAULT 'standard'");
  }
  if (!orderCols.includes("manual_description")) {
    database.exec("ALTER TABLE orders ADD COLUMN manual_description TEXT NOT NULL DEFAULT ''");
  }
  if (!orderCols.includes("manual_notes")) {
    database.exec("ALTER TABLE orders ADD COLUMN manual_notes TEXT NOT NULL DEFAULT ''");
  }
  if (!orderCols.includes("abandoned_reminder_1_at")) {
    database.exec("ALTER TABLE orders ADD COLUMN abandoned_reminder_1_at TEXT");
  }
  if (!orderCols.includes("abandoned_reminder_2_at")) {
    database.exec("ALTER TABLE orders ADD COLUMN abandoned_reminder_2_at TEXT");
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS cart_leads (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      cart_json TEXT NOT NULL,
      reminder_sent_at TEXT,
      converted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cart_leads_email ON cart_leads(email);
  `);

  seedHeroProductLanding(database);
}

function seedHeroProductLanding(database: Database.Database) {
  const now = new Date().toISOString();
  const slug = "note-board-creative-led-night-light-usb-message-953728";

  database
    .prepare(
      `UPDATE products SET retail_price = 19.99, is_pinned = 1, updated_at = ?
       WHERE slug = ? AND retail_price > 19.99`
    )
    .run(now, slug);

  const existing = database
    .prepare("SELECT seo_title FROM products WHERE slug = ?")
    .get(slug) as { seo_title: string } | undefined;

  if (!existing || existing.seo_title.trim()) return;

  const noteBoardFaqs = JSON.stringify([
    {
      q: "How long does UK delivery take?",
      a: "Free UK delivery on every order. Most Note Board orders arrive within 7–10 working days.",
    },
    {
      q: "Is it a good gift?",
      a: "Yes — it arrives in gift-ready packaging and is one of the most shared bedroom decor finds on TikTok.",
    },
    {
      q: "How do I power it?",
      a: "USB powered — plug into a phone charger, laptop, or USB socket. No batteries needed.",
    },
    {
      q: "Can I return it if I'm not happy?",
      a: "Yes — 14-day returns. Email support@buzzdrop.co.uk and we'll help with a return or exchange.",
    },
    {
      q: "Is checkout secure?",
      a: "Yes — all payments are processed securely via Stripe (card & Apple Pay). BuzzDrop is UK-based with support at support@buzzdrop.co.uk.",
    },
  ]);

  database
    .prepare(
      `UPDATE products SET
        seo_title = ?,
        seo_description = ?,
        seo_faqs = ?,
        description = ?,
        updated_at = ?
      WHERE slug = ?`
    )
    .run(
      "LED Note Board Night Light — Free UK Delivery | BuzzDrop",
      "Write any message on this viral LED note board. USB powered, gift-ready packaging, free UK delivery & secure Stripe checkout. £19.99.",
      noteBoardFaqs,
      "Creative USB LED message board that lights up any text you write — like a mini neon sign for your bedside table, desk, or shelf. Transparent acrylic panel with a warm glow effect. USB powered (cable included). Arrives in gift-ready packaging. Free UK delivery.",
      now,
      slug
    );
}

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;
  if (globalForDb.__trenddropDb && !isBuildTime()) {
    dbInstance = globalForDb.__trenddropDb;
    return dbInstance;
  }

  dbInstance = createDb(resolveDbPath());
  if (!isBuildTime()) {
    globalForDb.__trenddropDb = dbInstance;
  }
  return dbInstance;
}

export const db: Database.Database = new Proxy({} as Database.Database, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export function getSetting(key: string, fallback = ""): string {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? fallback;
}

export function setSetting(key: string, value: string) {
  getDb().prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}
