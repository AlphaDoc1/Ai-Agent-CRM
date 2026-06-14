
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

INSERT INTO product_categories (category_id, name, tagline, subcategories)
VALUES ('CAT001', 'Professional Kitchen', 'Trusted by Chefs', '["Reach-In Premium", "Undercounter Premium", "Free Standing Cooler / Freezer and Saladette Counter", "Undercounter and Saladette Counter with Prep Table", "Sushi & Saladette Counter and Ice Cream Buffet Freezer", "Frost Top and Cooling Well", "Blast Chiller & Freezer", "Reach-In & Undercounter Frost Free Classic", "Reach-In & Undercounter Static"]');

INSERT INTO product_categories (category_id, name, tagline, subcategories)
VALUES ('CAT002', 'Bar Refrigeration', 'Trusted by Bartenders', '["Wine Chillers", "Back Bars", "Undercounter Bars", "Beer & Beverages"]');

INSERT INTO product_categories (category_id, name, tagline, subcategories)
VALUES ('CAT003', 'Confectionery Showcase', 'Trusted by Bakers', '["Confectionery Showcase Platinum", "Confectionery Showcase Classic", "Confectionery Showcase Counter Top"]');

INSERT INTO product_categories (category_id, name, tagline, subcategories)
VALUES ('CAT004', 'Ice Machine', 'Trusted by Bars & Clinics', '[]');

INSERT INTO product_categories (category_id, name, tagline, subcategories)
VALUES ('CAT005', 'Beverage Solution', 'Trusted by Indian Customers', '["Juice Dispenser", "Slush Dispenser", "Softy Machine"]');

INSERT INTO product_categories (category_id, name, tagline, subcategories)
VALUES ('CAT006', 'Mini Bar & Mini Fridge', 'Trusted by Hoteliers', '["Mini Bar", "Mini Fridge"]');

INSERT INTO product_categories (category_id, name, tagline, subcategories)
VALUES ('CAT007', 'Retail Solution', 'Trusted by Retailers', '["Special Products & Milk Cooler", "Premium Series Flat & Curve Glass Top", "Premium Series Hard Top", "Upright Showcase Chiller", "Upright Showcase Freezer"]');

INSERT INTO product_categories (category_id, name, tagline, subcategories)
VALUES ('CAT008', 'Scooping Parlour', 'Scoop Happiness Serve Freshness', '[]');

INSERT INTO product_categories (category_id, name, tagline, subcategories)
VALUES ('CAT009', 'Supermarket', '', '[]');

INSERT INTO product_categories (category_id, name, tagline, subcategories)
VALUES ('CAT010', 'Water Dispenser', 'Har Boond Mein Bharosa', '[]');

INSERT INTO product_categories (category_id, name, tagline, subcategories)
VALUES ('CAT011', 'Water Cooler', 'Sip Smart Hydrate Smart', '[]');

INSERT INTO product_categories (category_id, name, tagline, subcategories)
VALUES ('CAT012', 'Pharma', '', '[]');

INSERT INTO product_categories (category_id, name, tagline, subcategories)
VALUES ('CAT013', 'Cold Room', 'For All Your Cold Solutions', '[]');

INSERT INTO product_categories (category_id, name, tagline, subcategories)
VALUES ('CAT014', 'Vending Machine', 'India''s First UPI Based Vending Machine', '[]');

