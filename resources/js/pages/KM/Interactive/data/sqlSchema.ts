/**
 * SQL Journey — Schema & Initial Seed Data
 * ประกอบด้วย 2 ชุดข้อมูล:
 * 1. ฐานข้อมูลร้านค้า (E-Commerce - ShopNova) สำหรับฝึกฝนโจทย์ทั่วไป
 * 2. ฐานข้อมูลโรงพยาบาล (Hospital OPD/IPD Data) สำหรับฝึกฝนการดึงข้อมูลผู้ป่วย การตรวจ และการสั่งยา
 */

export interface TableColumn {
    name: string;
    type: string;
    isPrimary?: boolean;
    isForeign?: boolean;
    references?: string;
    nullable?: boolean;
    description: string;
}

export interface TableMeta {
    name: string;
    thaiName: string;
    category: 'ecommerce' | 'hospital';
    description: string;
    columns: TableColumn[];
    sampleQuery: string;
}

export const TABLES_SCHEMA: TableMeta[] = [
    {
        name: 'customers',
        thaiName: 'ลูกค้า (Customers)',
        category: 'ecommerce',
        description: 'ข้อมูลลูกค้า สมาชิก และที่อยู่',
        sampleQuery: 'SELECT customer_id, name, city, member_tier FROM customers LIMIT 5;',
        columns: [
            { name: 'customer_id', type: 'INTEGER', isPrimary: true, description: 'รหัสลูกค้า (Primary Key)' },
            { name: 'name', type: 'TEXT', nullable: false, description: 'ชื่อ-นามสกุล' },
            { name: 'email', type: 'TEXT', nullable: false, description: 'อีเมล' },
            { name: 'city', type: 'TEXT', nullable: false, description: 'จังหวัด/เมือง' },
            { name: 'member_tier', type: 'TEXT', description: 'ระดับสมาชิก (Bronze, Silver, Gold, Platinum)' },
            { name: 'registered_date', type: 'TEXT', description: 'วันที่สมัครสมาชิก (YYYY-MM-DD)' },
        ],
    },
    {
        name: 'categories',
        thaiName: 'หมวดหมู่สินค้า (Categories)',
        category: 'ecommerce',
        description: 'ประเภทและหมวดหมู่ของสินค้า',
        sampleQuery: 'SELECT * FROM categories;',
        columns: [
            { name: 'category_id', type: 'INTEGER', isPrimary: true, description: 'รหัสหมวดหมู่' },
            { name: 'name', type: 'TEXT', nullable: false, description: 'ชื่อหมวดหมู่' },
            { name: 'description', type: 'TEXT', description: 'คำอธิบาย' },
        ],
    },
    {
        name: 'products',
        thaiName: 'สินค้า (Products)',
        category: 'ecommerce',
        description: 'รายการสินค้า ราคา จำนวนคงคลัง และคะแนนรีวิว',
        sampleQuery: 'SELECT product_id, name, price, stock_quantity, rating FROM products LIMIT 5;',
        columns: [
            { name: 'product_id', type: 'INTEGER', isPrimary: true, description: 'รหัสสินค้า' },
            { name: 'name', type: 'TEXT', nullable: false, description: 'ชื่อสินค้า' },
            { name: 'category_id', type: 'INTEGER', isForeign: true, references: 'categories.category_id', description: 'รหัสหมวดหมู่' },
            { name: 'price', type: 'REAL', nullable: false, description: 'ราคาจำหน่าย (บาท)' },
            { name: 'stock_quantity', type: 'INTEGER', nullable: false, description: 'จำนวนคงเหลือในคลัง' },
            { name: 'rating', type: 'REAL', description: 'คะแนนเฉลี่ย 1.0 - 5.0 (หรือ NULL ถ้ายังไม่มีรีวิว)' },
        ],
    },
    {
        name: 'orders',
        thaiName: 'คำสั่งซื้อ (Orders)',
        category: 'ecommerce',
        description: 'ใบสั่งซื้อ วันที่ และสถานะการจัดส่ง',
        sampleQuery: 'SELECT order_id, customer_id, order_date, total_amount, status FROM orders LIMIT 5;',
        columns: [
            { name: 'order_id', type: 'INTEGER', isPrimary: true, description: 'รหัสคำสั่งซื้อ' },
            { name: 'customer_id', type: 'INTEGER', isForeign: true, references: 'customers.customer_id', description: 'รหัสลูกค้า' },
            { name: 'order_date', type: 'TEXT', nullable: false, description: 'วันที่สั่งซื้อ (YYYY-MM-DD)' },
            { name: 'total_amount', type: 'REAL', nullable: false, description: 'ยอดรวมทั้งสิ้น (บาท)' },
            { name: 'status', type: 'TEXT', description: 'สถานะคำสั่งซื้อ (Pending, Completed, Cancelled)' },
        ],
    },
    {
        name: 'order_items',
        thaiName: 'รายการสินค้าในคำสั่งซื้อ (Order Items)',
        category: 'ecommerce',
        description: 'รายการย่อยแต่ละชิ้นในคำสั่งซื้อ',
        sampleQuery: 'SELECT order_id, product_id, quantity, unit_price FROM order_items LIMIT 5;',
        columns: [
            { name: 'order_item_id', type: 'INTEGER', isPrimary: true, description: 'รหัสรายการ' },
            { name: 'order_id', type: 'INTEGER', isForeign: true, references: 'orders.order_id', description: 'รหัสคำสั่งซื้อ' },
            { name: 'product_id', type: 'INTEGER', isForeign: true, references: 'products.product_id', description: 'รหัสสินค้า' },
            { name: 'quantity', type: 'INTEGER', nullable: false, description: 'จำนวนชิ้น' },
            { name: 'unit_price', type: 'REAL', nullable: false, description: 'ราคาต่อหน่วยขณะสั่งซื้อ' },
        ],
    },
    {
        name: 'reviews',
        thaiName: 'รีวิวสินค้า (Reviews)',
        category: 'ecommerce',
        description: 'ความเห็นและคะแนนความพึงพอใจ',
        sampleQuery: 'SELECT review_id, product_id, customer_id, rating, comment FROM reviews LIMIT 5;',
        columns: [
            { name: 'review_id', type: 'INTEGER', isPrimary: true, description: 'รหัสรีวิว' },
            { name: 'product_id', type: 'INTEGER', isForeign: true, references: 'products.product_id', description: 'รหัสสินค้า' },
            { name: 'customer_id', type: 'INTEGER', isForeign: true, references: 'customers.customer_id', description: 'รหัสลูกค้า' },
            { name: 'rating', type: 'INTEGER', nullable: false, description: 'คะแนน (1 - 5)' },
            { name: 'comment', type: 'TEXT', description: 'ความคิดเห็น' },
        ],
    },
    // Hospital Schema
    {
        name: 'hospital_patients',
        thaiName: 'ผู้ป่วย (Hospital Patients)',
        category: 'hospital',
        description: 'ทะเบียนประวัติผู้ป่วย (HN)',
        sampleQuery: 'SELECT hn, full_name, gender, birth_date, blood_group FROM hospital_patients LIMIT 5;',
        columns: [
            { name: 'hn', type: 'TEXT', isPrimary: true, description: 'หมายเลขประจำตัวผู้ป่วย (HN)' },
            { name: 'full_name', type: 'TEXT', nullable: false, description: 'ชื่อ-นามสกุลผู้ป่วย' },
            { name: 'gender', type: 'TEXT', description: 'เพศ (M / F)' },
            { name: 'birth_date', type: 'TEXT', description: 'วันเกิด (YYYY-MM-DD)' },
            { name: 'blood_group', type: 'TEXT', description: 'หมู่โลหิต (A, B, O, AB)' },
            { name: 'district', type: 'TEXT', description: 'อำเภอที่อยู่' },
        ],
    },
    {
        name: 'hospital_visits',
        thaiName: 'การมารับบริการ (Hospital Visits)',
        category: 'hospital',
        description: 'ประวัติการตรวจผู้ป่วยนอก (OPD Visits / VN)',
        sampleQuery: 'SELECT vn, hn, visit_date, department, systolic_bp, diagnosis_icd10 FROM hospital_visits LIMIT 5;',
        columns: [
            { name: 'vn', type: 'TEXT', isPrimary: true, description: 'หมายเลขการรับบริการ (VN)' },
            { name: 'hn', type: 'TEXT', isForeign: true, references: 'hospital_patients.hn', description: 'รหัสผู้ป่วย (HN)' },
            { name: 'visit_date', type: 'TEXT', nullable: false, description: 'วันที่มารับบริการ' },
            { name: 'department', type: 'TEXT', description: 'แผนก/ห้องตรวจที่เข้ารับบริการ' },
            { name: 'systolic_bp', type: 'INTEGER', description: 'ความดันตัวบน (mmHg)' },
            { name: 'diastolic_bp', type: 'INTEGER', description: 'ความดันตัวล่าง (mmHg)' },
            { name: 'diagnosis_icd10', type: 'TEXT', description: 'รหัสโรคหลัก (ICD-10) เช่น I10, E11, J00' },
        ],
    },
    {
        name: 'hospital_prescriptions',
        thaiName: 'การสั่งยาผู้ป่วย (Hospital Prescriptions)',
        category: 'hospital',
        description: 'รายการสั่งยาในใบสั่งยา',
        sampleQuery: 'SELECT vn, drug_name, qty, unit_price, total_cost FROM hospital_prescriptions LIMIT 5;',
        columns: [
            { name: 'prescription_id', type: 'INTEGER', isPrimary: true, description: 'รหัสรายการสั่งยา' },
            { name: 'vn', type: 'TEXT', isForeign: true, references: 'hospital_visits.vn', description: 'หมายเลขรับบริการ' },
            { name: 'icode', type: 'TEXT', description: 'รหัสยา (icode)' },
            { name: 'drug_name', type: 'TEXT', nullable: false, description: 'ชื่อยาและขนาดความแรง' },
            { name: 'qty', type: 'INTEGER', nullable: false, description: 'จำนวนเม็ด/ขวด' },
            { name: 'unit_price', type: 'REAL', nullable: false, description: 'ราคาต่อหน่วย' },
            { name: 'total_cost', type: 'REAL', nullable: false, description: 'ราคารวม' },
        ],
    },
    {
        name: 'hospital_departments',
        thaiName: 'แผนกในโรงพยาบาล (Hospital Departments)',
        category: 'hospital',
        description: 'รายชื่อแผนกและคลินิกบริการ',
        sampleQuery: 'SELECT * FROM hospital_departments;',
        columns: [
            { name: 'dept_id', type: 'INTEGER', isPrimary: true, description: 'รหัสแผนก' },
            { name: 'name', type: 'TEXT', nullable: false, description: 'ชื่อแผนก' },
            { name: 'building', type: 'TEXT', description: 'อาคาร' },
            { name: 'floor', type: 'INTEGER', description: 'ชั้น' },
        ],
    },
];

