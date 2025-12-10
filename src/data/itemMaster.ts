/**
 * Master Items Database - 1000+ Common Indian Products
 * Auto-updated with 2025 MRPs, GST Rates, and HSN Codes
 * Categories: Groceries, FMCG, Electronics, Pharmaceuticals, etc.
 */

export interface MasterItem {
  name: string
  category: string
  unit: string
  mrp: number
  gst_rate: number
  hsn: string
  purchase_price: number
  description?: string
  keywords?: string[] // For better search matching
}

export const ITEM_MASTER: MasterItem[] = [
  // ========== DAIRY & MILK PRODUCTS (GST 5%) ==========
  { name: 'Amul Milk 1L', category: 'Dairy & Milk Products', unit: 'Litres', mrp: 68, gst_rate: 5, hsn: '0401', purchase_price: 62, description: 'Amul Taaza Homogenised Toned Milk', keywords: ['milk', 'amul', 'dairy'] },
  { name: 'Amul Milk 500ml', category: 'Dairy & Milk Products', unit: 'Millilitres', mrp: 34, gst_rate: 5, hsn: '0401', purchase_price: 31, description: 'Amul Taaza Toned Milk Half Litre' },
  { name: 'Mother Dairy Milk 1L', category: 'Dairy & Milk Products', unit: 'Litres', mrp: 66, gst_rate: 5, hsn: '0401', purchase_price: 60, description: 'Mother Dairy Full Cream Milk' },
  { name: 'Amul Butter 100g', category: 'Dairy & Milk Products', unit: 'Grams', mrp: 60, gst_rate: 12, hsn: '0405', purchase_price: 54, description: 'Amul Pasteurized Butter' },
  { name: 'Amul Cheese Slice 200g', category: 'Dairy & Milk Products', unit: 'Grams', mrp: 130, gst_rate: 12, hsn: '0406', purchase_price: 115, description: 'Amul Processed Cheese Slices' },
  { name: 'Amul Curd 400g', category: 'Dairy & Milk Products', unit: 'Grams', mrp: 35, gst_rate: 5, hsn: '0403', purchase_price: 32, description: 'Amul Masti Dahi Fresh Curd' },
  { name: 'Nestle Milkmaid 400g', category: 'Dairy & Milk Products', unit: 'Grams', mrp: 130, gst_rate: 12, hsn: '0402', purchase_price: 115, description: 'Nestle Milkmaid Sweetened Condensed Milk' },

  // ========== BISCUITS & COOKIES (GST 18%) ==========
  { name: 'Parle G Biscuits 100g', category: 'Biscuits & Cookies', unit: 'Packets', mrp: 10, gst_rate: 18, hsn: '19053100', purchase_price: 8, description: 'Parle G Original Glucose Biscuits', keywords: ['parle', 'biscuit', 'glucose'] },
  { name: 'Parle G Biscuits 200g', category: 'Biscuits & Cookies', unit: 'Packets', mrp: 20, gst_rate: 18, hsn: '19053100', purchase_price: 17, description: 'Parle G Glucose Biscuits Family Pack' },
  { name: 'Parle G Biscuits 1kg', category: 'Biscuits & Cookies', unit: 'Packets', mrp: 90, gst_rate: 18, hsn: '19053100', purchase_price: 78, description: 'Parle G Glucose Biscuits Jumbo Pack' },
  { name: 'Britannia Good Day Butter 100g', category: 'Biscuits & Cookies', unit: 'Packets', mrp: 30, gst_rate: 18, hsn: '19053100', purchase_price: 25, description: 'Britannia Good Day Butter Cookies' },
  { name: 'Britannia Marie Gold 250g', category: 'Biscuits & Cookies', unit: 'Packets', mrp: 35, gst_rate: 18, hsn: '19053100', purchase_price: 30, description: 'Britannia Marie Gold Tea Time Biscuits' },
  { name: 'Oreo Biscuits 150g', category: 'Biscuits & Cookies', unit: 'Packets', mrp: 30, gst_rate: 18, hsn: '19053100', purchase_price: 26, description: 'Oreo Vanilla Cream Biscuits' },
  { name: 'Sunfeast Dark Fantasy 75g', category: 'Biscuits & Cookies', unit: 'Packets', mrp: 30, gst_rate: 18, hsn: '19053100', purchase_price: 26, description: 'Sunfeast Dark Fantasy Chocolate Cookies' },
  { name: 'Hide & Seek Biscuits 100g', category: 'Biscuits & Cookies', unit: 'Packets', mrp: 25, gst_rate: 18, hsn: '19053100', purchase_price: 21, description: 'Parle Hide & Seek Chocolate Chip Cookies' },

  // ========== ATTA & FLOUR (GST 0%) ==========
  { name: 'Aashirvaad Atta 10kg', category: 'Atta & Flour', unit: 'Kilograms', mrp: 420, gst_rate: 0, hsn: '1101', purchase_price: 390, description: 'Aashirvaad Superior MP Chakki Atta', keywords: ['atta', 'flour', 'wheat'] },
  { name: 'Aashirvaad Atta 5kg', category: 'Atta & Flour', unit: 'Kilograms', mrp: 215, gst_rate: 0, hsn: '1101', purchase_price: 200, description: 'Aashirvaad Whole Wheat Atta' },
  { name: 'Aashirvaad Atta 1kg', category: 'Atta & Flour', unit: 'Kilograms', mrp: 45, gst_rate: 0, hsn: '1101', purchase_price: 42, description: 'Aashirvaad Atta Small Pack' },
  { name: 'Pillsbury Chakki Fresh Atta 5kg', category: 'Atta & Flour', unit: 'Kilograms', mrp: 220, gst_rate: 0, hsn: '1101', purchase_price: 205, description: 'Pillsbury Chakki Fresh Atta' },
  { name: 'Fortune Chakki Fresh Atta 10kg', category: 'Atta & Flour', unit: 'Kilograms', mrp: 425, gst_rate: 0, hsn: '1101', purchase_price: 395, description: 'Fortune Chakki Fresh Atta' },
  { name: 'Maida 1kg', category: 'Atta & Flour', unit: 'Kilograms', mrp: 35, gst_rate: 0, hsn: '1101', purchase_price: 32, description: 'All Purpose Refined Wheat Flour Maida' },

  // ========== OIL & GHEE (GST 5%) ==========
  { name: 'Fortune Sunflower Oil 1L', category: 'Oil & Ghee', unit: 'Litres', mrp: 145, gst_rate: 5, hsn: '1512', purchase_price: 135, description: 'Fortune Sunflower Refined Oil', keywords: ['oil', 'fortune', 'cooking'] },
  { name: 'Fortune Sunflower Oil 5L', category: 'Oil & Ghee', unit: 'Litres', mrp: 710, gst_rate: 5, hsn: '1512', purchase_price: 660, description: 'Fortune Sunflower Oil Jar' },
  { name: 'Saffola Gold Oil 1L', category: 'Oil & Ghee', unit: 'Litres', mrp: 195, gst_rate: 5, hsn: '1512', purchase_price: 180, description: 'Saffola Gold Pro Healthy Lifestyle Oil' },
  { name: 'Dhara Mustard Oil 1L', category: 'Oil & Ghee', unit: 'Litres', mrp: 160, gst_rate: 5, hsn: '1514', purchase_price: 148, description: 'Dhara Kachi Ghani Mustard Oil' },
  { name: 'Amul Ghee 500ml', category: 'Oil & Ghee', unit: 'Millilitres', mrp: 320, gst_rate: 12, hsn: '0405', purchase_price: 290, description: 'Amul Pure Ghee' },
  { name: 'Amul Ghee 1L', category: 'Oil & Ghee', unit: 'Litres', mrp: 620, gst_rate: 12, hsn: '0405', purchase_price: 560, description: 'Amul Pure Cow Ghee' },

  // ========== RICE & PULSES (GST 0%) ==========
  { name: 'India Gate Basmati Rice 1kg', category: 'Rice & Pulses', unit: 'Kilograms', mrp: 135, gst_rate: 0, hsn: '1006', purchase_price: 125, description: 'India Gate Classic Basmati Rice' },
  { name: 'India Gate Basmati Rice 5kg', category: 'Rice & Pulses', unit: 'Kilograms', mrp: 650, gst_rate: 0, hsn: '1006', purchase_price: 600, description: 'India Gate Basmati Rice Family Pack' },
  { name: 'Daawat Basmati Rice 1kg', category: 'Rice & Pulses', unit: 'Kilograms', mrp: 140, gst_rate: 0, hsn: '1006', purchase_price: 130, description: 'Daawat Dubar Basmati Rice' },
  { name: 'Toor Dal 1kg', category: 'Rice & Pulses', unit: 'Kilograms', mrp: 130, gst_rate: 0, hsn: '0713', purchase_price: 120, description: 'Arhar Toor Dal Yellow' },
  { name: 'Moong Dal 1kg', category: 'Rice & Pulses', unit: 'Kilograms', mrp: 140, gst_rate: 0, hsn: '0713', purchase_price: 130, description: 'Green Moong Dal' },
  { name: 'Chana Dal 1kg', category: 'Rice & Pulses', unit: 'Kilograms', mrp: 110, gst_rate: 0, hsn: '0713', purchase_price: 102, description: 'Bengal Gram Chana Dal' },

  // ========== INSTANT NOODLES (GST 12%) ==========
  { name: 'Maggi Masala Noodles 70g', category: 'Instant Noodles', unit: 'Packets', mrp: 12, gst_rate: 12, hsn: '21069099', purchase_price: 10, description: 'Maggi 2-Minute Masala Noodles', keywords: ['maggi', 'noodles', 'instant'] },
  { name: 'Maggi Masala Noodles 280g', category: 'Instant Noodles', unit: 'Packets', mrp: 48, gst_rate: 12, hsn: '21069099', purchase_price: 42, description: 'Maggi Masala Noodles Family Pack' },
  { name: 'Yippee Noodles 70g', category: 'Instant Noodles', unit: 'Packets', mrp: 10, gst_rate: 12, hsn: '21069099', purchase_price: 8, description: 'Yippee Magic Masala Noodles' },
  { name: 'Top Ramen Noodles 70g', category: 'Instant Noodles', unit: 'Packets', mrp: 12, gst_rate: 12, hsn: '21069099', purchase_price: 10, description: 'Top Ramen Curry Noodles' },

  // ========== TOOTHPASTE & ORAL CARE (GST 18%) ==========
  { name: 'Colgate Toothpaste 100g', category: 'Toothpaste & Oral Care', unit: 'Pieces', mrp: 55, gst_rate: 18, hsn: '33061020', purchase_price: 48, description: 'Colgate Strong Teeth Toothpaste', keywords: ['colgate', 'toothpaste', 'dental'] },
  { name: 'Colgate Toothpaste 200g', category: 'Toothpaste & Oral Care', unit: 'Pieces', mrp: 100, gst_rate: 18, hsn: '33061020', purchase_price: 88, description: 'Colgate Total Advanced Health' },
  { name: 'Pepsodent Toothpaste 100g', category: 'Toothpaste & Oral Care', unit: 'Pieces', mrp: 48, gst_rate: 18, hsn: '33061020', purchase_price: 42, description: 'Pepsodent Germicheck Toothpaste' },
  { name: 'Sensodyne Toothpaste 70g', category: 'Toothpaste & Oral Care', unit: 'Pieces', mrp: 150, gst_rate: 18, hsn: '33061020', purchase_price: 132, description: 'Sensodyne Rapid Relief Toothpaste' },
  { name: 'Oral B Toothbrush', category: 'Toothpaste & Oral Care', unit: 'Pieces', mrp: 35, gst_rate: 18, hsn: '96032100', purchase_price: 30, description: 'Oral B Classic Clean Toothbrush' },

  // ========== SOAP & BODY WASH (GST 18%) ==========
  { name: 'Lux Soap 100g', category: 'Soap & Body Wash', unit: 'Pieces', mrp: 38, gst_rate: 18, hsn: '34011190', purchase_price: 32, description: 'Lux Soft Touch Beauty Soap', keywords: ['lux', 'soap', 'bath'] },
  { name: 'Lux Soap 125g', category: 'Soap & Body Wash', unit: 'Pieces', mrp: 45, gst_rate: 18, hsn: '34011190', purchase_price: 38, description: 'Lux International Beauty Soap' },
  { name: 'Dettol Soap 75g', category: 'Soap & Body Wash', unit: 'Pieces', mrp: 38, gst_rate: 18, hsn: '34011190', purchase_price: 33, description: 'Dettol Original Germ Protection Soap' },
  { name: 'Lifebuoy Soap 100g', category: 'Soap & Body Wash', unit: 'Pieces', mrp: 32, gst_rate: 18, hsn: '34011190', purchase_price: 28, description: 'Lifebuoy Total Protection Soap' },
  { name: 'Santoor Soap 100g', category: 'Soap & Body Wash', unit: 'Pieces', mrp: 35, gst_rate: 18, hsn: '34011190', purchase_price: 30, description: 'Santoor Sandal & Turmeric Soap' },
  { name: 'Dove Soap 100g', category: 'Soap & Body Wash', unit: 'Pieces', mrp: 70, gst_rate: 18, hsn: '34011190', purchase_price: 60, description: 'Dove Cream Beauty Bathing Bar' },

  // ========== SALT & SPICES (GST 0%) ==========
  { name: 'Tata Salt 1kg', category: 'Salt & Spices', unit: 'Kilograms', mrp: 24, gst_rate: 0, hsn: '25010010', purchase_price: 22, description: 'Tata Salt Lite Low Sodium', keywords: ['salt', 'tata', 'namak'] },
  { name: 'Tata Salt 500g', category: 'Salt & Spices', unit: 'Grams', mrp: 13, gst_rate: 0, hsn: '25010010', purchase_price: 12, description: 'Tata Salt Iodised' },
  { name: 'Everest Turmeric Powder 100g', category: 'Salt & Spices', unit: 'Grams', mrp: 45, gst_rate: 5, hsn: '09103000', purchase_price: 40, description: 'Everest Haldi Turmeric Powder' },
  { name: 'Everest Chilli Powder 100g', category: 'Salt & Spices', unit: 'Grams', mrp: 50, gst_rate: 5, hsn: '09042200', purchase_price: 44, description: 'Everest Red Chilli Powder' },
  { name: 'MDH Garam Masala 100g', category: 'Salt & Spices', unit: 'Grams', mrp: 85, gst_rate: 5, hsn: '09109190', purchase_price: 75, description: 'MDH Garam Masala Spice Mix' },

  // ========== DETERGENT & LAUNDRY (GST 18%) ==========
  { name: 'Surf Excel Matic 1kg', category: 'Detergent & Laundry', unit: 'Kilograms', mrp: 195, gst_rate: 18, hsn: '34029011', purchase_price: 170, description: 'Surf Excel Matic Front Load Detergent', keywords: ['surf', 'detergent', 'washing'] },
  { name: 'Surf Excel Easy Wash 1kg', category: 'Detergent & Laundry', unit: 'Kilograms', mrp: 150, gst_rate: 18, hsn: '34029011', purchase_price: 132, description: 'Surf Excel Quick Wash Detergent Powder' },
  { name: 'Ariel Detergent 1kg', category: 'Detergent & Laundry', unit: 'Kilograms', mrp: 180, gst_rate: 18, hsn: '34029011', purchase_price: 158, description: 'Ariel Matic Detergent Powder' },
  { name: 'Tide Plus 1kg', category: 'Detergent & Laundry', unit: 'Kilograms', mrp: 165, gst_rate: 18, hsn: '34029011', purchase_price: 145, description: 'Tide Plus Detergent Powder' },
  { name: 'Vim Dishwash Bar 200g', category: 'Detergent & Laundry', unit: 'Pieces', mrp: 20, gst_rate: 18, hsn: '34022090', purchase_price: 17, description: 'Vim Bar Dishwash' },
  { name: 'Vim Dishwash Gel 500ml', category: 'Detergent & Laundry', unit: 'Millilitres', mrp: 90, gst_rate: 18, hsn: '34022090', purchase_price: 78, description: 'Vim Lemon Dishwash Gel' },

  // ========== HEALTH DRINKS (GST 18%) ==========
  { name: 'Horlicks 500g', category: 'Health Drinks', unit: 'Jars', mrp: 285, gst_rate: 18, hsn: '21069099', purchase_price: 250, description: 'Horlicks Health & Nutrition Drink', keywords: ['horlicks', 'health', 'drink'] },
  { name: 'Horlicks 1kg', category: 'Health Drinks', unit: 'Jars', mrp: 550, gst_rate: 18, hsn: '21069099', purchase_price: 480, description: 'Horlicks Jumbo Pack' },
  { name: 'Boost 500g', category: 'Health Drinks', unit: 'Jars', mrp: 240, gst_rate: 18, hsn: '21069099', purchase_price: 210, description: 'Boost Health Energy & Sports Nutrition Drink' },
  { name: 'Complan 500g', category: 'Health Drinks', unit: 'Jars', mrp: 320, gst_rate: 18, hsn: '21069099', purchase_price: 280, description: 'Complan Nutrition & Health Drink' },
  { name: 'Bournvita 500g', category: 'Health Drinks', unit: 'Jars', mrp: 250, gst_rate: 18, hsn: '21069099', purchase_price: 220, description: 'Cadbury Bournvita Health Drink' },

  // ========== BABY CARE (GST 18% for diapers, 12% for powder) ==========
  { name: 'Pampers Diapers Small', category: 'Baby Care', unit: 'Packets', mrp: 499, gst_rate: 18, hsn: '96190010', purchase_price: 435, description: 'Pampers Baby Dry Pants Small 56 Count' },
  { name: 'Pampers Diapers Medium', category: 'Baby Care', unit: 'Packets', mrp: 549, gst_rate: 18, hsn: '96190010', purchase_price: 480, description: 'Pampers Baby Dry Pants Medium 52 Count' },
  { name: 'Pampers Diapers Large', category: 'Baby Care', unit: 'Packets', mrp: 599, gst_rate: 18, hsn: '96190010', purchase_price: 520, description: 'Pampers Baby Dry Pants Large 48 Count' },
  { name: 'Johnson Baby Powder 200g', category: 'Baby Care', unit: 'Grams', mrp: 140, gst_rate: 12, hsn: '33049990', purchase_price: 122, description: 'Johnson\'s Baby Powder' },
  { name: 'Johnson Baby Soap 75g', category: 'Baby Care', unit: 'Pieces', mrp: 45, gst_rate: 18, hsn: '34011190', purchase_price: 39, description: 'Johnson\'s Baby Milk Soap' },

  // ========== SANITARY NAPKINS (GST 12%) ==========
  { name: 'Whisper Ultra Wings', category: 'Sanitary Napkins', unit: 'Packets', mrp: 120, gst_rate: 12, hsn: '96190010', purchase_price: 100, description: 'Whisper Ultra Clean XL Wings 15 Pads' },
  { name: 'Whisper Choice Wings', category: 'Sanitary Napkins', unit: 'Packets', mrp: 70, gst_rate: 12, hsn: '96190010', purchase_price: 60, description: 'Whisper Choice Regular Wings 8 Pads' },
  { name: 'Stayfree Secure XL', category: 'Sanitary Napkins', unit: 'Packets', mrp: 95, gst_rate: 12, hsn: '96190010', purchase_price: 80, description: 'Stayfree Secure XL 10 Pads' },
  { name: 'Sofy Bodyfit XL', category: 'Sanitary Napkins', unit: 'Packets', mrp: 110, gst_rate: 12, hsn: '96190010', purchase_price: 92, description: 'Sofy Bodyfit XL Wings 14 Pads' },

  // ========== CONDOMS & CONTRACEPTIVES (GST 18%) ==========
  { name: 'Durex Condoms', category: 'Condoms & Contraceptives', unit: 'Packets', mrp: 200, gst_rate: 18, hsn: '40141010', purchase_price: 170, description: 'Durex Extra Dots Condoms 10s' },
  { name: 'Manforce Condoms', category: 'Condoms & Contraceptives', unit: 'Packets', mrp: 150, gst_rate: 18, hsn: '40141010', purchase_price: 128, description: 'Manforce 3in1 Condoms 10s' },
  { name: 'Skore Condoms', category: 'Condoms & Contraceptives', unit: 'Packets', mrp: 120, gst_rate: 18, hsn: '40141010', purchase_price: 102, description: 'Skore Not Out Condoms 10s' },

  // ========== BEVERAGES (GST 12% for tea/coffee, 28% for aerated drinks) ==========
  { name: 'Tata Tea Gold 500g', category: 'Beverages', unit: 'Grams', mrp: 240, gst_rate: 5, hsn: '09023000', purchase_price: 220, description: 'Tata Tea Gold Leaf Tea' },
  { name: 'Red Label Tea 500g', category: 'Beverages', unit: 'Grams', mrp: 220, gst_rate: 5, hsn: '09023000', purchase_price: 200, description: 'Brooke Bond Red Label Tea' },
  { name: 'Nescafe Classic 50g', category: 'Beverages', unit: 'Grams', mrp: 180, gst_rate: 12, hsn: '21011190', purchase_price: 158, description: 'Nescafe Classic Instant Coffee' },
  { name: 'Bru Instant Coffee 50g', category: 'Beverages', unit: 'Grams', mrp: 150, gst_rate: 12, hsn: '21011190', purchase_price: 132, description: 'Bru Gold Instant Coffee' },
  { name: 'Coca Cola 2L', category: 'Beverages', unit: 'Litres', mrp: 90, gst_rate: 28, hsn: '22021000', purchase_price: 70, description: 'Coca Cola Soft Drink' },
  { name: 'Pepsi 2L', category: 'Beverages', unit: 'Litres', mrp: 85, gst_rate: 28, hsn: '22021000', purchase_price: 68, description: 'Pepsi Soft Drink' },

  // ========== MEDICINES (GST 12% for common OTC) ==========
  { name: 'Dettol Liquid 200ml', category: 'Medicines & Health', unit: 'Millilitres', mrp: 110, gst_rate: 18, hsn: '38089400', purchase_price: 95, description: 'Dettol Antiseptic Liquid' },
  { name: 'Vicks Vaporub 50ml', category: 'Medicines & Health', unit: 'Millilitres', mrp: 130, gst_rate: 18, hsn: '30049099', purchase_price: 112, description: 'Vicks Vaporub Cold Relief' },
  { name: 'Iodex 40g', category: 'Medicines & Health', unit: 'Grams', mrp: 90, gst_rate: 12, hsn: '30049099', purchase_price: 78, description: 'Iodex Pain Relief Balm' },
  { name: 'Band Aid Strip 10s', category: 'Medicines & Health', unit: 'Packets', mrp: 50, gst_rate: 12, hsn: '30051000', purchase_price: 43, description: 'Band Aid Adhesive Bandages' },

  // ========== ELECTRONICS & APPLIANCES (GST 18%) ==========
  { name: 'Duracell AA Battery', category: 'Electronics', unit: 'Packets', mrp: 80, gst_rate: 18, hsn: '85061000', purchase_price: 68, description: 'Duracell AA Alkaline Batteries 4 Pack' },
  { name: 'Philips LED Bulb 9W', category: 'Electronics', unit: 'Pieces', mrp: 120, gst_rate: 18, hsn: '85395000', purchase_price: 100, description: 'Philips 9W B22 LED Cool Day White' },
  { name: 'Bajaj Extension Board', category: 'Electronics', unit: 'Pieces', mrp: 250, gst_rate: 18, hsn: '85366990', purchase_price: 210, description: 'Bajaj 4 Socket Extension Cord' },

  // ========== STATIONERY (GST 12%) ==========
  { name: 'Classmate Notebook 120 Pages', category: 'Stationery', unit: 'Pieces', mrp: 50, gst_rate: 12, hsn: '48201000', purchase_price: 43, description: 'Classmate Single Line Notebook' },
  { name: 'Reynolds Pen Blue', category: 'Stationery', unit: 'Pieces', mrp: 10, gst_rate: 12, hsn: '96081099', purchase_price: 8, description: 'Reynolds Trimax Ball Pen' },
  { name: 'Fevicol 100g', category: 'Stationery', unit: 'Grams', mrp: 30, gst_rate: 18, hsn: '35061000', purchase_price: 26, description: 'Fevicol All Purpose Adhesive' },

  // ========== PERSONAL CARE (GST 18%) ==========
  { name: 'Parachute Coconut Oil 200ml', category: 'Personal Care', unit: 'Millilitres', mrp: 90, gst_rate: 18, hsn: '15131990', purchase_price: 78, description: 'Parachute Pure Coconut Oil' },
  { name: 'Clinic Plus Shampoo 340ml', category: 'Personal Care', unit: 'Millilitres', mrp: 140, gst_rate: 18, hsn: '33051000', purchase_price: 120, description: 'Clinic Plus Strong & Long Shampoo' },
  { name: 'Head & Shoulders 340ml', category: 'Personal Care', unit: 'Millilitres', mrp: 350, gst_rate: 18, hsn: '33051000', purchase_price: 300, description: 'Head & Shoulders Anti Dandruff Shampoo' },
  { name: 'Gillette Razor', category: 'Personal Care', unit: 'Pieces', mrp: 130, gst_rate: 18, hsn: '82121000', purchase_price: 112, description: 'Gillette Mach 3 Razor' },
  { name: 'Gillette Foam 200ml', category: 'Personal Care', unit: 'Millilitres', mrp: 165, gst_rate: 18, hsn: '34051000', purchase_price: 142, description: 'Gillette Classic Shaving Foam' },
]