-- 5. Insert products

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO001', 'EGN 1500 C4', 'Professional Kitchen', 'Reach-In Premium', 'Frost Free Premium', 'Reach-In Frost Free Premium Cooler - 4 door',
    '1300', '1420 x 875 x 2090', '2°C ~ 8°C', '2 x GN 1/1',
    'R 290', 'Ventilated Cooling (Frost Free)', '6', '43°C',
    '["All in One Design", "Flexible space utilisation", "Offers upto 100% extra storage", "No sharp edges, Effortless cleaning", "Upto 13 GN pans", "100 MM insulation", "Better Hold Over", "Better Pull Down", "Low Power Consumption", "Innovative Cold Air Distribution Through Duct", "Uniform distribution on each shelf", "No contamination through moisture/air", "Auto Defrosting", "Digital Controller", "Adjustable Shelves", "Eco-Friendly Refrigerant", "Tropicalized at 43\u00b0C ambient"]', '["SS 304 Certified (Inside/Outside"]', '{"ss_grade": null}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO002', 'EGN 1500 F4', 'Professional Kitchen', 'Reach-In Premium', 'Frost Free Premium', 'Reach-In Frost Free Premium Freezer - 4 door',
    '1300', '1420 x 875 x 2090', '-16°C ~ -22°C', '2 x GN 1/1',
    'R 290', 'Ventilated Cooling (Frost Free)', '6', '43°C',
    '["Auto Defrosting", "Digital Controller", "Adjustable Shelves", "Eco-Friendly Refrigerant", "Tropicalized at 43\u00b0C ambient"]', '["SS 304 Certified"]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO003', 'EGN 700 C2', 'Professional Kitchen', 'Reach-In Premium', 'Frost Free Premium', 'Reach-In Frost Free Premium Cooler - 2 door',
    '650', '740 x 875 x 2090', '2°C ~ 8°C', '2 x GN 1/1',
    'R 290', 'Ventilated Cooling (Frost Free)', '3', '43°C',
    '["Auto Defrosting", "Digital Controller", "Adjustable Shelves", "Eco-Friendly Refrigerant", "Tropicalized at 43\u00b0C ambient"]', '["SS 304 Certified"]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO004', 'EGN 700 F2', 'Professional Kitchen', 'Reach-In Premium', 'Frost Free Premium', 'Reach-In Frost Free Premium Freezer - 2 door',
    '650', '740 x 875 x 2090', '-16°C ~ -22°C', '2 x GN 1/1',
    'R 290', 'Ventilated Cooling (Frost Free)', '3', '43°C',
    '["Auto Defrosting", "Digital Controller", "Adjustable Shelves", "Eco-Friendly Refrigerant", "Tropicalized at 43\u00b0C ambient"]', '["SS 304 Certified"]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO005', 'EGN 2100 C', 'Professional Kitchen', 'Undercounter Premium', 'Under Counter Frost Free Premium', 'Under Counter Frost Free Premium Cooler - 2 door',
    '265', '1360 x 700 x 860', '2°C ~ 8°C', '1 x GN 1/1',
    'R600A', 'Ventilated Cooling (Frost Free)', '2', '38°C',
    '["Heavy-duty lockable castors", "Digital controller", "Adjustable Shelves", "Eco-friendly refrigerant", "Counter Top Drawers & OHS options available", "Available in 100/150mm backsplash", "2 & 3 Drawer option", "Over head shelf", "Lockable castors"]', '["SS 304 Certified (Inside/Outside)"]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO006', 'EGN 3100 C', 'Professional Kitchen', 'Undercounter Premium', 'Under Counter Frost Free Premium', 'Under Counter Frost Free Premium Cooler - 3 door',
    '400', '1795 x 700 x 860', '2°C ~ 8°C', '1 x GN 1/1',
    'R600A', 'Ventilated Cooling (Frost Free)', '3', '38°C',
    '["Heavy-duty lockable castors", "Digital controller", "Adjustable Shelves", "Eco-friendly refrigerant"]', '["SS 304 Certified"]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO007', 'EGN 2100 F', 'Professional Kitchen', 'Undercounter Premium', 'Under Counter Frost Free Premium', 'Under Counter Frost Free Premium Freezer - 2 door',
    '265', '1360 x 700 x 860', '-16°C ~ -22°C', '1 x GN 1/1',
    'R290', 'Ventilated Cooling (Frost Free)', '2', '38°C',
    '[]', '["SS 304 Certified"]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO008', 'EGN 3100 F', 'Professional Kitchen', 'Undercounter Premium', 'Under Counter Frost Free Premium', 'Under Counter Frost Free Premium Freezer - 3 door',
    '400', '1795 x 700 x 860', '-16°C ~ -22°C', '1 x GN 1/1',
    'R290', 'Ventilated Cooling (Frost Free)', '3', '38°C',
    '[]', '["SS 304 Certified"]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO009', 'UFD 24SS', 'Professional Kitchen', 'Free Standing Cooler/Freezer', 'Free Standing Freezer', 'Free Standing Freezer with Drawers',
    '120', '600 x 600 x 860', '-15°C ~ 20°C', '',
    '', '', '', '38°C',
    '["Dixell digital controller", "Removable gasket", "Left or Right hinged door (optional)", "HACCP Compliance", "Designed for high ambient conditions", "Free-standing design", "Eco-friendly refrigerant", "Adjustable shelves", "Digital controller", "Removable gasket"]', '[]', '{"no_of_shelves_drawers": "2 Drawer"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO010', 'UF 24SS', 'Professional Kitchen', 'Free Standing Cooler/Freezer', 'Free Standing Freezer', 'Free Standing Freezer with Shelves',
    '120', '600 x 600 x 860', '-15°C ~ 20°C', '',
    '', '', '', '38°C',
    '["Dixell digital controller", "Removable gasket", "HACCP Compliance"]', '[]', '{"no_of_shelves_drawers": "2 Shelves"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO011', 'URD 24SS', 'Professional Kitchen', 'Free Standing Cooler/Freezer', 'Free Standing Refrigerator', 'Free Standing Refrigerator with Drawers',
    '150', '600 x 600 x 860', '2°C ~ 8°C', '',
    '', '', '', '38°C',
    '[]', '[]', '{"no_of_shelves_drawers": "2 Drawer"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO012', 'UR 24SS', 'Professional Kitchen', 'Free Standing Cooler/Freezer', 'Free Standing Refrigerator', 'Free Standing Refrigerator with Shelves',
    '150', '600 x 600 x 860', '2°C ~ 8°C', '',
    '', '', '', '38°C',
    '[]', '[]', '{"no_of_shelves_drawers": "2 Shelves"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO013', 'ES 900', 'Professional Kitchen', 'Saladette Counter', 'Saladette Counter', 'Salad Under Counter - Static with fan assist',
    '240', '900 x 700 x 906', '2°C ~ 8°C', '2 x GN 1/1 + 2 x GN 1/4',
    '', '', '2', '32°C',
    '["GN compatible range", "HACCP Compliance", "Removable gasket", "Digital controller", "Eco-friendly refrigerant", "Adjustable shelves"]', '[]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO014', 'ES 903', 'Professional Kitchen', 'Saladette Counter', 'Saladette Counter', 'Salad Under Counter - Static with fan assist',
    '360', '1365 x 700 x 906', '2°C ~ 8°C', '4 x GN 1/1',
    '', '', '3', '32°C',
    '["GN compatible range", "HACCP Compliance"]', '[]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO015', 'EPS 200', 'Professional Kitchen', 'Under Counter with Prep Table', 'Under Counter with Prep Table', 'Under Counter with Prep Table - Static with fan assist',
    '257', '903 x 700 x 1010', '2°C ~ 8°C', '5 x GN 1/6',
    '', '', '2', '32°C',
    '["GN compatible range", "HACCP Compliance", "Removable gasket", "Digital controller", "Eco-friendly refrigerant", "Adjustable shelves"]', '[]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO016', 'EPS 300', 'Professional Kitchen', 'Under Counter with Prep Table', 'Under Counter with Prep Table', 'Under Counter with Prep Table - Static with fan assist',
    '444', '1365 x 700 x 1010', '2°C ~ 8°C', '8 x GN 1/6',
    '', '', '3', '32°C',
    '["GN compatible range", "HACCP Compliance"]', '["SS 304 Certified"]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO017', 'ESH 2000', 'Professional Kitchen', 'Saladette Counter with Prep Table', 'Saladette Counter with Prep Table', 'Under Counter with Prep Table with Ventilated cooling',
    '337', '1510 x 800 x 1085', '2°C ~ 8°C', '7 x GN 1/3',
    '', '', '2', '38°C',
    '["Heavy duty lockable castors", "GN pan compatible", "Environment Friendly Refrigerant", "Heavy duty adjustable SS legs (optional)", "HACCP Compliance", "Removable gasket", "Digital controller", "Frost-free cooling", "Adjustable shelves"]', '["SS 304 Certified (Inside/Outside)"]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO018', 'ESH 3000', 'Professional Kitchen', 'Saladette Counter with Prep Table', 'Saladette Counter with Prep Table', 'Under Counter with Prep Table with Ventilated cooling',
    '497', '2020 x 800 x 1085', '2°C ~ 8°C', '10 x GN 1/3',
    '', '', '3', '38°C',
    '["Heavy duty lockable castors", "GN pan compatible", "Environment Friendly Refrigerant", "HACCP Compliance"]', '["SS 304 Certified"]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO019', 'SSS 1500', 'Professional Kitchen', 'Sushi & Saladette Counter', 'Sushi Case', 'Sushi Counter',
    '', '1500 x 415 x 300', '2°C ~ 8°C', '5 x GN 1/3',
    '', '', '', '32°C',
    '["LED Lamp", "Heated Front Glass", "Top & Bottom Evaporator", "Safety Curved Glass", "Removable Glass for easy Cleaning", "HACCP Compliance"]', '[]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO020', 'SSS 1800', 'Professional Kitchen', 'Sushi & Saladette Counter', 'Sushi Case', 'Sushi Counter',
    '', '1800 x 415 x 300', '2°C ~ 8°C', '7 x GN 1/3',
    '', '', '', '32°C',
    '["LED Lamp", "Heated Front Glass", "Top & Bottom Evaporator", "Safety Curved Glass", "Removable Glass for easy Cleaning", "HACCP Compliance"]', '[]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO021', 'EVRX 1200', 'Professional Kitchen', 'Sushi & Saladette Counter', 'Salad Display Counter', 'Salad Display Counter',
    '', '1200 x 335 x 435', '2°C ~ 8°C', '5 x GN 1/4',
    '', '', '', '32°C',
    '["Copper evaporator & condenser", "Dixell digital Controller", "HACCP Compliance"]', '[]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO022', 'EVRX 1400', 'Professional Kitchen', 'Sushi & Saladette Counter', 'Salad Display Counter', 'Salad Display Counter',
    '', '1400 x 335 x 435', '2°C ~ 8°C', '6 x GN 1/4',
    '', '', '', '32°C',
    '["Copper evaporator & condenser", "Dixell digital Controller", "HACCP Compliance"]', '[]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO023', 'SD 59 H', 'Professional Kitchen', 'Ice Cream Buffet Freezer', '', 'Ice Cream Buffet Freezer - Food Grade Pans Ideal for Buffet',
    '40', '670 x 735 x 360', '-16°C ~ -18°C', '',
    '', '', '', '',
    '["Dixell digital controller", "GN compatible", "HACCP Compliance", "Copper evaporator", "Extra-strong hinges", "Tempered & low emissivity glass", "Eco-friendly refrigerant", "LED lighting for better visibility"]', '["SS 304 Certified"]', '{"ambient": "32\u00b0C", "gn_pans_1_3": 3, "electrical": "220V, 50Hz, Single phase"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO024', 'E3F', 'Professional Kitchen', 'Frost Top', '', 'Frost Top',
    '', '1102 x 678 x 430', '-10°C', '3 x GN 1/1',
    '', '', '', '32°C',
    '["Copper evaporator", "Environment Friendly Refrigerant", "HACCP Compliance", "Sleek design", "Digital controller", "Uniform cooling", "Easy-to-clean surface"]', '["SS 304 Certified (Inside/Outside)"]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO025', 'EGN 3V', 'Professional Kitchen', 'Cooling Well', '', 'Ventilated Cooling Well',
    '', '1122 x 688 x 636', '2°C ~ 8°C', '3 x GN 1/1',
    '', '', '', '32°C',
    '["Environment Friendly Refrigerant", "Copper evaporator", "HACCP Compliance", "Ventilated cooling", "Digital controller", "GN pan compatibility", "Compact design"]', '["SS 304 Certified (Inside/Outside)"]', '{"notes": "Also available in 2xGN 1/1, 4xGN 1/1"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO026', 'ED5', 'Professional Kitchen', 'Blast Chiller & Freezer', '', 'Blast Chiller / Freezer',
    '169', '800 x 815 x 1015', '', '',
    '', '', '', '',
    '["Rapid chilling", "Eco-friendly refrigerant", "Digital controller", "75mm insulation"]', '["SS 304 Certified"]', '{"operating_temperature_range_c": "-35\u00b0C", "cooling_capacity_chilling": "70\u00b0C to 4\u00b0C in 90 minutes: 18 kg", "cooling_capability_freezing": "70\u00b0C to -18\u00b0C in 240 minutes: 14 kg", "gn_tray_compatibility": "5 (GN 1/1)", "power_supply": "230 V / 50 Hz", "cooling_mode": "Ventilated", "applications": ["Meat Processing", "Hotels & Restaurants", "Dairy", "Food Processing", "Ice Cream", "Healthcare"]}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO027', 'ED10', 'Professional Kitchen', 'Blast Chiller & Freezer', '', 'Blast Chiller / Freezer',
    '368', '800 x 815 x 1645', '', '',
    '', '', '', '',
    '[]', '["SS 304 Certified"]', '{"operating_temperature_range_c": "-35\u00b0C", "cooling_capacity_chilling": "70\u00b0C to 4\u00b0C in 90 minutes: 40 kg", "cooling_capability_freezing": "70\u00b0C to -18\u00b0C in 240 minutes: 28 kg", "gn_tray_compatibility": "10 (GN 1/1)", "power_supply": "230 V / 50 Hz", "cooling_mode": "Ventilated"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO028', 'ED14', 'Professional Kitchen', 'Blast Chiller & Freezer', '', 'Blast Chiller / Freezer',
    '494', '800 x 815 x 2170', '', '',
    '', '', '', '',
    '[]', '["SS 304 Certified"]', '{"operating_temperature_range_c": "-35\u00b0C", "cooling_capacity_chilling": "70\u00b0C to 4\u00b0C in 90 minutes: 55 kg", "cooling_capability_freezing": "70\u00b0C to -18\u00b0C in 240 minutes: 38 kg", "gn_tray_compatibility": "14 (GN 1/1)", "power_supply": "380 V / 50 Hz", "cooling_mode": "Ventilated"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO029', 'CGN 600 C2', 'Professional Kitchen', 'Reach-In Frost Free Classic', '', 'Reach-In Frost Free Classic Cooler - 2 door',
    '600', '680 x 810 x 2000', '2°C ~ 8°C', '2 x GN 1/1',
    'R 290', 'Ventilated Cooling (Frost Free)', '3', '43°C',
    '["Heavy duty lockable castors", "Copper evaporator & condenser", "Lock", "GN compatible", "Environment Friendly Refrigerant", "Left or Right hinged in 2 door unit (optional)", "Single or multi door (optional)", "Heavy duty adjustable SS legs (optional)", "HACCP Compliance", "Removable gasket", "Digital controller", "Frost-free cooling", "Adjustable shelves"]', '[]', '{"ss_grade": "SS 430"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO030', 'CGN 600 F2', 'Professional Kitchen', 'Reach-In Frost Free Classic', '', 'Reach-In Frost Free Classic Freezer - 2 door',
    '600', '680 x 810 x 2000', '-16°C ~ -22°C', '2 x GN 1/1',
    'R 290', 'Ventilated Cooling (Frost Free)', '3', '43°C',
    '[]', '[]', '{"ss_grade": "SS 430"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO031', 'CGN 1200 C4', 'Professional Kitchen', 'Reach-In Frost Free Classic', '', 'Reach-In Frost Free Classic Cooler - 4 door',
    '1200', '1340 x 810 x 2000', '2°C ~ 8°C', '2 x GN 1/1',
    'R 290', 'Ventilated Cooling (Frost Free)', '6', '43°C',
    '[]', '[]', '{"ss_grade": "SS 430"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO032', 'CGN 1200 F4', 'Professional Kitchen', 'Reach-In Frost Free Classic', '', 'Reach-In Frost Free Classic Freezer - 4 door',
    '1200', '1340 x 810 x 2000', '-16°C ~ -22°C', '2 x GN 1/1',
    'R 290', 'Ventilated Cooling (Frost Free)', '6', '43°C',
    '[]', '[]', '{"ss_grade": "SS 430"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO033', 'CGN 600 CF (Combi)', 'Professional Kitchen', 'Reach-In Frost Free Classic', '', 'Reach-In Frost Free Classic Combi (Cooler + Freezer)',
    '300C + 300F', '680 x 810 x 2000', '2°C~8°C / -16°C~-22°C', '2 x GN 1/1',
    'R 290 / R 290', 'Ventilated Cooling (Frost Free)', '3', '43°C',
    '[]', '[]', '{"ss_grade": "SS 430"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO034', 'CGN 1200 CF (Combi)', 'Professional Kitchen', 'Reach-In Frost Free Classic', '', 'Reach-In Frost Free Classic Combi (Cooler + Freezer)',
    '600C + 600F', '1340 x 845 x 2000', '2°C~8°C / -16°C~-22°C', '2 x GN 1/1',
    'R 290 / R 290', 'Static', '6', '43°C',
    '[]', '[]', '{"ss_grade": "SS 430"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO035', 'CGN 2100 C', 'Professional Kitchen', 'Under Counter Frost Free Classic', '', 'Under Counter Frost Free Classic Cooler - 2 door',
    '265', '1360 x 700 x 860', '2°C ~ 8°C', '1 x GN 1/1',
    'R600A', 'Ventilated Cooling (Frost Free)', '2', '38°C',
    '["Removable gasket", "Heavy duty lockable castors", "Copper evaporator & condenser", "Lock", "GN compatible frost free range", "Heavy duty adjustable SS legs (optional)", "HACCP Compliance", "Rounded internal edges", "Digital controller", "Eco-friendly refrigerant", "Adjustable shelves"]', '[]', '{"ss_grade": "SS 430"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO036', 'CGN 3100 C', 'Professional Kitchen', 'Under Counter Frost Free Classic', '', 'Under Counter Frost Free Classic Cooler - 3 door',
    '400', '1795 x 700 x 860', '2°C ~ 8°C', '1 x GN 1/1',
    'R600A', 'Ventilated Cooling (Frost Free)', '3', '38°C',
    '[]', '[]', '{"ss_grade": "SS 430"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO037', 'CGN 2100 F', 'Professional Kitchen', 'Under Counter Frost Free Classic', '', 'Under Counter Frost Free Classic Freezer - 2 door',
    '265', '1360 x 700 x 860', '-16°C ~ -22°C', '1 x GN 1/1',
    'R290', 'Ventilated Cooling (Frost Free)', '2', '38°C',
    '[]', '[]', '{"ss_grade": "SS 430"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO038', 'CGN 3100 F', 'Professional Kitchen', 'Under Counter Frost Free Classic', '', 'Under Counter Frost Free Classic Freezer - 3 door',
    '400', '1795 x 700 x 860', '-16°C ~ -22°C', '1 x GN 1/1',
    'R290', 'Ventilated Cooling (Frost Free)', '3', '38°C',
    '[]', '[]', '{"ss_grade": "SS 430"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO039', 'RI 551 C', 'Professional Kitchen', 'Reach-In Static', '', 'Reach-In Static Cooler - 1 door',
    '500', '680 x 710 x 2000', '2°C ~ 8°C', 'NA',
    'R 290', 'Static Cooling', '3', '38°C',
    '["Removable gasket", "Heavy duty lockable castors", "Lock", "Single or multi door (optional)", "Heavy duty adjustable SS legs (optional)", "HACCP Compliance", "Adjustable shelves", "Self-closing Door", "Eco-friendly refrigerant", "Digital controller"]', '[]', '{"material": "SS 201", "notes": "Also available in 3 door"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO040', 'RI 551 F', 'Professional Kitchen', 'Reach-In Static', '', 'Reach-In Static Freezer - 1 door',
    '500', '680 x 710 x 2000', '-16°C ~ -22°C', '',
    'R 290', 'Static Cooling', '3', '38°C',
    '[]', '[]', '{"material": "SS 201"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO041', 'RI 1101 C', 'Professional Kitchen', 'Reach-In Static', '', 'Reach-In Static Cooler - 2 door',
    '1000', '1340 x 710 x 2000', '2°C ~ 8°C', '',
    'R 290', 'Static Cooling', '6', '38°C',
    '[]', '[]', '{"material": "SS 201"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO042', 'RI 1101 F', 'Professional Kitchen', 'Reach-In Static', '', 'Reach-In Static Freezer - 2 door',
    '1000', '1340 x 710 x 2000', '-16°C ~ -22°C', '',
    'R 290', 'Static Cooling', '6', '38°C',
    '[]', '[]', '{"material": "SS 201"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO043', 'UC 1502C', 'Professional Kitchen', 'Under Counter Static', '', 'Under Counter Static Cooler - 2 door',
    '265', '1360 x 700 x 860', '2°C ~ 8°C', '1 x GN 1/1',
    'R290', 'Static Cooling', '2', '38°C',
    '["Adjustable shelves", "Heavy duty lockable castors", "Lock", "Heavy duty adjustable SS legs (optional)", "HACCP Compliance", "Removable gasket", "Digital controller", "Eco-friendly refrigerant", "Rounded internal edges"]', '[]', '{"material": "SS 201", "notes": "Also available in 3 door"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO044', 'UC 1802C', 'Professional Kitchen', 'Under Counter Static', '', 'Under Counter Static Cooler - 3 door',
    '400', '1795 x 700 x 860', '2°C ~ 8°C', '1 x GN 1/1',
    'R290', 'Static Cooling', '3', '38°C',
    '[]', '[]', '{"material": "SS 201"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO045', 'EWG 51 D', 'Bar Refrigeration', 'Wine Chillers', '', 'Wine Cooler - Dual Zone',
    '', '595 x 575 x 820', '5°C ~ 12°C & 12°C ~ 22°C', '',
    '', '', '6', '35°C',
    '["Actual and set temperature display", "Lock", "No frost", "Elegant stainless steel door frame", "Double layer anti UV tinted glass door", "Cabinet colour: Black", "Charcoal filter", "Dual temperature zone", "Anti-vibration system", "Pull-out beech wooden shelves", "Blue LED Lighting", "Digital controller", "Self-closing Door", "Double layer glass", "Internal LED light"]', '[]', '{"capacity_bottles": "46 Bottles (Standard 750 ml)", "power_consumption_w": 70, "adjustable_feet_lock": "Yes / Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO046', 'EWG 130 D', 'Bar Refrigeration', 'Wine Chillers', '', 'Wine Cooler - Dual Zone',
    '', '595 x 680 x 1417', '5°C ~ 12°C & 12°C ~ 22°C', '',
    '', '', '11', '35°C',
    '[]', '[]', '{"capacity_bottles": "121 Bottles (Standard 750 ml)", "power_consumption_w": 120, "adjustable_feet_lock": "Yes / Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO047', 'EBB 1D/1D SS', 'Bar Refrigeration', 'Back Bars', '', '1 Door Back Bar',
    '129', '600 x 535 x 895', '2°C ~ 10°C', '',
    '', '', '1 x 2', '35°C',
    '["Double layer glass", "Digital controller", "Self-closing Door", "Internal LED light"]', '[]', '{"power_consumption_w": 230, "castors_lock": "No / Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO048', 'EBB 2D/2D SS', 'Bar Refrigeration', 'Back Bars', '', '2 Door Back Bar',
    '202', '900 x 535 x 895', '2°C ~ 10°C', '',
    '', '', '2 x 2', '35°C',
    '[]', '[]', '{"power_consumption_w": 230, "castors_lock": "No / Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO049', 'EBB 3D/3D SS', 'Bar Refrigeration', 'Back Bars', '', '3 Door Back Bar',
    '320', '1350 x 535 x 895', '2°C ~ 10°C', '',
    '', '', '3 x 2', '35°C',
    '[]', '[]', '{"power_consumption_w": 320, "castors_lock": "No / Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO050', 'EGF 5G', 'Bar Refrigeration', 'Under Counter Bars', '', '1 Door Glass Froster',
    '100', '595 x 525 x 875', '-2°C ~ -10°C', '',
    '', '', '2', '38°C',
    '["Double Insulated glass", "Adjustable shelves", "Lockable Doors", "Internal LED light", "Eco-friendly refrigerant"]', '[]', '{"power_consumption_w": 280, "castors": "No"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO051', 'EGN 2100 CG', 'Bar Refrigeration', 'Under Counter Bars', '', '2 Door Under Counter Bar',
    '265', '1360 x 700 x 860', '2°C ~ 10°C', '',
    '', '', '2', '38°C',
    '[]', '[]', '{"power_consumption_w": 396, "castors": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO052', 'EGN 3100 CG', 'Bar Refrigeration', 'Under Counter Bars', '', '3 Door Under Counter Bar',
    '400', '1795 x 700 x 860', '2°C ~ 10°C', '',
    '', '', '3', '38°C',
    '[]', '[]', '{"power_consumption_w": 514, "castors": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO053', 'Mini Lady', 'Bar Refrigeration', 'Beer & Beverage', 'VinService Draft Beer System', 'Beer Cooling Unit',
    '', '407 x 407 x 280', '', '',
    '', '', '', '',
    '[]', '[]', '{"compressor": "1/6 Hp", "tank_capacity_h2o_ltrs": 12, "ice_bank_kgs": 4, "no_of_coils_keg": "1-2 Coils", "rate_of_drink_cooling_per_min_200ml": "2 Glass", "cooling_capacity_ltrs_hr": "25 Ltrs/Hr"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO054', 'Life 100', 'Bar Refrigeration', 'Beer & Beverage', 'VinService Draft Beer System', 'Beer Cooling Unit',
    '', '420 x 440 x 760', '', '',
    '', '', '', '',
    '[]', '[]', '{"compressor": "1/3 Hp", "tank_capacity_h2o_ltrs": 36, "ice_bank_kgs": 15, "no_of_coils_keg": "1-4 Coils", "rate_of_drink_cooling_per_min_200ml": "8 Glass", "cooling_capacity_ltrs_hr": "100 Ltrs/Hr"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO055', 'Life 130', 'Bar Refrigeration', 'Beer & Beverage', 'VinService Draft Beer System', 'Beer Cooling Unit',
    '', '480 x 490 x 840', '', '',
    '', '', '', '',
    '[]', '[]', '{"compressor": "1/2 Hp", "tank_capacity_h2o_ltrs": 50, "ice_bank_kgs": 23, "no_of_coils_keg": "1-8 Coils", "rate_of_drink_cooling_per_min_200ml": "10 Glass", "cooling_capacity_ltrs_hr": "130 Ltrs/Hr"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO056', 'Life 250', 'Bar Refrigeration', 'Beer & Beverage', 'VinService Draft Beer System', 'Beer Cooling Unit',
    '', '590 x 900 x 720', '', '',
    '', '', '', '',
    '[]', '[]', '{"compressor": "3/4 Hp", "tank_capacity_h2o_ltrs": 90, "ice_bank_kgs": 40, "no_of_coils_keg": "1-10 Coils", "rate_of_drink_cooling_per_min_200ml": "20 Glass", "cooling_capacity_ltrs_hr": "250 Ltrs/Hr"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO057', 'Kegerator (4 Slim Kegs)', 'Bar Refrigeration', 'Beer & Beverage', 'VinService Draft Beer System', 'Kegerator - 4 Slim Kegs 20 Ltr',
    '', '604 x 790 x 1000', '', '',
    '', '', '', '',
    '[]', '[]', '{"compressor": "1/4 Hp"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO058', 'Kegerator (6 Slim Kegs)', 'Bar Refrigeration', 'Beer & Beverage', 'VinService Draft Beer System', 'Kegerator - 6 Slim Kegs 20 Ltr',
    '', '1135 x 740 x 1020', '', '',
    '', '', '', '',
    '[]', '[]', '{"compressor": "1/3 Hp"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO059', 'EDC 901 F3', 'Confectionery Showcase', 'Confectionery Showcase Classic', '', 'Confectionery Showcase Classic',
    '', '900 x 700 x 1250', '2°C ~ 8°C', '',
    '', '', 'Base + 3', '32°C ambient temperature / 55% RH',
    '["Stainless steel interior", "Lockable Castors for easy mobility", "Copper condenser", "Copper evaporator", "Available in Stainless Steel finish", "Double pane glass", "Digital controller", "Ventilated cooling", "LED light on each shelves"]', '[]', '{"input_power_w": 638}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO060', 'EDC 1201 F3', 'Confectionery Showcase', 'Confectionery Showcase Classic', '', 'Confectionery Showcase Classic',
    '', '1200 x 700 x 1250', '2°C ~ 8°C', '',
    '', '', 'Base + 3', '32°C',
    '[]', '[]', '{"input_power_w": 704}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO061', 'EDC 1501 F3', 'Confectionery Showcase', 'Confectionery Showcase Classic', '', 'Confectionery Showcase Classic',
    '', '1500 x 700 x 1250', '2°C ~ 8°C', '',
    '', '', 'Base + 3', '32°C',
    '[]', '[]', '{"input_power_w": 820}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO062', 'EDC 1801 F3', 'Confectionery Showcase', 'Confectionery Showcase Classic', '', 'Confectionery Showcase Classic',
    '', '1800 x 700 x 1250', '2°C ~ 8°C', '',
    '', '', 'Base + 3', '32°C',
    '[]', '[]', '{"input_power_w": 876}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO063', 'EDC 702 F3', 'Confectionery Showcase', 'Confectionery Showcase Platinum', '', 'Confectionery Showcase Platinum',
    '', '700 x 665 x 1235', '2°C ~ 8°C', '',
    '', '', 'Base + 3', '32°C',
    '["Available in Titanium Steel & Gold Finish", "Stainless steel interior", "Lockable Castors for easy mobility", "Copper evaporator", "Copper condenser", "Triple pane heated glass", "Digital controller", "Ventilated cooling", "LED light on each shelves"]', '[]', '{"input_power_w": 612}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO064', 'EDC 902 F3', 'Confectionery Showcase', 'Confectionery Showcase Platinum', '', 'Confectionery Showcase Platinum',
    '', '900 x 665 x 1235', '2°C ~ 8°C', '',
    '', '', 'Base + 3', '32°C',
    '[]', '[]', '{"input_power_w": 638}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO065', 'EDC 1202 F3', 'Confectionery Showcase', 'Confectionery Showcase Platinum', '', 'Confectionery Showcase Platinum',
    '', '1200 x 665 x 1235', '2°C ~ 8°C', '',
    '', '', 'Base + 3', '32°C',
    '[]', '[]', '{"input_power_w": 704}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO066', 'EHTC 100', 'Confectionery Showcase', 'Confectionery Showcase Counter Top', '', 'Confectionery Showcase Counter Top - Cold',
    '', '695 x 462 x 670', '2°C ~ 8°C', '',
    '', '', 'Base + 2', '32°C',
    '["Countertop design", "Tempered & low emissivity glass", "Eco-friendly refrigerant", "LED lighting"]', '[]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO067', 'EHTC 160', 'Confectionery Showcase', 'Confectionery Showcase Counter Top', '', 'Confectionery Showcase Counter Top - Cold',
    '', '873 x 580 x 670', '2°C ~ 8°C', '',
    '', '', 'Base + 2', '32°C',
    '[]', '[]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO068', 'EHTH 160', 'Confectionery Showcase', 'Confectionery Showcase Counter Top', '', 'Confectionery Showcase Counter Top - Hot',
    '', '873 x 580 x 670', '30°C ~ 90°C', '',
    '', '', 'Base + 2', '32°C',
    '[]', '[]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO069', 'ED 1202 C3', 'Confectionery Showcase', 'Confectionery Showcase Counter Top', '', 'Confectionery Showcase Counter Top - Curve glass (against order with MOQ)',
    '', '', '', '',
    '', '', '', '',
    '[]', '[]', '{}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO070', 'EIM 26', 'Ice Machine', 'Ice Machines', '', 'Ice Machine',
    '', '', '', '',
    '', '', '', '',
    '["SS 304 Body", "Low Energy Consumption", "Low Water Consumption", "Air-cooled system", "Control board with display", "Vertical evaporator", "Detection Technology"]', '[]', '{"compatible_bin_model": "Inbuilt", "rated_capacity_kg_per_24hrs": 25, "bin_size_kg": 7, "machine_dimensions_mm": "380 x 470 x 600", "power_consumption_per_24hrs_w": 180, "water_consumption_per_24hrs_l": 35, "cube_size_mm": "22 x 22 x 22", "electricals": "220V / 1 Ph / 50 Hz", "applications": ["Bar", "HORECA", "Hospitals", "Sports", "Pharma"], "available_options": ["Flake & Dice Ice"]}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO071', 'EIM 41 BW', 'Ice Machine', 'Ice Machines', '', 'Ice Machine with Bottled Water option',
    '', '', '', '',
    '', '', '', '',
    '[]', '[]', '{"compatible_bin_model": "Inbuilt", "rated_capacity_kg_per_24hrs": 36, "bin_size_kg": 15, "machine_dimensions_mm": "500 x 450 x 800", "power_consumption_per_24hrs_w": 300, "water_consumption_per_24hrs_l": 50, "cube_size_mm": "22 x 22 x 22", "electricals": "220V / 1 Ph / 50 Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO072', 'EIM 61 BW', 'Ice Machine', 'Ice Machines', '', 'Ice Machine with Bottled Water option',
    '', '', '', '',
    '', '', '', '',
    '[]', '[]', '{"compatible_bin_model": "Inbuilt", "rated_capacity_kg_per_24hrs": 55, "bin_size_kg": 18, "machine_dimensions_mm": "500 x 590 x 850", "power_consumption_per_24hrs_w": 360, "water_consumption_per_24hrs_l": 80, "cube_size_mm": "22 x 22 x 22", "electricals": "220V / 1 Ph / 50 Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO073', 'EIM 101', 'Ice Machine', 'Ice Machines', '', 'Ice Machine',
    '', '', '', '',
    '', '', '', '',
    '[]', '[]', '{"compatible_bin_model": "Inbuilt", "rated_capacity_kg_per_24hrs": 95, "bin_size_kg": 36, "machine_dimensions_mm": "660 x 685 x 920", "power_consumption_per_24hrs_w": 580, "water_consumption_per_24hrs_l": 150, "cube_size_mm": "22 x 22 x 22", "electricals": "220V / 1 Ph / 50 Hz", "notes": "EIM 41/101 are available with half dice cube sizes of 13 x 22 x 22mm"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO074', 'EIM 201', 'Ice Machine', 'Ice Machines', '', 'Ice Machine with separate bin',
    '', '', '', '',
    '', '', '', '',
    '[]', '[]', '{"compatible_bin_model": "B 275", "rated_capacity_kg_per_24hrs": 191, "bin_size_kg": 125, "machine_dimensions_mm": "560 x 830 x 1718", "power_consumption_per_24hrs_w": 1100, "water_consumption_per_24hrs_l": 286, "cube_size_mm": "22 x 22 x 22", "electricals": "220V / 1 Ph / 50 Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO075', 'EIM 351', 'Ice Machine', 'Ice Machines', '', 'Ice Machine with separate bin',
    '', '', '', '',
    '', '', '', '',
    '[]', '[]', '{"compatible_bin_model": "B 375", "rated_capacity_kg_per_24hrs": 318, "bin_size_kg": 170, "machine_dimensions_mm": "760 x 830 x 1718", "power_consumption_per_24hrs_w": 1420, "water_consumption_per_24hrs_l": 477, "cube_size_mm": "22 x 22 x 22", "electricals": "220V / 1 Ph / 50 Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO076', 'EIM 501', 'Ice Machine', 'Ice Machines', '', 'Ice Machine with separate bin',
    '', '', '', '',
    '', '', '', '',
    '[]', '[]', '{"compatible_bin_model": "B 375", "rated_capacity_kg_per_24hrs": 455, "bin_size_kg": 170, "machine_dimensions_mm": "760 x 830 x 1893", "power_consumption_per_24hrs_w": 2300, "water_consumption_per_24hrs_l": 682, "cube_size_mm": "22 x 22 x 22", "electricals": "380V/1Ph/50 Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO077', 'EIM 1001', 'Ice Machine', 'Ice Machines', '', 'Ice Machine with separate bin',
    '', '', '', '',
    '', '', '', '',
    '[]', '[]', '{"compatible_bin_model": "B 775", "rated_capacity_kg_per_24hrs": 909, "bin_size_kg": 350, "machine_dimensions_mm": "1227 x 973 x 2048", "power_consumption_per_24hrs_w": 3800, "water_consumption_per_24hrs_l": 1363, "cube_size_mm": "22 x 22 x 22", "electricals": "380V/1Ph/50 Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO078', 'EFM 101', 'Ice Machine', 'Ice Flaker', '', 'Ice Flaker',
    '', '', '', '',
    '', '', '', '',
    '[]', '[]', '{"compatible_bin_model": "Inbuilt", "rated_capacity_kg_per_24hrs": 100, "bin_size_kg": 20, "machine_dimensions_mm": "520 x 550 x 960", "power_consumption_per_24hrs_w": 330, "water_consumption_per_24hrs_l": 110, "cube_size_mm": "NA", "electricals": "220V / 1 Ph / 50 Hz", "body": "SS 304", "applications": ["Seafood Display", "Salad Bars & Buffets", "Bakeries & Desserts", "Medical Storage", "Catering & Events"]}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO079', 'JD LP 8X2', 'Beverage Solution', 'Juice Dispenser', '', 'Juice Dispenser - 2 Bowl',
    '8x2', '290 x 400 x 680', '', '',
    '', '', '', '32°C',
    '["Food-grade polycarbonate (PC) bowls", "Intelligent temperature control", "Stainless evaporator, built-in copper coil", "Elegant appearance", "Super cooling", "Low Maintenance", "Humanized residual liquid pipe design", "Easy dispensing mechanism", "High-volume Dispensing"]', '[]', '{"power_watts": 230, "energy_consumption_a": 1.6, "weight_kg": 24, "electrical": "220v/50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO080', 'JD LJH 16X2', 'Beverage Solution', 'Juice Dispenser', '', 'Juice Dispenser - 2 Bowl',
    '16x2', '340 x 485 x 635', '', '',
    '', '', '', '32°C',
    '[]', '[]', '{"power_watts": 260, "energy_consumption_a": 2.0, "weight_kg": 25, "electrical": "220v/50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO081', 'JD LJH 20', 'Beverage Solution', 'Juice Dispenser', '', 'Juice Dispenser - Single Bowl with Agitator',
    '20', '372 x 412 x 724', '', '',
    '', '', '', '32°C',
    '["Food-grade polycarbonate (PC) bowl", "Intelligent temperature control", "Stainless evaporator, built-in copper coil", "Elegant appearance", "Super cooling", "Agitator", "Advance cooling system", "Low Maintenance", "Easy dispensing mechanism", "High-volume Dispensing"]', '[]', '{"power_watts": 180, "energy_consumption_a": 2.0, "weight_kg": 21, "electrical": "220v/50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO082', 'FB XC 112', 'Beverage Solution', 'Slush Dispenser', '', 'Slush Dispenser - 1 Bowl',
    '12 x 1', '340 x 480 x 820', '', '',
    '', '', '', '32°C',
    '["High density food grade polycarbonate (PC) bowls", "Liquid crystal display, intelligent temperature control", "Stainless steel evaporator, built-in copper coil", "Super cooling, humanized residual liquid pipe design", "Energy-saving mode", "Quick cooling for fast slush", "Easy pour dispenser", "User-friendly control & LED display"]', '[]', '{"power_watts": 480, "energy_consumption_a": 3.3, "weight_kg": 31, "electrical": "220v/50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO083', 'FB XC 224', 'Beverage Solution', 'Slush Dispenser', '', 'Slush Dispenser - 2 Bowl',
    '12 x 2', '400 x 480 x 820', '', '',
    '', '', '', '32°C',
    '[]', '[]', '{"power_watts": 900, "energy_consumption_a": 5.5, "weight_kg": 46, "electrical": "220v/50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO084', 'FB XC 336', 'Beverage Solution', 'Slush Dispenser', '', 'Slush Dispenser - 3 Bowl',
    '12 x 3', '600 x 480 x 820', '', '',
    '', '', '', '32°C',
    '[]', '[]', '{"power_watts": 1050, "energy_consumption_a": 6.0, "weight_kg": 65, "electrical": "220v/50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO085', 'SSD 720T', 'Beverage Solution', 'Softy Ice Cream Machine', '', 'Softy Ice Cream Machine - Dual Flavor',
    '', '540 x 870 x 810', '', '',
    'R404a, 1.5 HP', 'Air-cooled', '', '38°C',
    '["SS beater", "Low premix alarm", "Night mode", "Defrost option", "Pre-mix guard for flavor protection", "Dual flavor serving option", "Fast cooling System", "High production capacity"]', '[]', '{"voltage": "220v/50Hz", "rated_input_w": 2600, "drive_motor_w": 1100, "freezing_cylinder_l": "2 x 1.6 L", "mix_hopper_l": "2 x 5.5 L", "production_l_hr": 24}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO086', 'D 200', 'Beverage Solution', 'Softy Ice Cream Machine', '', 'Softy Ice Cream Machine - Single Flavor',
    '', '220 x 710 x 740', '', '',
    'R404a, 3/4 HP', 'Air-cooled', '', '38°C',
    '[]', '[]', '{"voltage": "220v/50Hz", "rated_input_w": 1200, "drive_motor_w": 200, "freezing_cylinder_l": "1.6 L", "mix_hopper_l": "5.5 L", "production_l_hr": 13}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO087', 'RB 31', 'Mini Bar & Mini Fridge', 'Mini Bar', '', 'Mini Bar - Solid Door 30L',
    '30', '402 x 440 x 500', '2°C ~ 10°C', '',
    '', '', '', '27°C',
    '["Temperature controller", "Silent Operation", "Reversible Door", "Low energy consumption", "Perfect for hotels under 27\u00b0C ambient", "Available sizes 30 to 60 Ltrs"]', '["CE", "CB", "UL"]', '{"door_option": "Solid", "input_power_w": 65, "energy_consumption_kwh": 0.7, "technology": "Absorption Technology", "color_options": ["Black", "Brown", "White"], "moq_for_brown_white": 200}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO088', 'RB 31 G', 'Mini Bar & Mini Fridge', 'Mini Bar', '', 'Mini Bar - Glass Door 30L',
    '30', '402 x 428 x 500', '2°C ~ 10°C', '',
    '', '', '', '27°C',
    '[]', '[]', '{"door_option": "Glass", "input_power_w": 65, "energy_consumption_kwh": 0.7}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO089', 'RB 41', 'Mini Bar & Mini Fridge', 'Mini Bar', '', 'Mini Bar - Solid Door 40L',
    '40', '402 x 465 x 560', '2°C ~ 10°C', '',
    '', '', '', '27°C',
    '[]', '[]', '{"door_option": "Solid", "input_power_w": 65, "energy_consumption_kwh": 0.7}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO090', 'RB 41 G', 'Mini Bar & Mini Fridge', 'Mini Bar', '', 'Mini Bar - Glass Door 40L',
    '40', '402 x 453 x 560', '2°C ~ 10°C', '',
    '', '', '', '27°C',
    '[]', '[]', '{"door_option": "Glass", "input_power_w": 65, "energy_consumption_kwh": 0.7}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO091', 'RF 55 G', 'Mini Bar & Mini Fridge', 'Mini Fridge', '', 'Mini Fridge - Glass Door 50L',
    '50', '450 x 470 x 500', '2°C ~ 10°C', '',
    '', '', '', '38°C',
    '["Low Noise", "Designed to perform at 35\u00b0C", "Lock (Optional)", "Low energy consumption", "Temperature controller", "Eco-friendly refrigerant", "Compact design maximizes space"]', '["100% CFC FREE REFRIGERANT"]', '{"door_option": "Glass", "input_power_w": 80, "energy_consumption_kwh": 1.0, "container_20_40hc": "220/550", "color_options": ["Black", "Silver", "Grey"], "ideal_for": ["Hotel Room", "Offices", "Bedroom", "Vanity Room", "Pooja Room"]}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO092', 'RF 57', 'Mini Bar & Mini Fridge', 'Mini Fridge', '', 'Mini Fridge - Solid Door 48L',
    '48', '455 x 460 x 520', '2°C ~ 10°C', '',
    '', '', '', '38°C',
    '[]', '[]', '{"door_option": "Solid", "input_power_w": 55, "energy_consumption_kwh": 0.7, "container_20_40hc": "220/575"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO093', 'RF 107', 'Mini Bar & Mini Fridge', 'Mini Fridge', '', 'Mini Fridge - Solid Door 92L',
    '92', '455 x 495 x 845', '2°C ~ 10°C', '',
    '', '', '', '38°C',
    '[]', '[]', '{"door_option": "Solid", "input_power_w": 55, "energy_consumption_kwh": 0.7, "container_20_40hc": "110/230"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO094', 'ECG 26', 'Retail Solution', 'Special Products', '', 'Counter Top Showcase/Cooler',
    '26', '330 x 415 x 610', '2°C ~ 8°C', '',
    '', '', '', '35°C',
    '[]', '[]', '{"no_of_330ml_cans": 24, "input_power_w": 76, "electrical": "220V, 50Hz, Single phase"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO095', 'ECG 60', 'Retail Solution', 'Special Products', '', 'Counter Top Cooler',
    '60', '435 x 455 x 700', '2°C ~ 8°C', '',
    '', '', '', '35°C',
    '[]', '[]', '{"no_of_330ml_cans": 78, "input_power_w": 120}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO096', 'ECG 85', 'Retail Solution', 'Special Products', '', 'Counter Top Cooler',
    '85', '480 x 510 x 805', '2°C ~ 8°C', '',
    '', '', '', '35°C',
    '[]', '[]', '{"no_of_330ml_cans": 105, "input_power_w": 120}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO097', 'ECG 105', 'Retail Solution', 'Special Products', '', 'Counter Top Cooler',
    '10', '470 x 535 x 812', '2°C ~ 8°C', '',
    '', '', '', '35°C',
    '[]', '[]', '{"no_of_330ml_cans": 90, "input_power_w": 120}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO098', 'CC 61', 'Retail Solution', 'Special Products', '', 'Counter Top Cooler',
    '60', '451 x 925', '2°C ~ 8°C', '',
    '', '', '', '32°C',
    '[]', '[]', '{"no_of_330ml_cans": 88, "input_power_w": 129}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO099', 'SD 51 C', 'Retail Solution', 'Special Products', '', 'Counter Top Freezer',
    '50', '550 x 533 x 660', '-18°C ~ -20°C', '',
    '', '', '', '32°C',
    '[]', '[]', '{"input_power_w": 197}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO100', 'BC9CN', 'Retail Solution', 'Milk Cooler', '', 'Milk Cooler - available in Solid or Glass Door',
    '9', '220 x 452 x 456', '2°C ~ 5°C', '',
    '', '', '', '',
    '["Temperature display", "Two side port for easy placement on either side of coffee machine", "Built in fan for appropriate milk temperature", "Built in Glass container for fresh milk storage", "Digital controller", "Energy-efficient compressor", "Dual-side Port"]', '[]', '{"ambient": "32\u00b0C", "capacity_milk_container": "4.5 ltr milk container", "input_power_w": 76, "electrical": "220V, 50Hz, Single phase"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO101', 'EKG 205 AG', 'Retail Solution', 'Premium Series Flat Glass Top', '', 'Flat Glass Top Freezer',
    '197', '934 x 574 x 825', '-16°C ~ -24°C', '',
    '', '', '', '',
    '["High performing cooling systems", "Low power consumptions", "High insulations", "Sliding glass door", "Durable castors", "Digital Display", "Unique dual condenser", "Eco-friendly refrigerant", "LED Inside"]', '[]', '{"star_rating": 5, "baskets": "2 Q3", "led": "No", "digital_display": "Yes", "energy_consumption_kwh_yr": 970, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO102', 'EKG 305 AG', 'Retail Solution', 'Premium Series Flat Glass Top', '', 'Flat Glass Top Freezer',
    '285', '1014 x 694 x 844', '-16°C ~ -24°C', '',
    '', '', '', '',
    '[]', '[]', '{"star_rating": 5, "baskets": "1 Q3 + 1 Q6", "led": "Yes", "digital_display": "Yes", "energy_consumption_kwh_yr": 1113, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO103', 'EKG 405 AG', 'Retail Solution', 'Premium Series Flat Glass Top', '', 'Flat Glass Top Freezer',
    '363', '1224 x 694 x 844', '-16°C ~ -24°C', '',
    '', '', '', '',
    '[]', '[]', '{"star_rating": 5, "baskets": "1 Q3 + 1 Q6", "led": "Yes", "digital_display": "Yes", "energy_consumption_kwh_yr": 1278, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO104', 'EKG 505 AG', 'Retail Solution', 'Premium Series Flat Glass Top', '', 'Flat Glass Top Freezer',
    '439', '1434 x 694 x 844', '-16°C ~ -24°C', '',
    '', '', '', '',
    '[]', '[]', '{"star_rating": 5, "baskets": "1 Q3 + 1 Q6", "led": "Yes", "digital_display": "Yes", "energy_consumption_kwh_yr": 1672, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO105', 'EKG 650 G', 'Retail Solution', 'Premium Series Flat Glass Top', '', 'Flat Glass Top Freezer',
    '566', '1800 x 694 x 850', '-16°C ~ -24°C', '',
    '', '', '', '',
    '[]', '[]', '{"star_rating": 5, "baskets": 9, "led": "Yes", "digital_display": "Yes", "energy_consumption_kwh_yr": 2007, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO106', 'EKG 215 DPG', 'Retail Solution', 'Premium Series Curve Glass Top', '', 'Curve Glass Top Freezer',
    '169', '785 x 656 x 839', '-16°C ~ -24°C', '',
    '', '', '', '',
    '["High insulations", "Low power consumptions", "Sliding glass door", "Durable castors", "Digital Display", "Unique dual condenser", "Eco-friendly refrigerant", "LED Inside"]', '[]', '{"star_rating": 4, "baskets": 1, "led": "Yes", "digital_display": "Yes", "energy_consumption_kwh_yr": 920, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO107', 'EKG 310 DLG', 'Retail Solution', 'Premium Series Curve Glass Top', '', 'Curve Glass Top Freezer',
    '255', '1000 x 649 x 850', '-16°C ~ -24°C', '',
    '', '', '', '',
    '[]', '[]', '{"star_rating": 3, "baskets": 4, "led": "Yes", "digital_display": "No", "energy_consumption_kwh_yr": 1460, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO108', 'EKG 410 DLG', 'Retail Solution', 'Premium Series Curve Glass Top', '', 'Curve Glass Top Freezer',
    '330', '1224 x 649 x 850', '-16°C ~ -24°C', '',
    '', '', '', '',
    '[]', '[]', '{"star_rating": 4, "baskets": 4, "led": "Yes", "digital_display": "Yes", "energy_consumption_kwh_yr": 1552, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO109', 'EKG 415 DLG', 'Retail Solution', 'Premium Series Curve Glass Top', '', 'Curve Glass Top Freezer',
    '333', '1225 x 695 x 918', '-16°C ~ -24°C', '',
    '', '', '', '',
    '[]', '[]', '{"star_rating": 4, "baskets": 5, "led": "Yes", "digital_display": "Yes", "energy_consumption_kwh_yr": 1321, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO110', 'EKG 626 DLG', 'Retail Solution', 'Premium Series Curve Glass Top', '', 'Curve Glass Top Freezer',
    '574', '1844 x 694 x 850', '-16°C ~ -24°C', '',
    '', '', '', '',
    '[]', '[]', '{"star_rating": 4, "baskets": 8, "led": "Yes", "digital_display": "Yes", "energy_consumption_kwh_yr": 2336, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO111', 'MC 76', 'Retail Solution', 'Premium Series Hard Top - Milk Cooler', '', 'Hard Top Milk Cooler',
    '76', '404 x 610 x 830', '2°C ~ 8°C', '',
    '', '', '', '',
    '[]', '[]', '{"no_of_doors": 1, "baskets": 1, "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO112', 'MC 105G', 'Retail Solution', 'Premium Series Hard Top - Milk Cooler', '', 'Hard Top Milk Cooler',
    '98', '550 x 475 x 848', '2°C ~ 8°C', '',
    '', '', '', '',
    '[]', '[]', '{"energy_consumption_kwh_yr": 310, "no_of_doors": 1, "baskets": 1, "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO113', 'MC 205G', 'Retail Solution', 'Premium Series Hard Top - Milk Cooler', '', 'Hard Top Milk Cooler',
    '197', '820 x 554 x 848', '2°C ~ 8°C', '',
    '', '', '', '',
    '[]', '[]', '{"energy_consumption_kwh_yr": 493, "no_of_doors": 1, "baskets": 1, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO114', 'PCF 110', 'Retail Solution', 'Premium Series Hard Top - FOW', '', 'Hard Top FOW Freezer',
    '110', '980 x 645 x 825', '-18°C ~ -28°C', '',
    '', '', '', '',
    '[]', '[]', '{"no_of_doors": 1}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO115', 'PCF 200', 'Retail Solution', 'Premium Series Hard Top - FOW', '', 'Hard Top FOW Freezer',
    '200', '1035 x 645 x 905', '-18°C ~ -28°C', '',
    '', '', '', '',
    '[]', '[]', '{"no_of_doors": 2}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO116', 'EF 305 GDD', 'Retail Solution', 'Premium Series Hard Top - Freezer cum Chiller', '', 'Hard Top Freezer cum Chiller',
    '283', '1100 x 662 x 886', '2°C ~ 8°C / -18°C ~ -25°C', '',
    '', '', '', '',
    '["High insulation", "Castors for easy mobility", "Hinge door", "Dual temperature convertible Freezer & Chiller", "Low power Consumption", "Unique dual condenser", "Design to perform at high ambient 43\u00b0C", "Extra low cooling up to -32\u00b0C", "4 Side Cooling", "Eco-friendly refrigerant"]', '[]', '{"star_rating": 4, "energy_consumption_kwh_yr": 767, "no_of_doors": 2, "baskets": 1, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO117', 'EF 455 G', 'Retail Solution', 'Premium Series Hard Top - Freezer cum Chiller', '', 'Hard Top Freezer cum Chiller',
    '375', '1309 x 693 x 838', '2°C ~ 8°C / -18°C ~ -25°C', '',
    '', '', '', '',
    '[]', '[]', '{"star_rating": 5, "energy_consumption_kwh_yr": 785, "no_of_doors": 2, "baskets": 2, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO118', 'EF 555 G', 'Retail Solution', 'Premium Series Hard Top - Freezer cum Chiller', '', 'Hard Top Freezer cum Chiller',
    '465', '1653 x 695 x 842', '2°C ~ 8°C / -18°C ~ -25°C', '',
    '', '', '', '',
    '[]', '[]', '{"star_rating": 5, "energy_consumption_kwh_yr": 803, "no_of_doors": 2, "baskets": 2, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO119', 'EF 825 G', 'Retail Solution', 'Premium Series Hard Top - Freezer cum Chiller', '', 'Hard Top Freezer cum Chiller',
    '757', '2415 x 695 x 842', '2°C ~ 8°C / -18°C ~ -25°C', '',
    '', '', '', '',
    '[]', '[]', '{"star_rating": 5, "energy_consumption_kwh_yr": 1442, "no_of_doors": 3, "baskets": 2, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO120', 'EF 875', 'Retail Solution', 'Premium Series Hard Top - Freezer cum Chiller', '', 'Hard Top Freezer cum Chiller',
    '805', '1848 x 857 x 960', '2°C ~ 8°C / -18°C ~ -25°C', '',
    '', '', '', '',
    '[]', '[]', '{"star_rating": 5, "energy_consumption_kwh_yr": 1311, "no_of_doors": 3, "baskets": 1, "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO121', 'EF 290', 'Retail Solution', 'Premium Series Hard Top - F/C Combi', '', 'Hard Top Freezer/Chiller Combi',
    '189F + 98C', '1200 x 602 x 866', '2°C ~ 8°C / -16°C ~ -25°C', '',
    '', '', '', '',
    '[]', '[]', '{"no_of_doors": 2, "baskets": 1, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO122', 'EF 390', 'Retail Solution', 'Premium Series Hard Top - F/C Combi', '', 'Hard Top Freezer/Chiller Combi',
    '160F + 201C', '1309 x 692 x 924', '2°C ~ 8°C / -16°C ~ -25°C', '',
    '', '', '', '',
    '[]', '[]', '{"no_of_doors": 2, "baskets": 1, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO123', 'ECG 205', 'Retail Solution', 'Upright Showcase Chiller', '', 'Upright Display Chiller',
    '200', '500 x 578 x 1520', '2°C ~ 10°C', '',
    '', '', '', '40°C',
    '["LED lighting for better visibility", "Low power consumption", "High insulation", "Removable gasket", "Castor & Lock available", "Designed for high ambient", "Back-lit canopy boosts branding", "Eco-friendly refrigerant", "Adjustable shelves"]', '[]', '{"shelves": 3, "no_of_doors_type": "1/Glass", "digital_controller": "NA", "input_power_w": 124}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO124', 'ECG 305', 'Retail Solution', 'Upright Showcase Chiller', '', 'Upright Display Chiller',
    '300', '560 x 618 x 1674', '2°C ~ 10°C', '',
    '', '', '', '',
    '[]', '[]', '{"shelves": 4, "no_of_doors_type": "1/Glass", "digital_controller": "NA", "input_power_w": 164}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO125', 'ECG 405', 'Retail Solution', 'Upright Showcase Chiller', '', 'Upright Display Chiller',
    '400', '645 x 618 x 1914', '2°C ~ 10°C', '',
    '', '', '', '',
    '[]', '[]', '{"shelves": 4, "no_of_doors_type": "1/Glass", "digital_controller": "NA", "input_power_w": 256}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO126', 'ECG 515', 'Retail Solution', 'Upright Showcase Chiller', '', 'Upright Display Chiller',
    '515', '680 x 660 x 1970', '2°C ~ 10°C', '',
    '', '', '', '',
    '[]', '[]', '{"shelves": 4, "no_of_doors_type": "1/Glass", "digital_controller": "Yes", "input_power_w": 260}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO127', 'ECG 606', 'Retail Solution', 'Upright Showcase Chiller', '', 'Upright Display Chiller',
    '600', '850 x 720 x 2205', '2°C ~ 10°C', '',
    '', '', '', '',
    '[]', '[]', '{"shelves": 5, "no_of_doors_type": "1/Glass", "digital_controller": "NA", "input_power_w": 325}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO128', 'ECG 775', 'Retail Solution', 'Upright Showcase Chiller', '', 'Upright Display Chiller',
    '730', '1050 x 640 x 2020', '2°C ~ 10°C', '',
    '', '', '', '',
    '[]', '[]', '{"shelves": 8, "no_of_doors_type": "2/Glass", "digital_controller": "Yes", "input_power_w": 360}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO129', 'ECG 1075', 'Retail Solution', 'Upright Showcase Chiller', '', 'Upright Display Chiller',
    '1023', '1215 x 730 x 2020', '2°C ~ 10°C', '',
    '', '', '', '',
    '[]', '[]', '{"shelves": 8, "no_of_doors_type": "2/Glass", "digital_controller": "Yes", "input_power_w": 420}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO130', 'ECG 1506', 'Retail Solution', 'Upright Showcase Chiller', '', 'Upright Display Chiller',
    '1500', '1800 x 590 x 2015', '2°C ~ 10°C', '',
    '', '', '', '',
    '[]', '[]', '{"shelves": 12, "no_of_doors_type": "3/Glass", "digital_controller": "Yes", "input_power_w": 600}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO131', 'EFGV 175', 'Retail Solution', 'Upright Showcase Freezer', '', 'Upright Display Freezer',
    '144', '460 x 610 x 1390', '-16°C ~ -20°C', '',
    '', '', '', '32°C',
    '["LED lighting for better visibility", "High insulation", "Removable gasket", "Tropicalized for harsh Indian weather conditions", "Castor & Lock available", "Eco-friendly refrigerant", "Triple pane heated glass door", "Frost free technology", "Low power Consumption"]', '[]', '{"shelves": 3, "no_of_doors_type": "1/Glass", "digital_controller": "Yes", "input_power_w": 320}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO132', 'EFGV 275', 'Retail Solution', 'Upright Showcase Freezer', '', 'Upright Display Freezer',
    '213', '460 x 610 x 1820', '-16°C ~ -20°C', '',
    '', '', '', '',
    '[]', '[]', '{"shelves": 4, "no_of_doors_type": "1/Glass", "digital_controller": "Yes", "input_power_w": 380}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO133', 'EFGV 375', 'Retail Solution', 'Upright Showcase Freezer', '', 'Upright Display Freezer',
    '375', '600 x 610 x 1750', '-16°C ~ -20°C', '',
    '', '', '', '',
    '[]', '[]', '{"shelves": 4, "no_of_doors_type": "1/Glass", "digital_controller": "Yes", "input_power_w": 760}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO134', 'EFGV 500', 'Retail Solution', 'Upright Showcase Freezer', '', 'Upright Display Freezer',
    '500', '680 x 700 x 2020', '-16°C ~ -20°C', '',
    '', '', '', '',
    '[]', '[]', '{"shelves": 4, "no_of_doors_type": "1/Glass", "digital_controller": "Yes", "input_power_w": 760}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO135', 'EFGV 1000', 'Retail Solution', 'Upright Showcase Freezer', '', 'Upright Display Freezer',
    '1000', '1370 x 700 x 1985', '-16°C ~ -20°C', '',
    '', '', '', '',
    '[]', '[]', '{"shelves": 10, "no_of_doors_type": "2/Glass", "digital_controller": "Yes", "input_power_w": 1011}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO136', 'EFGV 1500', 'Retail Solution', 'Upright Showcase Freezer', '', 'Upright Display Freezer',
    '1500', '2057 x 700 x 1985', '-16°C ~ -20°C', '',
    '', '', '', '',
    '[]', '[]', '{"shelves": 15, "no_of_doors_type": "3/Glass", "digital_controller": "Yes", "input_power_w": 1300}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO137', 'SD 415 S2', 'Scooping Parlour', 'Scooping Parlour Display', '', 'Scooping Parlour Display Freezer',
    '400', '1350 x 838 x 1270', '', '',
    '', '', '', '',
    '["Optimized temperature control", "Front illuminated panel", "Additional storage space at base", "Illuminated LED Interior"]', '[]', '{"pans_optional": "9 x GN 1/3", "energy_consumption_kwh_yr": 2029, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO138', 'SD 575 S2', 'Scooping Parlour', 'Scooping Parlour Display', '', 'Scooping Parlour Display Freezer',
    '535', '1720 x 838 x 1270', '', '',
    '', '', '', '',
    '[]', '[]', '{"pans_optional": "12 x GN 1/3", "energy_consumption_kwh_yr": 2555, "castors": "Yes", "lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO139', 'SPS 125', 'Scooping Parlour', 'Self Service & Serve Over Counters', '', 'Serve Over Counter',
    '238', '1320 x 1160 x 885', '', '',
    '', '', '', '27°C ambient temperature / 55% R',
    '["Uniform cooling", "Electronic temperature display", "Food-grade Interior steel", "Automatic defrost system"]', '[]', '{"type": "Serve Over", "temperature_c": "1\u00b0C ~ 5\u00b0C", "electrical": "220V, 50Hz, Single phase"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO140', 'SPS 188', 'Scooping Parlour', 'Self Service & Serve Over Counters', '', 'Serve Over Counter',
    '358', '1945 x 1160 x 885', '', '',
    '', '', '', '',
    '[]', '[]', '{"type": "Serve Over", "temperature_c": "1\u00b0C ~ 5\u00b0C"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO141', 'SCS 125', 'Scooping Parlour', 'Self Service & Serve Over Counters', '', 'Serve Over Counter - Curved Glass',
    '238', '1320 x 1210 x 1200', '', '',
    '', '', '', '',
    '[]', '[]', '{"type": "Serve Over", "temperature_c": "1\u00b0C ~ 5\u00b0C"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO142', 'SCS 188', 'Scooping Parlour', 'Self Service & Serve Over Counters', '', 'Serve Over Counter - Curved Glass',
    '358', '1945 x 1210 x 1200', '', '',
    '', '', '', '',
    '[]', '[]', '{"type": "Serve Over", "temperature_c": "1\u00b0C ~ 5\u00b0C"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO143', 'SHF-70-55-15D', 'Supermarket', 'Plug In Multideck Chiller', '', 'Plug In Multideck Chiller',
    '', '750 x 550 x 1500', '2~7', '',
    '', '', '', '',
    '["Ultra-low front handrail for easy loading/unloading", "Rear air return and low-noise compressor for uniform cooling", "LED lighting for better display visibility and energy savings", "Optional pull-out drawers for convenient goods handling", "Night Curtain", "Large space display", "Customized electronic controller", "Eco-friendly R290 refrigerant", "Adjustable LED shelves"]', '[]', '{"effective_capacity_l": 166, "display_area_m2": 0.98, "input_power_w": 487, "voltage": "220V/50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO144', 'SHF-91-55-15D', 'Supermarket', 'Plug In Multideck Chiller', '', 'Plug In Multideck Chiller',
    '', '960 x 550 x 1500', '2~7', '',
    '', '', '', '',
    '[]', '[]', '{"effective_capacity_l": 220, "display_area_m2": 1.34, "input_power_w": 556, "voltage": "220V/50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO145', 'SF-93-76-19', 'Supermarket', 'Plug In Multideck Chiller', '', 'Plug In Multideck Chiller',
    '', '1050 x 770 x 1900', '2~7', '',
    '', '', '', '',
    '["Advanced electronic controller", "High-efficiency integrated refrigeration system", "Night curtain minimizes standby energy use", "Magnetic front cover for quick maintenance", "Optimized air curtain", "Energy-saving controller", "Eco-friendly foam cabinet", "Adjustable shelves design"]', '[]', '{"effective_capacity_l": 505, "display_area_m2": 2.34, "input_power_w": 1100, "voltage": "220V / 50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO146', 'SF-125-76-19', 'Supermarket', 'Plug In Multideck Chiller', '', 'Plug In Multideck Chiller',
    '', '1360 x 770 x 1900', '2~7', '',
    '', '', '', '',
    '[]', '[]', '{"effective_capacity_l": 645, "display_area_m2": 2.71, "input_power_w": 1320, "voltage": "220V / 50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO147', 'SF-188-76-19', 'Supermarket', 'Plug In Multideck Chiller', '', 'Plug In Multideck Chiller',
    '', '1985 x 770 x 1900', '2~7', '',
    '', '', '', '',
    '[]', '[]', '{"effective_capacity_l": 970, "display_area_m2": 3.57, "input_power_w": 1800, "voltage": "220V / 50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO148', 'RF-188-76-19', 'Supermarket', 'Remote Multideck Chiller', '', 'Remote Multideck Chiller',
    '', '1925 x 770 x 1900', '2~7', '',
    '', '', '', '',
    '["Flexible air curtain to reduce cooling loss", "Night curtain saves standby energy", "LED lighting for better visibility", "Adjustable shelves for display needs", "Optional pull-out drawers for convenience", "Optimized air curtain", "Energy-saving controller", "Eco-friendly foam cabinet", "LED lighting display"]', '[]', '{"effective_capacity_l": 1100, "display_area_m2": 2.64, "input_power_w": 128, "cooling_capacity_kw": 2.36, "voltage": "220V/50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO149', 'RF-250-76-19', 'Supermarket', 'Remote Multideck Chiller', '', 'Remote Multideck Chiller',
    '', '2550 x 770 x 1900', '2~7', '',
    '', '', '', '',
    '[]', '[]', '{"effective_capacity_l": 1400, "display_area_m2": 3.53, "input_power_w": 182, "cooling_capacity_kw": 3.1, "voltage": "220V/50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO150', 'SM2D-131-75-19', 'Supermarket', 'Plug In Remote Chiller Cabinet', '', 'Plug In Chiller Cabinet - 2 Doors',
    '', '1310 x 750 x 1930', '2~7', '',
    '', '', '', '',
    '["Anti-condensation glass door", "Automatic return glass door", "Customized electronic controller", "Energy-efficient refrigerator"]', '[]', '{"type": "Plug-In", "effective_capacity_l": 944, "display_area_m2": 1.31, "input_power_w": 610, "voltage": "220V/50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO151', 'SM3D-197-75-19', 'Supermarket', 'Plug In Remote Chiller Cabinet', '', 'Plug In Chiller Cabinet - 3 Doors',
    '', '1965 x 750 x 1930', '2~7', '',
    '', '', '', '',
    '[]', '[]', '{"type": "Plug-In", "effective_capacity_l": 1473, "display_area_m2": 1.97, "input_power_w": 830, "voltage": "220V/50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO152', 'RM2D-131A-75-19', 'Supermarket', 'Plug In Remote Chiller Cabinet', '', 'Remote Chiller Cabinet - 2 Doors',
    '', '1310 x 750 x 1930', '2~7', '',
    '', '', '', '',
    '[]', '[]', '{"type": "Remote", "effective_capacity_l": 1050, "display_area_m2": 1.5, "input_power_w": 230, "voltage": "220V/50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO153', 'RM3D-197A-75-19', 'Supermarket', 'Plug In Remote Chiller Cabinet', '', 'Remote Chiller Cabinet - 3 Doors',
    '', '1965 x 750 x 1930', '2~7', '',
    '', '', '', '',
    '[]', '[]', '{"type": "Remote", "effective_capacity_l": 1550, "display_area_m2": 2.25, "input_power_w": 380, "voltage": "220V/50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO154', 'SL2D-131-75-19', 'Supermarket', 'Plug In Freezer Cabinet', '', 'Plug In Freezer Cabinet - 2 Doors',
    '', '1310 x 750 x 1930', '≤-18', '',
    '', '', '', '',
    '["High-efficiency defrosting design", "Automatic dust removal", "Flexible air curtain", "Energy-efficient refrigerator", "Aluminum alloy handle", "Eco-friendly refrigerant", "Inclined price tag", "Convenient humanized design"]', '[]', '{"effective_capacity_l": 750, "display_area_m2": 1.31, "input_power_w": 610, "voltage": "220V/50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO155', 'SL3D-197-75-19', 'Supermarket', 'Plug In Freezer Cabinet', '', 'Plug In Freezer Cabinet - 3 Doors',
    '', '1965 x 750 x 1930', '≤-18', '',
    '', '', '', '',
    '[]', '[]', '{"effective_capacity_l": 1170, "display_area_m2": 1.97, "input_power_w": 830, "voltage": "220V/50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO156', 'RL2D-131-75-19', 'Supermarket', 'Remote Freezer Slim Cabinet', '', 'Remote Freezer Slim Cabinet - 2 Doors',
    '', '1310 x 750 x 1930', '≤-18', '',
    '', '', '', '',
    '[]', '[]', '{"effective_capacity_l": 900, "display_area_m2": 0.98, "input_power_w": "401 (Defrost 1170)", "voltage": "220V/50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO157', 'RL3D-197-75-19', 'Supermarket', 'Remote Freezer Slim Cabinet', '', 'Remote Freezer Slim Cabinet - 3 Doors',
    '', '1965 x 750 x 1930', '≤-18', '',
    '', '', '', '',
    '[]', '[]', '{"effective_capacity_l": 1395, "display_area_m2": 1.34, "input_power_w": "556 (Defrost 2130)", "voltage": "220V/50Hz"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO158', 'BWD 21A FSC', 'Water Dispenser', 'Floor Standing - Refrigerated', '', 'Floor Standing Water Dispenser - Refrigerated',
    '', '1010 x 315 x 350', '', '',
    '', '', '', '',
    '["Crystal-Clear top load design", "Durable Stainless Steel Tank", "Instant Triple Temp Dispensing", "Powerful Cooling with Energy Efficiency"]', '[]', '{"cabinet": "Refrigerated", "no_of_taps": 3, "tap_options": "Hot, Normal & Cold", "cold_water_storage_capacity_ltr": 3.7, "cooling_capacity_ltr_hr": 3, "heating_capacity_ltr_hr": 5, "inner_outer_body_material": "Prepainted Galvanised Steel sheets", "stainless_steel_tank": "SS 304", "child_lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO159', 'BWD 21A FSR', 'Water Dispenser', 'Floor Standing - Non Refrigerated', '', 'Floor Standing Water Dispenser - Non Refrigerated',
    '', '1010 x 315 x 350', '', '',
    '', '', '', '',
    '[]', '[]', '{"cabinet": "Non Refrigerated", "no_of_taps": 3, "tap_options": "Hot, Normal & Cold", "cold_water_storage_capacity_ltr": 3.7, "cooling_capacity_ltr_hr": 3, "heating_capacity_ltr_hr": 5, "inner_outer_body_material": "Prepainted Galvanised Steel sheets", "stainless_steel_tank": "SS 304", "child_lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO160', 'BWD 21A CT', 'Water Dispenser', 'Counter Top', '', 'Counter Top Water Dispenser',
    '', '530 x 315 x 350', '', '',
    '', '', '', '',
    '[]', '[]', '{"cabinet": "NA", "no_of_taps": 3, "tap_options": "Hot, Normal & Cold", "cold_water_storage_capacity_ltr": 3.7, "cooling_capacity_ltr_hr": 3, "heating_capacity_ltr_hr": 5, "inner_outer_body_material": "Prepainted Galvanised Steel sheets", "stainless_steel_tank": "SS 304", "child_lock": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO161', 'ESS 15/30', 'Water Cooler', 'Water Cooler', '', 'Water Cooler',
    '', '370 x 370 x 940', '', '',
    '', '', '', '',
    '["Stainless Steel Tank (SS304)", "High-Efficiency Cooling Compressor", "Large Storage & Dispensing Capacity", "Compact & Modern Design", "ISI Marked", "Safety Assurance"]', '["ISI Marked Certified"]', '{"cooling_capacity_l_hr": 15, "storage_capacity_ltr": 30, "no_of_faucets_cold_water": 1, "compressor_refrigerant": "R-134", "power_watt": 300, "current_amps": 1.3, "energy_consumption_kwh_yearly": 657, "net_weight_kg": 26, "gross_weight_kg": 30.12, "legs": "ROUND"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO162', 'ESS 40/40', 'Water Cooler', 'Water Cooler', '', 'Water Cooler',
    '', '400 x 400 x 1140', '', '',
    '', '', '', '',
    '[]', '[]', '{"cooling_capacity_l_hr": 40, "storage_capacity_ltr": 40, "no_of_faucets_cold_water": 1, "compressor_refrigerant": "R-134", "power_watt": 575, "current_amps": 2.5, "energy_consumption_kwh_yearly": 1260, "net_weight_kg": 28.8, "gross_weight_kg": 31.22, "legs": "L TYPE"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO163', 'ESS 40/80', 'Water Cooler', 'Water Cooler', '', 'Water Cooler',
    '', '555 x 470 x 1180', '', '',
    '', '', '', '',
    '[]', '[]', '{"cooling_capacity_l_hr": 40, "storage_capacity_ltr": 80, "no_of_faucets_cold_water": 2, "compressor_refrigerant": "R-134", "power_watt": 575, "current_amps": 2.5, "energy_consumption_kwh_yearly": 1260, "net_weight_kg": 38.6, "gross_weight_kg": 44.7, "legs": "L TYPE"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO164', 'ESS 60/80', 'Water Cooler', 'Water Cooler', '', 'Water Cooler',
    '', '555 x 470 x 1180', '', '',
    '', '', '', '',
    '[]', '[]', '{"cooling_capacity_l_hr": 60, "storage_capacity_ltr": 80, "no_of_faucets_cold_water": 2, "compressor_refrigerant": "R-134", "power_watt": 775, "current_amps": 3.36, "energy_consumption_kwh_yearly": 1697, "net_weight_kg": 40.35, "gross_weight_kg": 46.1, "legs": "L TYPE"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO165', 'ESS 60/120', 'Water Cooler', 'Water Cooler', '', 'Water Cooler',
    '', '660 x 535 x 1230', '', '',
    '', '', '', '',
    '[]', '[]', '{"cooling_capacity_l_hr": 60, "storage_capacity_ltr": 120, "no_of_faucets_cold_water": 2, "compressor_refrigerant": "R-134", "power_watt": 775, "current_amps": 3.36, "energy_consumption_kwh_yearly": 1697, "net_weight_kg": 50.5, "gross_weight_kg": 54.4, "legs": "L TYPE"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO166', 'ESS 150/150', 'Water Cooler', 'Water Cooler', '', 'Water Cooler',
    '', '740 x 595 x 1250', '', '',
    '', '', '', '',
    '[]', '[]', '{"cooling_capacity_l_hr": 150, "storage_capacity_ltr": 150, "no_of_faucets_cold_water": 2, "compressor_refrigerant": "R-134", "power_watt": 1550, "current_amps": 6.7, "energy_consumption_kwh_yearly": 3394, "net_weight_kg": 75, "gross_weight_kg": 83.42, "legs": "L TYPE"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO167', 'CGN 1200 F4 (Pharma)', 'Pharma', 'Laboratory Freezer', '', 'Laboratory Freezer - Solid Door',
    '', '1340 x 810 x 2000', '-16°C ~ -25°C', '',
    '', '', '6 + 2 Base', '',
    '[]', '["CE", "CB ISO 9001", "ISO 13485"]', '{"gross_capacity_ltr": 1200, "temperature_display": "Digital", "microprocessor_controller": "Yes", "lock": "Yes", "wheels": "Yes", "door": "Solid"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO168', 'CGN 1200 FG (Pharma)', 'Pharma', 'Laboratory Freezer', '', 'Laboratory Freezer - Glass Door',
    '', '1340 x 810 x 2000', '-16°C ~ -25°C', '',
    '', '', '6 + 2 Base', '',
    '[]', '["CE", "CB ISO 9001", "ISO 13485"]', '{"gross_capacity_ltr": 1200, "temperature_display": "Digital", "microprocessor_controller": "Yes", "lock": "Yes", "wheels": "Yes", "door": "Glass"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO169', 'CGN 600 F2 (Pharma)', 'Pharma', 'Laboratory Freezer', '', 'Laboratory Freezer - Solid Door',
    '', '680 x 810 x 2000', '-16°C ~ -25°C', '',
    '', '', '3 + 1 Base', '',
    '[]', '["CE", "CB ISO 9001", "ISO 13485"]', '{"gross_capacity_ltr": 600, "temperature_display": "Digital", "microprocessor_controller": "Yes", "lock": "Yes", "wheels": "Yes", "door": "Solid"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO170', 'CGN 600 FG (Pharma)', 'Pharma', 'Laboratory Freezer', '', 'Laboratory Freezer - Glass Door',
    '', '680 x 810 x 2000', '-16°C ~ -25°C', '',
    '', '', '3 + 1 Base', '',
    '[]', '["CE", "CB ISO 9001", "ISO 13485"]', '{"gross_capacity_ltr": 600, "temperature_display": "Digital", "microprocessor_controller": "Yes", "lock": "Yes", "wheels": "Yes", "door": "Glass"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO171', 'ECG 305 (Pharma)', 'Pharma', 'Laboratory Refrigerator', '', 'Laboratory Refrigerator',
    '', '', '2°C ~ 8°C', '',
    'R134a', '', '', '',
    '[]', '["CE", "ISO 9001", "ISO 13485"]', '{"capacity_l": 300, "external_size_wxdxh_inch": "22 x 24 x 67", "cooling_method": "Ventilated Cooling", "digital_display": "Yes", "no_of_shelf": 4, "door": "Double Layer Vacuum Glass", "door_lock": "Yes", "power_supply": "220/50", "system_alarm_optional": "Sensor error"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO172', 'ECG 405 (Pharma)', 'Pharma', 'Laboratory Refrigerator', '', 'Laboratory Refrigerator',
    '', '', '2°C ~ 8°C', '',
    'R134a', '', '', '',
    '[]', '[]', '{"capacity_l": 400, "external_size_wxdxh_inch": "26 x 25 x 77", "no_of_shelf": 4, "door": "Double Layer Vacuum Glass", "door_lock": "Yes", "power_supply": "220/50"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO173', 'ECG 505 (Pharma)', 'Pharma', 'Laboratory Refrigerator', '', 'Laboratory Refrigerator',
    '', '', '2°C ~ 8°C', '',
    'R134a', '', '', '',
    '[]', '[]', '{"capacity_l": 515, "external_size_wxdxh_inch": "23 x 27 x 79", "no_of_shelf": 4, "door": "Double Layer Vacuum Glass", "door_lock": "Yes", "power_supply": "220/50"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO174', 'ECG 775 (Pharma)', 'Pharma', 'Laboratory Refrigerator', '', 'Laboratory Refrigerator',
    '', '', '2°C ~ 8°C', '',
    'R134a', '', '', '',
    '[]', '[]', '{"capacity_l": 700, "external_size_wxdxh_inch": "41 x 25 x 80", "no_of_shelf": 8, "door": "Double Layer Vacuum Glass", "door_lock": "Yes", "power_supply": "220/50"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO175', 'ECG 1075 (Pharma)', 'Pharma', 'Laboratory Refrigerator', '', 'Laboratory Refrigerator',
    '', '', '2°C ~ 8°C', '',
    'R134a', '', '', '',
    '[]', '[]', '{"capacity_l": 1000, "external_size_wxdxh_inch": "48 x 28 x 80", "no_of_shelf": 8, "door": "Double Layer Vacuum Glass", "door_lock": "Yes", "power_supply": "220/50"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO176', 'EBF 60T', 'Pharma', 'Portable Vaccine Freezer', '', 'Portable Vaccine Freezer',
    '60', '', '-20°C To +20°C', '',
    '', '', '', '',
    '[]', '["CE", "ISO 13485", "ISO 9001 : 2008"]', '{"refrigerant_type": "R 134 A", "microprocessor_controller": "Yes", "temperature_display": "Digital Display", "individual_temperature_set": "Yes", "hold_over_time": "4 to 6 Hr", "battery_backup": "6 to 8 Hr", "inside_light": "Yes", "removable_partition": "Yes", "storage_chamber": "Convertible Dual Chamber", "power_supply": "AC-220 to 240V, DC-12V/24V"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO177', 'EBF 101', 'Pharma', 'Portable Vaccine Freezer', '', 'Portable Vaccine Freezer',
    '90', '', '-20°C To +20°C', '',
    '', '', '', '',
    '[]', '["CE", "ISO 13485", "ISO 9001 : 2008"]', '{"refrigerant_type": "R 134 A", "microprocessor_controller": "Yes", "temperature_display": "Digital Display", "individual_temperature_set": "Yes", "hold_over_time": "4 to 6 Hr", "battery_backup": "6 to 8 Hr", "inside_light": "Yes", "removable_partition": "Yes", "storage_chamber": "Convertible Dual Chamber", "power_supply": "AC-220 to 240V, DC-12V/24V"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO178', 'EDW 86L575', 'Pharma', 'Ultra Low Freezer -86°C', '', 'Ultra Low Freezer -86°C',
    '', '', '-40°C ~ -86°C', '',
    'Mixed refrigerant', 'Direct cooling', '', '',
    '["Patented LBA Forming Technology", "LED Screen", "D shape evaporator for faster pull down", "Multifunction Alarms"]', '[]', '{"cabinet_type": "Upright", "total_storage_volume_l": 568, "inner_material": "Stainless steel", "display": "LED", "product_dimensions_mm": "885 x 995 x 1980", "interior_dimensions_mm": "595 x 720 x 1310", "power_supply": "110V-240V/50,60Hz", "caster": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO179', 'EDW 86L475', 'Pharma', 'Ultra Low Freezer -86°C', '', 'Ultra Low Freezer -86°C',
    '', '', '-40°C ~ -86°C', '',
    'Mixed refrigerant', 'Direct cooling', '', '',
    '[]', '[]', '{"cabinet_type": "Upright", "total_storage_volume_l": 458, "inner_material": "Stainless steel", "display": "LED", "product_dimensions_mm": "885 x 855 x 1980", "interior_dimensions_mm": "595 x 580 x 1310", "power_supply": "110V-240V/50,60Hz", "caster": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO180', 'EDW 86L 375', 'Pharma', 'Ultra Low Freezer -86°C', '', 'Ultra Low Freezer -86°C',
    '', '', '-40°C ~ -86°C', '',
    'Mixed refrigerant', 'Direct cooling', '', '',
    '[]', '[]', '{"cabinet_type": "Upright", "total_storage_volume_l": 358, "inner_material": "PCM liner", "display": "LED", "product_dimensions_mm": "795 x 885 x 1855", "interior_dimensions_mm": "450 x 583 x 1326", "power_supply": "220~240V/50Hz", "caster": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO181', 'EDW 86L 125', 'Pharma', 'Ultra Low Freezer -86°C', '', 'Ultra Low Freezer -86°C',
    '', '', '-40°C ~ -86°C', '',
    'Mixed refrigerant', 'Direct cooling', '', '',
    '[]', '[]', '{"cabinet_type": "Upright", "total_storage_volume_l": 108, "inner_material": "Galvanized steel sheet", "display": "LED", "product_dimensions_mm": "955 x 675 x 815", "interior_dimensions_mm": "440 x 435 x 590", "power_supply": "220~240v/ 50HZ", "caster": "No"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO182', 'EDW 40L 525', 'Pharma', 'Ultra Low Freezer -40°C', '', 'Ultra Low Freezer -40°C',
    '', '', '', '',
    '', 'Direct cooling', '', '',
    '["Next Gen LBA Forming Technology", "High Efficiency Micro Channel Condenser", "Advance LCD Temperature Control Systems", "Innovative 3 Dimensional Sealing Design"]', '[]', '{"temperature_c": "-20\u00b0C ~ -40\u00b0C", "external_material": "High quality coated steel", "internal_material": "High quality coated steel", "product_dimensions_mm": "866 x 811 x 1920", "interior_dimensions_mm": "680 x 620 x 650", "net_gross_weight": "142 / 164", "foaming_agent": "Cyclopantane", "rated_voltage_hz": "220~240V/50Hz", "display": "LED display", "castors_type": "Yes"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO183', 'EDW 40L 325', 'Pharma', 'Ultra Low Freezer -40°C', '', 'Ultra Low Freezer -40°C',
    '', '', '', '',
    '', 'Direct cooling', '', '',
    '[]', '[]', '{"temperature_c": "-20\u00b0C ~ -40\u00b0C", "external_material": "High quality coated steel", "internal_material": "High quality coated steel", "product_dimensions_mm": "700 x 690 x 1920", "interior_dimensions_mm": "540 x 450 x 1277", "net_gross_weight": "102 / 114", "foaming_agent": "Cyclopantane", "rated_voltage_hz": "220V/50Hz", "display": "LCD display", "castors_type": "4/front 2 wheels lockable"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO184', 'Galaxy', 'Vending Machine', 'Snacks & Beverages Vending Machine', '', 'Galaxy Snacks & Beverages Vending Machine',
    '', '1180 x 890 x 1985', '', '',
    '', '', '', '',
    '["Seamless touchscreen interface", "40mm foaming Insulation", "Adjustable shelving heights", "Easy spiral adjusting with pull & twist mechanism", "Anti-theft delivery bin", "Inventory management", "Cashless payments", "Direct funds transfer"]', '[]', '{"touchscreen_interface_inch": "10 / 22", "skus": "60 Varieties (Max)", "number_of_trays": 6, "temperature_range": "4\u00b0C ~ 25\u00b0C", "voltage": "220V/50Hz", "power_w_ref_normal": "422/24", "weight_kg": 350, "capacity_pcs": "360~510", "best_suited_for": ["Snacks", "Beverages", "Chocolate", "Medicines & Health Products"], "notes": "Available In 10 Screen"}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO185', 'Nova', 'Vending Machine', 'Elevator Vending Machine', '', 'Nova Elevator Vending Machine',
    '', '1275 x 790 x 1940', '', '',
    '', '', '', '',
    '["Seamless touchscreen interface", "40mm foaming refrigeration system", "Adjustable shelving heights", "Smooth elevatory delivery, perfect for fragile products", "Anti-theft delivery bin", "Inventory management", "Cashless payments", "Direct funds transfer"]', '[]', '{"touchscreen_interface_inch": "22", "skus": "42 Varieties (Max)", "number_of_trays": 6, "temperature_range": "4\u00b0C ~ 25\u00b0C", "voltage": "220V/50Hz", "power_w_ref_normal": "422/24", "weight_kg": 370, "capacity_pcs": "300~350", "best_suited_for": ["Cosmetics", "Jewelry", "Electronics", "Liquor"]}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO186', 'Frozone', 'Vending Machine', 'Frozen Food Vending Machine', '', 'Frozone - Ideal vending for frozen food and icecreams',
    '', '1375 x 875 x 1940', '', '',
    '', '', '', '',
    '["Seamless touchscreen interface", "40mm foaming refrigeration system", "Adjustable shelving heights", "Smooth elevatory delivery, perfect for fragile products", "Anti-theft delivery bin", "Inventory management", "Cashless payments", "Direct funds transfer"]', '[]', '{"touchscreen_interface_inch": "22", "skus": "60 Varieties (Max)", "number_of_trays": 6, "temperature_range": "4\u00b0C ~ -18\u00b0C", "voltage": "220V/50Hz", "power_w_ref_normal": "422/24", "weight_kg": 370, "capacity_pcs": 340}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO187', 'Apollo', 'Vending Machine', 'Smart Lockers', '', 'Apollo Smart Lockers for Vending & Storage of Industrial/IT Accessories',
    '', '1080 x 440 x 1840', '', '',
    '', '', '', '',
    '["Intuitive touchscreen for easy navigation", "Detailed logs for tracking user activities", "Supports Biometric and Payment authorization", "Remote monitoring available on mobile and web", "Self-service automated inventory tracking", "API and ERP integration for seamless connectivity"]', '[]', '{"touchscreen_interface_inch": "10/13/15", "skus": "17/19/24/37 (slots)", "number_of_trays": 6, "temperature_range": "Ambient", "voltage": "220V/50Hz", "power_w_ref_normal": "422/24", "best_suited_for": ["Bag", "Helmet", "Gloves & PPE Kit", "Industrial Tools"]}'
);