export const INITIAL_SQL_SEED = `
-- ล้างตารางเดิมหากมี
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS customers;

DROP TABLE IF EXISTS hospital_prescriptions;
DROP TABLE IF EXISTS hospital_visits;
DROP TABLE IF EXISTS hospital_patients;
DROP TABLE IF EXISTS hospital_departments;

-- 1. Categories
CREATE TABLE categories (
  category_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

INSERT INTO categories (category_id, name, description) VALUES
(1, 'Electronics', 'อุปกรณ์อิเล็กทรอนิกส์ แกดเจ็ต และคอมพิวเตอร์'),
(2, 'Clothing', 'เสื้อผ้าและแฟชั่นชาย-หญิง'),
(3, 'Books', 'หนังสือ วรรณกรรม และการพัฒนาตนเอง'),
(4, 'Home & Kitchen', 'ของใช้ในบ้านและอุปกรณ์ครัว');

-- 2. Customers
CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  city TEXT NOT NULL,
  member_tier TEXT DEFAULT 'Bronze',
  registered_date TEXT DEFAULT '2025-01-01'
);

INSERT INTO customers (customer_id, name, email, city, member_tier, registered_date) VALUES
(1, 'สมชาย สายเสมอ', 'somchai@email.com', 'Bangkok', 'Gold', '2024-03-15'),
(2, 'สมหญิง จริงใจ', 'somying@email.com', 'Chiang Mai', 'Silver', '2024-04-20'),
(3, 'วิชัย รักดี', 'wichai@email.com', 'Bangkok', 'Bronze', '2024-05-10'),
(4, 'กานดา สดใส', 'kanda@email.com', 'Phuket', 'Platinum', '2024-01-12'),
(5, 'ประสิทธิ์ มั่งคั่ง', 'prasit@email.com', 'Khon Kaen', 'Gold', '2024-06-01'),
(6, 'อารียา ปรีดาดาว', 'areeya@email.com', 'Bangkok', 'Silver', '2024-07-22'),
(7, 'ธนกร ชัยชนะ', 'thanakorn@email.com', 'Pattaya', 'Bronze', '2024-08-14'),
(8, 'พรทิพย์ สุขเกษม', 'porntip@email.com', 'Chiang Mai', 'Bronze', '2024-09-05'),
(9, 'เอกชัย เจริญผล', 'ekkachai@email.com', 'Bangkok', 'Silver', '2024-10-18'),
(10, 'นภาลัย ฟ้ากระจ่าง', 'napalai@email.com', 'Songkhla', 'Bronze', '2024-11-02');

-- 3. Products
CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  price REAL NOT NULL,
  stock_quantity INTEGER NOT NULL,
  rating REAL
);

INSERT INTO products (product_id, name, category_id, price, stock_quantity, rating) VALUES
(1, 'Wireless Mouse M100', 1, 450.00, 120, 4.5),
(2, 'Mechanical Keyboard RGB', 1, 1890.00, 45, 4.8),
(3, 'USB-C Fast Charger 65W', 1, 690.00, 80, 4.6),
(4, 'Noise Cancelling Headphones', 1, 3490.00, 25, 4.9),
(5, 'Cotton T-Shirt Slim Fit', 2, 290.00, 200, 4.2),
(6, 'Denim Jeans Classic', 2, 990.00, 60, 4.3),
(7, 'Winter Jacket Windproof', 2, 1590.00, 30, 4.7),
(8, 'SQL for Data Analysis Book', 3, 380.00, 150, 4.9),
(9, 'JavaScript Mastery 2026', 3, 420.00, 95, 4.6),
(10, 'Air Fryer Digital 4.5L', 4, 1990.00, 40, 4.8),
(11, 'Smart Coffee Maker', 4, 2450.00, 18, 4.5),
(12, 'Ergonomic Desk Mat', 4, 350.00, 85, 4.1),
(13, 'Portable SSD 1TB', 1, 2890.00, 0, NULL),
(14, 'Stainless Steel Water Bottle', 4, 280.00, 0, NULL);

-- 4. Orders
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  order_date TEXT NOT NULL,
  total_amount REAL NOT NULL,
  status TEXT DEFAULT 'Completed'
);

INSERT INTO orders (order_id, customer_id, order_date, total_amount, status) VALUES
(101, 1, '2025-01-05', 2340.00, 'Completed'),
(102, 2, '2025-01-08', 670.00, 'Completed'),
(103, 1, '2025-01-15', 3490.00, 'Completed'),
(104, 3, '2025-01-20', 1890.00, 'Completed'),
(105, 4, '2025-02-01', 5870.00, 'Completed'),
(106, 5, '2025-02-03', 1990.00, 'Completed'),
(107, 2, '2025-02-12', 420.00, 'Completed'),
(108, 6, '2025-02-18', 290.00, 'Cancelled'),
(109, 7, '2025-02-25', 1280.00, 'Pending'),
(110, 1, '2025-03-01', 990.00, 'Completed');

-- 5. Order Items
CREATE TABLE order_items (
  order_item_id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL
);

INSERT INTO order_items (order_item_id, order_id, product_id, quantity, unit_price) VALUES
(1, 101, 1, 1, 450.00),
(2, 101, 2, 1, 1890.00),
(3, 102, 5, 1, 290.00),
(4, 102, 8, 1, 380.00),
(5, 103, 4, 1, 3490.00),
(6, 104, 2, 1, 1890.00),
(7, 105, 4, 1, 3490.00),
(8, 105, 11, 1, 2380.00),
(9, 106, 10, 1, 1990.00),
(10, 107, 9, 1, 420.00),
(11, 108, 5, 1, 290.00),
(12, 109, 1, 2, 450.00),
(13, 109, 8, 1, 380.00),
(14, 110, 6, 1, 990.00);

-- 6. Reviews
CREATE TABLE reviews (
  review_id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT
);

INSERT INTO reviews (review_id, product_id, customer_id, rating, comment) VALUES
(1, 1, 1, 5, 'เมาส์ใช้งานดีมาก น้ำหนักเบา คุ้มราคา'),
(2, 2, 1, 5, 'คีย์บอร์ดพิมพ์สนุก เสียงกดเพราะ'),
(3, 4, 4, 5, 'ระบบตัดเสียงรบกวนเงียบสนิท แนะนำเลย'),
(4, 5, 2, 4, 'เนื้อผ้านุ่มสบาย ซักแล้วไม่หด'),
(5, 8, 2, 5, 'หนังสืออธิบาย SQL ได้เข้าใจง่ายมาก'),
(6, 10, 5, 4, 'หม้อทอดใช้งานสะดวก อาหารกรอบกำลังดี');

-- ==========================================
-- 7. Hospital Patients (HN)
-- ==========================================
CREATE TABLE hospital_patients (
  hn TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  blood_group TEXT,
  district TEXT
);

INSERT INTO hospital_patients (hn, full_name, gender, birth_date, blood_group, district) VALUES
('670001', 'นายอำนาจ พลคง', 'M', '1980-04-12', 'A', 'เมือง'),
('670002', 'นางสาวจินตนา มารวย', 'F', '1992-08-25', 'B', 'ไทรโยค'),
('670003', 'นายสมคิด ก้าวหน้า', 'M', '1975-11-03', 'O', 'ทองผาภูมิ'),
('670004', 'นางวิไลพร ชัยเจริญ', 'F', '1968-02-18', 'AB', 'เมือง'),
('670005', 'นายธวัชชัย บำรุงสุข', 'M', '1988-06-30', 'O', 'ท่าม่วง'),
('670006', 'นางสาวสุดารัตน์ หวานฉ่ำ', 'F', '2001-12-09', 'B', 'บ่อพลอย'),
('670007', 'นายสุเมธ วัฒนา', 'M', '1960-09-14', 'A', 'เมือง');

-- 8. Hospital Visits (VN)
CREATE TABLE hospital_visits (
  vn TEXT PRIMARY KEY,
  hn TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  department TEXT NOT NULL,
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  diagnosis_icd10 TEXT
);

INSERT INTO hospital_visits (vn, hn, visit_date, department, systolic_bp, diastolic_bp, diagnosis_icd10) VALUES
('6801001', '670001', '2026-03-01', 'อายุรกรรม (OPD)', 142, 88, 'I10'),
('6801002', '670002', '2026-03-01', 'กุมารเวชกรรม', 110, 70, 'J00'),
('6801003', '670003', '2026-03-02', 'อายุรกรรม (OPD)', 155, 95, 'E11'),
('6801004', '670004', '2026-03-02', 'ศัลยกรรมกระดูก', 128, 80, 'M54.5'),
('6801005', '670001', '2026-03-10', 'อายุรกรรม (OPD)', 135, 84, 'I10'),
('6801006', '670005', '2026-03-11', 'อายุรกรรม (OPD)', 160, 100, 'I10'),
('6801007', '670006', '2026-03-12', 'หู คอ จมูก', 118, 76, 'J02.9'),
('6801008', '670007', '2026-03-15', 'อายุรกรรม (OPD)', 148, 92, 'I10');

-- 9. Hospital Prescriptions
CREATE TABLE hospital_prescriptions (
  prescription_id INTEGER PRIMARY KEY,
  vn TEXT NOT NULL,
  icode TEXT NOT NULL,
  drug_name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_cost REAL NOT NULL
);

INSERT INTO hospital_prescriptions (prescription_id, vn, icode, drug_name, qty, unit_price, total_cost) VALUES
(1, '6801001', '1460001', 'Amlodipine 5 mg tab', 30, 0.50, 15.00),
(2, '6801001', '1460002', 'Enalapril 5 mg tab', 30, 0.60, 18.00),
(3, '6801002', '1460010', 'Paracetamol 500 mg tab', 20, 0.25, 5.00),
(4, '6801002', '1460015', 'Chlorpheniramine 4 mg tab', 10, 0.20, 2.00),
(5, '6801003', '1460020', 'Metformin 500 mg tab', 60, 0.40, 24.00),
(6, '6801003', '1460025', 'Glipizide 5 mg tab', 30, 0.45, 13.50),
(7, '6801004', '1460030', 'Ibuprofen 400 mg tab', 20, 0.70, 14.00),
(8, '6801004', '1460035', 'Omeprazole 20 mg cap', 14, 0.80, 11.20),
(9, '6801005', '1460001', 'Amlodipine 5 mg tab', 30, 0.50, 15.00),
(10, '6801006', '1460001', 'Amlodipine 5 mg tab', 60, 0.50, 30.00),
(11, '6801006', '1460005', 'Losartan 50 mg tab', 30, 1.20, 36.00),
(12, '6801008', '1460001', 'Amlodipine 5 mg tab', 30, 0.50, 15.00);

-- 10. Hospital Departments
CREATE TABLE hospital_departments (
  dept_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  building TEXT NOT NULL,
  floor INTEGER NOT NULL
);

INSERT INTO hospital_departments (dept_id, name, building, floor) VALUES
(1, 'อายุรกรรม (OPD)', 'อาคารเฉลิมพระเกียรติ', 1),
(2, 'ศัลยกรรมกระดูก', 'อาคารเฉลิมพระเกียรติ', 1),
(3, 'กุมารเวชกรรม', 'อาคารเฉลิมพระเกียรติ', 2),
(4, 'หู คอ จมูก', 'อาคารเฉลิมพระเกียรติ', 2),
(5, 'ห้องปฏิบัติการ (LAB)', 'อาคารสนับสนุนการแพทย์', 1),
(6, 'ห้องยาและคลังยา', 'อาคารสนับสนุนการแพทย์', 1);
`;