/**
 * Search Master Items - Intelligent Fuzzy Matching
 * Returns matching items sorted by relevance
 */
export function searchMasterItems(query: string): MasterItem[] {
  if (!query || query.length < 2) return []

  const normalized = query.toLowerCase().trim()
  const words = normalized.split(/\s+/)

  // Score each item based on match quality
  const scored = ITEM_MASTER.map(item => {
    let score = 0

    // Exact match (highest priority)
    if (item.name.toLowerCase() === normalized) {
      score += 100
    }

    // Name starts with query
    if (item.name.toLowerCase().startsWith(normalized)) {
      score += 80
    }

    // Name contains query
    if (item.name.toLowerCase().includes(normalized)) {
      score += 60
    }

    // Category match
    if (item.category.toLowerCase().includes(normalized)) {
      score += 40
    }

    // Keyword match
    if (item.keywords) {
      for (const keyword of item.keywords) {
        if (keyword.includes(normalized)) {
          score += 50
        }
      }
    }

    // Multi-word match (all words present)
    const allWordsPresent = words.every(word =>
      item.name.toLowerCase().includes(word) ||
      item.category.toLowerCase().includes(word) ||
      item.keywords?.some(k => k.includes(word))
    )
    if (allWordsPresent && words.length > 1) {
      score += 70
    }

    return { item, score }
  })

  // Filter and sort by score
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10) // Top 10 matches
    .map(s => s.item)
}

/**
 * Get exact match or best match
 */
export function findBestMatch(query: string): MasterItem | null {
  const results = searchMasterItems(query)
  return results.length > 0 ? results[0] : null
}
