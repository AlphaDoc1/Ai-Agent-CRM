
import json

# Read the JSON file
with open("new elanpro_catalog_database.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Generate SQL
sql_script = """
-- ============================================
-- Reset and Recreate Elanpro Database
-- ============================================

-- 1. Drop existing tables if they exist (cascade to remove dependencies)
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;

-- 2. Create product_categories table
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    tagline TEXT,
    subcategories JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL UNIQUE,
    model TEXT NOT NULL,
    category_name TEXT NOT NULL,
    subcategory TEXT,
    series TEXT,
    description TEXT,
    capacity_ltr TEXT,
    dimensions_mm TEXT,
    temperature_range_c TEXT,
    gn_compatibility TEXT,
    refrigerant TEXT,
    cooling_type TEXT,
    no_of_shelves TEXT,
    climate_class TEXT,
    key_features JSONB,
    certifications JSONB,
    specs JSONB,  -- Store all other fields in a JSONB column for flexibility
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Insert product categories
"""

# Insert categories
for cat in data["product_categories"]:
    subcategories = json.dumps(cat.get("subcategories", []))
    tagline = cat.get("tagline", "")
    sql_script += f"""
INSERT INTO product_categories (category_id, name, tagline, subcategories)
VALUES ('{cat["category_id"]}', '{cat["category_name"].replace("'", "''")}', '{tagline.replace("'", "''")}', '{subcategories}');
"""

# Insert products
sql_script += "\n-- 5. Insert products\n"

for prod in data["products"]:
    # Extract known fields
    product_id = prod["product_id"]
    model = prod["model"].replace("'", "''")
    category_name = prod["category"].replace("'", "''")
    subcategory = prod.get("subcategory", "")
    if subcategory:
        subcategory = subcategory.replace("'", "''")
    series = prod.get("series", "").replace("'", "''")
    description = prod.get("description", "").replace("'", "''")
    capacity_ltr = str(prod.get("capacity_ltr", ""))
    dimensions_mm = prod.get("dimensions_mm", "").replace("'", "''")
    temperature_range_c = prod.get("temperature_range_c", "").replace("'", "''")
    gn_compatibility = prod.get("gn_compatibility", "").replace("'", "''")
    refrigerant = prod.get("refrigerant", "").replace("'", "''")
    cooling_type = prod.get("cooling_type", "").replace("'", "''")
    no_of_shelves = str(prod.get("no_of_shelves", ""))
    climate_class = prod.get("climate_class", "").replace("'", "''")
    
    # Extract remaining fields into specs JSONB
    specs_dict = {k: v for k, v in prod.items() if k not in [
        "product_id", "model", "category", "subcategory", "series", 
        "description", "capacity_ltr", "dimensions_mm", "temperature_range_c", 
        "gn_compatibility", "refrigerant", "cooling_type", "no_of_shelves", 
        "climate_class", "key_features", "certifications"
    ]}
    specs = json.dumps(specs_dict)
    
    key_features = json.dumps(prod.get("key_features", []))
    certifications = json.dumps(prod.get("certifications", []))
    
    sql_script += f"""
INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    '{product_id}', '{model}', '{category_name}', '{subcategory}', '{series}', '{description}',
    '{capacity_ltr}', '{dimensions_mm}', '{temperature_range_c}', '{gn_compatibility}',
    '{refrigerant}', '{cooling_type}', '{no_of_shelves}', '{climate_class}',
    '{key_features}', '{certifications}', '{specs}'
);
"""

sql_script += "\n-- =============================================\n-- Done!\n-- ============================================="

# Write SQL to file
with open("database/seed_catalog.sql", "w", encoding="utf-8") as f:
    f.write(sql_script)

print("SQL script generated successfully at database/seed_catalog.sql!")
print("Next steps:")
print("  1. Open Supabase Dashboard")
print("  2. Go to SQL Editor")
print("  3. Paste the contents of database/seed_catalog.sql")
print("  4. Run the script!")