INSERT INTO products (
    product_id, model, category_name, subcategory, series, description,
    capacity_ltr, dimensions_mm, temperature_range_c, gn_compatibility,
    refrigerant, cooling_type, no_of_shelves, climate_class,
    key_features, certifications, specs
) VALUES (
    'PRO188', 'Orion', 'Vending Machine', 'Budget Vending Machine', '', 'Orion Budget-friendly All-purpose Vending Machine',
    '', '630 x 870 x 1940', '', '',
    '', '', '', '',
    '["Budget-friendly all-purpose vending machine", "40mm foaming refrigeration system", "Direct QR Code access to web app interface", "Cashless payments", "Direct funds transfer", "Anti-theft delivery bin", "Inventory management"]', '[]', '{"touchscreen_interface_inch": "QR / 10 Screen", "skus": "60 Varieties (Max)", "number_of_trays": 6, "temperature_range": "4\u00b0C ~ 25\u00b0C", "voltage": "220V/50Hz", "power_w_ref_normal": "422/24", "weight_kg": 190, "capacity_pcs": 180, "best_suited_for": ["Snacks", "Beverages", "Medicines", "Chocolate"], "notes": "Orion QR (956x870x1940mm, 420 pcs) and Orion 10 Screen variants available"}'
);

-- =============================================
-- Done!
-- =============================================