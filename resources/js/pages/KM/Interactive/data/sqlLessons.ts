export interface SqlChallenge {
    instruction: string;
    hint: string;
    solution: string;
    checkType?: 'query' | 'dml';
}

export interface SqlLesson {
    id: number;
    level: string;
    category: 'select' | 'sorting' | 'aggregate' | 'join' | 'advanced' | 'dml';
    title: string;
    description: string;
    tip: string;
    starterCode: string;
    challenge: SqlChallenge;
}

export const SQL_CATEGORIES = [
    { id: 'all', label: 'ทั้งหมด (26)' },
    { id: 'select', label: '1. พื้นฐาน SELECT & กรอง (7)' },
    { id: 'sorting', label: '2. จัดเรียง & ตัดแบ่ง (3)' },
    { id: 'aggregate', label: '3. สรุปผล & GROUP BY (3)' },
    { id: 'join', label: '4. เชื่อมตาราง JOIN (4)' },
    { id: 'advanced', label: '5. ขั้นสูง & วันที่ (5)' },
    { id: 'dml', label: '6. จัดการข้อมูล DML (4)' },
];

export const SQL_LESSONS: SqlLesson[] = [
    {
        id: 1,
        level: 'บทที่ 1 · พื้นฐาน',
        category: 'select',
        title: 'เริ่มต้นกับคำสั่ง SELECT',
        description: `คำสั่ง **SELECT** คือคำสั่งพื้นฐานที่สุดและสำคัญที่สุดในภาษา SQL ใช้สำหรับดึงข้อมูล (Query) ออกมาจากตาราง

ไวยากรณ์พื้นฐาน:
\`\`\`sql
SELECT column1, column2 FROM table_name;
\`\`\`
หากต้องการเลือกทุกคอลัมน์ในตาราง สามารถใช้เครื่องหมายดอกจัน \`*\` แทนได้ เช่น:
\`\`\`sql
SELECT * FROM customers;
\`\`\`
*ข้อแนะนำ:* ในการทำงานจริง การระบุชื่อคอลัมน์ที่ต้องการโดยตรงจะช่วยให้คำสั่งทำงานเร็วขึ้นและลดภาระเครือข่าย`,
        tip: 'ลองกดปุ่ม "รัน SQL (Ctrl+Enter)" เพื่อดูผลลัพธ์ของคำสั่งในช่อง Editor ด้านขวามือ',
        starterCode: 'SELECT * FROM customers;',
        challenge: {
            instruction: 'เขียนคำสั่ง SELECT เพื่อดึงเฉพาะคอลัมน์ name และ email จากตาราง customers',
            hint: 'พิมพ์ SELECT name, email FROM customers; แล้วกดปุ่มตรวจคำตอบ',
            solution: 'SELECT name, email FROM customers;',
            checkType: 'query',
        },
    },
    {
        id: 2,
        level: 'บทที่ 2 · พื้นฐาน',
        category: 'select',
        title: 'การตั้งชื่อคอลัมน์ใหม่ (Column Alias ด้วย AS)',
        description: `บ่อยครั้งที่ชื่อคอลัมน์ในฐานข้อมูลเป็นภาษาอังกฤษหรือเป็นตัวย่อ เราสามารถใช้คำสั่ง **AS** เพื่อเปลี่ยนชื่อหัวคอลัมน์ในตารางผลลัพธ์ให้อ่านง่ายขึ้นได้

ไวยากรณ์:
\`\`\`sql
SELECT name AS customer_name, city AS province FROM customers;
\`\`\`
หากชื่อใหม่มีช่องว่าง ให้ครอบด้วยเครื่องหมาย Single Quote เช่น \`AS 'ชื่อลูกค้า'\``,
        tip: 'คำสั่ง AS เปลี่ยนเฉพาะชื่อที่แสดงในผลลัพธ์เท่านั้น ไม่ได้เปลี่ยนชื่อคอลัมน์จริงในฐานข้อมูล',
        starterCode: 'SELECT name AS customer_name, email FROM customers;',
        challenge: {
            instruction: 'เขียนคำสั่งดึงชื่อสินค้า (name) ให้แสดงเป็น product_name และราคา (price) ให้แสดงเป็น unit_price จากตาราง products',
            hint: 'SELECT name AS product_name, price AS unit_price FROM products;',
            solution: 'SELECT name AS product_name, price AS unit_price FROM products;',
            checkType: 'query',
        },
    },
    {
        id: 3,
        level: 'บทที่ 3 · การกรองข้อมูล',
        category: 'select',
        title: 'การกรองข้อมูลด้วยประโยค WHERE',
        description: `ประโยค **WHERE** ใช้สำหรับกำหนดเงื่อนไขเพื่อดึงเฉพาะแถวข้อมูลที่เราสนใจ

เครื่องหมายเปรียบเทียบมาตรฐาน:
- \`=\` เท่ากับ
- \`!=\` หรือ \`<>\` ไม่เท่ากับ
- \`>\` มากกว่า, \`<\` น้อยกว่า
- \`>=\` มากกว่าหรือเท่ากับ, \`<=\` น้อยกว่าหรือเท่ากับ

ตัวอย่าง:
\`\`\`sql
SELECT * FROM products WHERE price >= 1000;
\`\`\`
*ข้อควรจำ:* หากค่าที่ต้องการเปรียบเทียบเป็นข้อความ (String) หรือวันที่ ต้องครอบด้วยเครื่องหมาย Single Quote เช่น \`WHERE city = 'Bangkok'\``,
        tip: 'ใน SQL การเปรียบเทียบข้อความใน SQLite ไม่สนใจตัวพิมพ์เล็ก-ใหญ่สำหรับตัวอักษรภาษาอังกฤษพื้นฐาน',
        starterCode: "SELECT * FROM customers WHERE city = 'Bangkok';",
        challenge: {
            instruction: 'ดึงรายการสินค้าทั้งหมดจากตาราง products ที่มีราคา (price) มากกว่า 1,000 บาท',
            hint: 'SELECT * FROM products WHERE price > 1000;',
            solution: 'SELECT * FROM products WHERE price > 1000;',
            checkType: 'query',
        },
    },
    {
        id: 4,
        level: 'บทที่ 4 · การกรองข้อมูล',
        category: 'select',
        title: 'ตัวดำเนินการทางตรรกะ AND, OR, NOT',
        description: `เราสามารถรวมหลายเงื่อนไขเข้าด้วยกันในประโยค WHERE ได้โดยใช้:
- **AND:** ข้อมูลต้องตรงตาม *ทุกเงื่อนไข*
- **OR:** ข้อมูลตรงตาม *เงื่อนไขใดเงื่อนไขหนึ่ง* ก็จะถูกดึงออกมา
- **NOT:** ปฏิเสธเงื่อนไข (ตรงข้าม)

ตัวอย่าง:
\`\`\`sql
SELECT * FROM products 
WHERE category_id = 1 AND price < 1000;
\`\`\``,
        tip: 'หากมีทั้ง AND และ OR ในประโยคเดียวกัน ควรใส่วงเล็บ ( ) เพื่อกำหนดลำดับการทำงานที่ชัดเจน',
        starterCode: "SELECT * FROM customers WHERE city = 'Bangkok' AND member_tier = 'Gold';",
        challenge: {
            instruction: "ดึงข้อมูลลูกค้าจากตาราง customers ที่อาศัยอยู่ใน 'Bangkok' หรือ 'Chiang Mai'",
            hint: "SELECT * FROM customers WHERE city = 'Bangkok' OR city = 'Chiang Mai';",
            solution: "SELECT * FROM customers WHERE city = 'Bangkok' OR city = 'Chiang Mai';",
            checkType: 'query',
        },
    },
    {
        id: 5,
        level: 'บทที่ 5 · การกรองข้อมูล',
        category: 'select',
        title: 'ค้นหาข้อความด้วย LIKE และ Wildcards',
        description: `เมื่อต้องการค้นหาข้อความบางส่วน (Search) เช่น ค้นหายาที่มีคำว่า "Amlodipine" หรืออีเมลที่ลงท้ายด้วย "@email.com" เราจะใช้ **LIKE** ร่วมกับ Wildcard:
- \`%\` แทนตัวอักษรกี่ตัวก็ได้ (0 ตัวขึ้นไป)
- \`_\` แทนตัวอักษร 1 ตัวพอดี

ตัวอย่าง:
\`\`\`sql
-- ค้นหาลูกค้าที่อีเมลลงท้ายด้วย @email.com
SELECT * FROM customers WHERE email LIKE '%@email.com';

-- ค้นหาสินค้าที่มีคำว่า Wireless
SELECT * FROM products WHERE name LIKE '%Wireless%';
\`\`\``,
        tip: 'เครื่องหมาย % ไว้ข้างหน้าหมายถึงลงท้ายด้วย, ไว้ข้างหลังหมายถึงขึ้นต้นด้วย, ไว้ทั้งหน้าและหลังหมายถึงมีคำนี้อยู่ที่ใดก็ได้',
        starterCode: "SELECT * FROM products WHERE name LIKE '%Wireless%';",
        challenge: {
            instruction: "ค้นหาสินค้าจากตาราง products ที่มีคำว่า 'Pro' หรือ 'Fast' อยู่ในชื่อสินค้า (name LIKE '%Fast%')",
            hint: "SELECT * FROM products WHERE name LIKE '%Fast%';",
            solution: "SELECT * FROM products WHERE name LIKE '%Fast%';",
            checkType: 'query',
        },
    },
    {
        id: 6,
        level: 'บทที่ 6 · การกรองข้อมูล',
        category: 'select',
        title: 'การตรวจสอบช่วงและกลุ่มค่า (BETWEEN และ IN)',
        description: `แทนที่จะเขียนเงื่อนไขยาวๆ เราสามารถใช้คำสั่งลัด:
- **BETWEEN min AND max:** กรองค่าที่อยู่ในช่วง (รวมค่าขอบทั้งสองด้วย)
- **IN (value1, value2, ...):** กรองค่าที่ตรงกับสมาชิกในรายการ

ตัวอย่าง:
\`\`\`sql
-- ราคาระหว่าง 500 ถึง 2000 บาท
SELECT * FROM products WHERE price BETWEEN 500 AND 2000;

-- ลูกค้าที่อยู่ในเมืองที่กำหนด
SELECT * FROM customers WHERE city IN ('Bangkok', 'Phuket', 'Chiang Mai');
\`\`\``,
        tip: 'สามารถใช้ NOT BETWEEN หรือ NOT IN เพื่อเลือกสิ่งที่อยู่นอกช่วงได้เช่นกัน',
        starterCode: 'SELECT * FROM products WHERE price BETWEEN 400 AND 1000;',
        challenge: {
            instruction: "ดึงรายการคำสั่งซื้อจากตาราง orders ที่มีสถานะ (status) เป็น 'Completed' หรือ 'Pending' โดยใช้คำสั่ง IN",
            hint: "SELECT * FROM orders WHERE status IN ('Completed', 'Pending');",
            solution: "SELECT * FROM orders WHERE status IN ('Completed', 'Pending');",
            checkType: 'query',
        },
    },
    {
        id: 7,
        level: 'บทที่ 7 · การกรองข้อมูล',
        category: 'select',
        title: 'การจัดการค่าว่าง (IS NULL และ IS NOT NULL)',
        description: `ในฐานข้อมูล **NULL** หมายถึง "ไม่มีข้อมูล" หรือยังไม่ถูกกำหนดค่า
*ข้อสำคัญ:* เราไม่สามารถใช้ \`= NULL\` หรือ \`!= NULL\` ได้ จะต้องใช้ **IS NULL** หรือ **IS NOT NULL** เสมอ

ตัวอย่าง:
\`\`\`sql
-- หาสินค้าที่ยังไม่เคยได้รับคะแนนรีวิว
SELECT * FROM products WHERE rating IS NULL;

-- หาสินค้าที่มีการให้คะแนนแล้ว
SELECT * FROM products WHERE rating IS NOT NULL;
\`\`\``,
        tip: 'ในระบบโรงพยาบาล ผลตรวจแล็บที่ยังไม่ออก หรือวันจำหน่ายผู้ป่วยในที่ยังนอนรักษาอยู่ มักเก็บเป็นค่า NULL',
        starterCode: 'SELECT * FROM products WHERE rating IS NULL;',
        challenge: {
            instruction: 'ดึงรายการสินค้าทั้งหมดจากตาราง products ที่มีคะแนนรีวิวแล้ว (rating IS NOT NULL)',
            hint: 'SELECT * FROM products WHERE rating IS NOT NULL;',
            solution: 'SELECT * FROM products WHERE rating IS NOT NULL;',
            checkType: 'query',
        },
    },
    {
        id: 8,
        level: 'บทที่ 8 · การจัดเรียง',
        category: 'sorting',
        title: 'การเรียงลำดับผลลัพธ์ด้วย ORDER BY',
        description: `คำสั่ง **ORDER BY** ใช้จัดเรียงแถวข้อมูลตามคอลัมน์ที่ระบุ:
- **ASC:** เรียงจากน้อยไปมาก (ค่าเริ่มต้น)
- **DESC:** เรียงจากมากไปน้อย

ตัวอย่าง:
\`\`\`sql
-- เรียงสินค้าจากราคาแพงที่สุดไปถูกที่สุด
SELECT name, price FROM products ORDER BY price DESC;

-- เรียงตามเมือง (A-Z) และถ้าเมืองเดียวกันให้เรียงตามชื่อ
SELECT name, city FROM customers ORDER BY city ASC, name ASC;
\`\`\``,
        tip: 'ORDER BY จะต้องเขียนอยู่หลังประโยค WHERE เสมอ',
        starterCode: 'SELECT name, price FROM products ORDER BY price DESC;',
        challenge: {
            instruction: 'ดึงชื่อสินค้าและจำนวนสต็อกคงเหลือ (name, stock_quantity) จากตาราง products โดยเรียงจากสต็อกมากที่สุดไปน้อยที่สุด (DESC)',
            hint: 'SELECT name, stock_quantity FROM products ORDER BY stock_quantity DESC;',
            solution: 'SELECT name, stock_quantity FROM products ORDER BY stock_quantity DESC;',
            checkType: 'query',
        },
    },
    {
        id: 9,
        level: 'บทที่ 9 · การจัดเรียง',
        category: 'sorting',
        title: 'การจำกัดจำนวนแถว (LIMIT และ OFFSET)',
        description: `เมื่อตารางมีข้อมูลเป็นหมื่นแถว เราสามารถใช้ **LIMIT** เพื่อจำกัดจำนวนผลลัพธ์ เช่น นำ 5 อันดับแรก และใช้ **OFFSET** สำหรับการแบ่งหน้า (Pagination)

ตัวอย่าง:
\`\`\`sql
-- ดึงสินค้าที่มีราคาสูงสุด 3 อันดับแรก (Top 3)
SELECT name, price FROM products 
ORDER BY price DESC 
LIMIT 3;

-- ดึงหน้าที่ 2 (แถวที่ 4 ถึง 6) โดยข้าม 3 แถวแรก
SELECT name, price FROM products 
ORDER BY price DESC 
LIMIT 3 OFFSET 3;
\`\`\``,
        tip: 'สูตรแบ่งหน้า: OFFSET = (หน้า - 1) * จำนวนต่อหน้า',
        starterCode: 'SELECT name, price FROM products ORDER BY price DESC LIMIT 5;',
        challenge: {
            instruction: 'ดึงสินค้าที่มีราคาถูกที่สุด 5 อันดับแรก (ORDER BY price ASC LIMIT 5)',
            hint: 'SELECT name, price FROM products ORDER BY price ASC LIMIT 5;',
            solution: 'SELECT name, price FROM products ORDER BY price ASC LIMIT 5;',
            checkType: 'query',
        },
    },
    {
        id: 10,
        level: 'บทที่ 10 · การจัดเรียง',
        category: 'sorting',
        title: 'ตัดค่าที่ซ้ำกันด้วย DISTINCT',
        description: `หากในตารางมีข้อมูลซ้ำกันในคอลัมน์ เช่น ลูกค้าหลายคนอยู่เมืองเดียวกัน เราสามารถใส่ **DISTINCT** หลัง SELECT เพื่อดึงเฉพาะค่าที่ไม่ซ้ำกัน (Unique values) ออกมา

ตัวอย่าง:
\`\`\`sql
-- ดูว่ามีลูกค้ากระจายตัวอยู่ในจังหวัด/เมืองใดบ้าง โดยไม่ให้ชื่อเมืองซ้ำ
SELECT DISTINCT city FROM customers;
\`\`\``,
        tip: 'DISTINCT สามารถใช้กับหลายคอลัมน์พร้อมกันได้ เช่น DISTINCT city, member_tier',
        starterCode: 'SELECT DISTINCT city FROM customers;',
        challenge: {
            instruction: 'ดึงรายชื่อระดับสมาชิก (member_tier) ทั้งหมดที่มีในตาราง customers โดยไม่ให้มีค่าซ้ำกัน',
            hint: 'SELECT DISTINCT member_tier FROM customers;',
            solution: 'SELECT DISTINCT member_tier FROM customers;',
            checkType: 'query',
        },
    },
    {
        id: 11,
        level: 'บทที่ 11 · การคำนวณ',
        category: 'aggregate',
        title: 'ฟังก์ชันคำนวณสรุปยอด (Aggregate Functions)',
        description: `SQL มีฟังก์ชันคำนวณค่าทางสถิติที่ทำงานบนกลุ่มข้อมูล:
- **COUNT(*):** นับจำนวนแถวทั้งหมด
- **SUM(col):** หาผลรวมตัวเลข
- **AVG(col):** หาค่าเฉลี่ย
- **MIN(col):** หาค่าน้อยที่สุด
- **MAX(col):** หาค่ามากที่สุด

ตัวอย่าง:
\`\`\`sql
SELECT 
  COUNT(*) AS total_products,
  AVG(price) AS average_price,
  MIN(price) AS min_price,
  MAX(price) AS max_price
FROM products;
\`\`\``,
        tip: 'COUNT(col) จะไม่นับแถวที่มีค่าเป็น NULL แต่ COUNT(*) จะนับทุกแถวเสมอ',
        starterCode: 'SELECT COUNT(*) AS total_orders, SUM(total_amount) AS total_revenue FROM orders;',
        challenge: {
            instruction: 'คำนวณหายอดรวมเงินทั้งหมด (SUM(total_amount)) จากตาราง orders โดยตั้งชื่อคอลัมน์เป็น grand_total',
            hint: 'SELECT SUM(total_amount) AS grand_total FROM orders;',
            solution: 'SELECT SUM(total_amount) AS grand_total FROM orders;',
            checkType: 'query',
        },
    },
    {
        id: 12,
        level: 'บทที่ 12 · การคำนวณ',
        category: 'aggregate',
        title: 'การจัดกลุ่มข้อมูลด้วย GROUP BY',
        description: `เมื่อต้องการคำนวณผลรวมหรือนับจำนวนแยกตามแต่ละกลุ่ม เช่น แยกตามหมวดสินค้า หรือแยกตามจังหวัด เราจะใช้ **GROUP BY**

ตัวอย่าง:
\`\`\`sql
-- นับจำนวนลูกค้าในแต่ละเมือง
SELECT city, COUNT(*) AS customer_count 
FROM customers 
GROUP BY city;

-- หาราคาเฉลี่ยของสินค้าในแต่ละหมวดหมู่
SELECT category_id, AVG(price) AS avg_price 
FROM products 
GROUP BY category_id;
\`\`\``,
        tip: 'คอลัมน์ที่อยู่หลัง SELECT (ที่ไม่ใช่ฟังก์ชัน Aggregate) ทุกตัวจะต้องถูกนำมาใส่ไว้ใน GROUP BY เสมอ',
        starterCode: 'SELECT city, COUNT(*) AS total FROM customers GROUP BY city;',
        challenge: {
            instruction: 'เขียนคำสั่งนับจำนวนลูกค้า (COUNT(*)) แยกตามระดับสมาชิก (member_tier) จากตาราง customers',
            hint: 'SELECT member_tier, COUNT(*) AS count FROM customers GROUP BY member_tier;',
            solution: 'SELECT member_tier, COUNT(*) AS count FROM customers GROUP BY member_tier;',
            checkType: 'query',
        },
    },
    {
        id: 13,
        level: 'บทที่ 13 · การคำนวณ',
        category: 'aggregate',
        title: 'การกรองกลุ่มข้อมูลด้วย HAVING',
        description: `ข้อแตกต่างสำคัญใน SQL:
- **WHERE:** กรองข้อมูล *ก่อน* นำไปจัดกลุ่ม (ไม่สามารถใช้กับฟังก์ชัน SUM, COUNT ได้)
- **HAVING:** กรองข้อมูล *หลัง* จากคำนวณ Aggregate แล้ว

ตัวอย่าง:
\`\`\`sql
-- หาเมืองที่มีลูกค้ามากกว่า 1 คน
SELECT city, COUNT(*) AS customer_count 
FROM customers 
GROUP BY city 
HAVING COUNT(*) > 1;
\`\`\``,
        tip: 'จำง่ายๆ: กรองแถวเดี่ยวใช้ WHERE แต่ถ้ากรองยอดรวมหรือผลการนับกลุ่ม ให้ใช้ HAVING',
        starterCode: 'SELECT city, COUNT(*) AS total FROM customers GROUP BY city HAVING COUNT(*) > 1;',
        challenge: {
            instruction: 'หาหมวดหมู่สินค้า (category_id) ที่มีสินค้ามากกว่า 2 ชนิดในตาราง products (COUNT(*) > 2)',
            hint: 'SELECT category_id, COUNT(*) AS product_count FROM products GROUP BY category_id HAVING COUNT(*) > 2;',
            solution: 'SELECT category_id, COUNT(*) AS product_count FROM products GROUP BY category_id HAVING COUNT(*) > 2;',
            checkType: 'query',
        },
    },
    {
        id: 14,
        level: 'บทที่ 14 · การเชื่อมตาราง',
        category: 'join',
        title: 'ทำความเข้าใจ INNER JOIN',
        description: `ฐานข้อมูลเชิงสัมพันธ์ (Relational DB) จะแยกเก็บข้อมูลคนละตารางเพื่อลดความซ้ำซ้อน คำสั่ง **INNER JOIN** ใช้เชื่อม 2 ตารางเข้าด้วยกันโดยดึงเฉพาะแถวที่มีคีย์เชื่อมโยงตรงกันทั้งสองฝั่ง

ไวยากรณ์:
\`\`\`sql
SELECT products.name, categories.name AS category_name
FROM products
INNER JOIN categories ON products.category_id = categories.category_id;
\`\`\``,
        tip: 'เราสามารถตั้งชื่อย่อให้ตาราง (Table Alias) ได้ เช่น FROM products p INNER JOIN categories c ON p.category_id = c.category_id',
        starterCode: `SELECT p.name AS product_name, p.price, c.name AS category_name
FROM products p
INNER JOIN categories c ON p.category_id = c.category_id;`,
        challenge: {
            instruction: 'ดึงรหัสคำสั่งซื้อ (orders.order_id) พร้อมชื่อลูกค้า (customers.name) โดยเชื่อมตาราง orders กับ customers ด้วย customer_id',
            hint: 'SELECT orders.order_id, customers.name FROM orders INNER JOIN customers ON orders.customer_id = customers.customer_id;',
            solution: 'SELECT orders.order_id, customers.name FROM orders INNER JOIN customers ON orders.customer_id = customers.customer_id;',
            checkType: 'query',
        },
    },
    {
        id: 15,
        level: 'บทที่ 15 · การเชื่อมตาราง',
        category: 'join',
        title: 'การใช้งาน LEFT JOIN',
        description: `**LEFT JOIN** (หรือ LEFT OUTER JOIN) จะดึงข้อมูลจากตารางฝั่งซ้าย (ตารางหลัก) ออกมา **ครบทุกแถว** เสมอ หากตารางฝั่งขวาไม่มีข้อมูลตรงกัน คอลัมน์ฝั่งขวาจะแสดงเป็น \`NULL\`

ตัวอย่าง:
\`\`\`sql
-- ดึงลูกค้าทุกคน และคำสั่งซื้อของพวกเขา (ลูกค้าที่ยังไม่เคยสั่งซื้อก็จะแสดง โดยยอดคำสั่งซื้อเป็น NULL)
SELECT c.name, o.order_id, o.total_amount
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id;
\`\`\``,
        tip: 'หากต้องการหาว่า "ลูกค้าคนไหนที่ไม่เคยสั่งซื้อเลย" ให้ใช้ LEFT JOIN แล้วตามด้วย WHERE o.order_id IS NULL',
        starterCode: `SELECT c.name, o.order_id, o.total_amount
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id;`,
        challenge: {
            instruction: 'ดึงชื่อสินค้า (products.name) และคะแนนรีวิว (reviews.rating) โดยใช้ LEFT JOIN ระหว่าง products กับ reviews ด้วย product_id',
            hint: 'SELECT p.name, r.rating FROM products p LEFT JOIN reviews r ON p.product_id = r.product_id;',
            solution: 'SELECT p.name, r.rating FROM products p LEFT JOIN reviews r ON p.product_id = r.product_id;',
            checkType: 'query',
        },
    },
    {
        id: 16,
        level: 'บทที่ 16 · การเชื่อมตาราง',
        category: 'join',
        title: 'การเชื่อมโยงหลายตาราง (Multi-Table JOIN)',
        description: `ในระบบงานจริง เรามักต้องเชื่อมโยงมากกว่า 2 ตาราง เช่น ต้องการทราบว่า "ลูกค้าชื่ออะไร ซื้อสินค้าชิ้นไหน ในราคาเท่าใด"

ตัวอย่าง:
\`\`\`sql
SELECT 
  c.name AS customer_name,
  o.order_id,
  p.name AS product_name,
  oi.quantity,
  oi.unit_price
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id;
\`\`\``,
        tip: 'คำสั่ง JOIN แบบไม่ระบุคำนำหน้า ใน SQLite จะมีค่าเทียบเท่ากับ INNER JOIN',
        starterCode: `SELECT o.order_id, c.name, oi.quantity, p.name AS product
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id;`,
        challenge: {
            instruction: 'ดึง order_id, ชื่อลูกค้า (customers.name), และชื่อสินค้า (products.name) โดย JOIN ตาราง orders, customers, order_items, products เข้าด้วยกัน',
            hint: 'SELECT o.order_id, c.name, p.name FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id;',
            solution: 'SELECT o.order_id, c.name, p.name FROM orders o JOIN customers c ON o.customer_id = c.customer_id JOIN order_items oi ON o.order_id = oi.order_id JOIN products p ON oi.product_id = p.product_id;',
            checkType: 'query',
        },
    },
    {
        id: 17,
        level: 'บทที่ 17 · ระบบโรงพยาบาล',
        category: 'join',
        title: 'การดึงข้อมูลผู้ป่วยและการจ่ายยา (Hospital DB)',
        description: `ลองฝึกเชื่อมโยงตารางข้อมูลโรงพยาบาลจริง:
- \`hospital_patients\`: ข้อมูลผู้ป่วย (hn, full_name, gender, birth_date)
- \`hospital_visits\`: ประวัติการตรวจ (vn, hn, visit_date, department, systolic_bp)
- \`hospital_prescriptions\`: รายการยาที่ได้รับ (vn, drug_name, qty, total_cost)

ตัวอย่างคำสั่งเชื่อมโยง:
\`\`\`sql
SELECT 
  p.hn,
  p.full_name,
  v.visit_date,
  v.department,
  rx.drug_name,
  rx.qty
FROM hospital_patients p
JOIN hospital_visits v ON p.hn = v.hn
JOIN hospital_prescriptions rx ON v.vn = rx.vn;
\`\`\``,
        tip: 'ตารางใน HOSxP เช่น patient, ovst, opitemrece มีรูปแบบคีย์ hn และ vn ในลักษณะเดียวกันนี้',
        starterCode: `SELECT p.hn, p.full_name, v.visit_date, rx.drug_name
FROM hospital_patients p
JOIN hospital_visits v ON p.hn = v.hn
JOIN hospital_prescriptions rx ON v.vn = rx.vn;`,
        challenge: {
            instruction: "ดึงรายชื่อผู้ป่วย (full_name), วันที่ตรวจ (visit_date), และชื่อยา (drug_name) ของผู้ป่วยที่มีความดัน systolic_bp >= 140",
            hint: "SELECT p.full_name, v.visit_date, rx.drug_name FROM hospital_patients p JOIN hospital_visits v ON p.hn = v.hn JOIN hospital_prescriptions rx ON v.vn = rx.vn WHERE v.systolic_bp >= 140;",
            solution: "SELECT p.full_name, v.visit_date, rx.drug_name FROM hospital_patients p JOIN hospital_visits v ON p.hn = v.hn JOIN hospital_prescriptions rx ON v.vn = rx.vn WHERE v.systolic_bp >= 140;",
            checkType: 'query',
        },
    },
    {
        id: 18,
        level: 'บทที่ 18 · คิวรีขั้นสูง',
        category: 'advanced',
        title: 'การใช้ Subquery ในประโยค WHERE',
        description: `**Subquery** คือคำสั่ง SELECT ย่อยที่ซ้อนอยู่ภายในคำสั่ง SQL อื่น มักใช้ในการหาค่าเปรียบเทียบที่มีการคำนวณก่อน เช่น "หาสินค้าที่มีราคาสูงกว่าราคาเฉลี่ยของทั้งร้าน"

ตัวอย่าง:
\`\`\`sql
SELECT name, price 
FROM products 
WHERE price > (SELECT AVG(price) FROM products);
\`\`\``,
        tip: 'Subquery ภายใน WHERE ที่ใช้กับเครื่องหมายเปรียบเทียบ (> , < , =) จะต้องส่งกลับค่าเพียงค่าเดียว (Scalar value)',
        starterCode: 'SELECT name, price FROM products WHERE price > (SELECT AVG(price) FROM products);',
        challenge: {
            instruction: 'เขียนคำสั่งหาสินค้าทั้งหมดที่มีราคาต่ำกว่าค่าเฉลี่ยของสินค้าในตาราง products (price < (SELECT AVG(price) FROM products))',
            hint: 'SELECT name, price FROM products WHERE price < (SELECT AVG(price) FROM products);',
            solution: 'SELECT name, price FROM products WHERE price < (SELECT AVG(price) FROM products);',
            checkType: 'query',
        },
    },
    {
        id: 19,
        level: 'บทที่ 19 · คิวรีขั้นสูง',
        category: 'advanced',
        title: 'คำสั่งเงื่อนไข CASE WHEN ... THEN ... ELSE ... END',
        description: `คำสั่ง **CASE** เทียบเท่ากับคำสั่ง If-Else ในภาษาโปรแกรม ใช้สำหรับแปลงค่าหรือจัดกลุ่มข้อมูลแบบมีเงื่อนไขในขณะ Query

ตัวอย่าง:
\`\`\`sql
SELECT name, price,
  CASE 
    WHEN price >= 2000 THEN 'แพงมาก (Premium)'
    WHEN price >= 1000 THEN 'ปานกลาง (Medium)'
    ELSE 'ประหยัด (Budget)'
  END AS price_group
FROM products;
\`\`\``,
        tip: 'ต้องปิดท้ายประโยคเงื่อนไขด้วยคำว่า END เสมอ และสามารถตั้งชื่อคอลัมน์ผลลัพธ์ด้วย AS ได้',
        starterCode: `SELECT name, price,
  CASE 
    WHEN price >= 1000 THEN 'High'
    ELSE 'Normal'
  END AS tier
FROM products;`,
        challenge: {
            instruction: "เขียนคำสั่งดึงชื่อลูกค้า (name) และสร้างคอลัมน์ status_thai โดยถ้า member_tier = 'Gold' หรือ 'Platinum' ให้แสดง 'ลูกค้า VIP' นอกนั้นให้แสดง 'ลูกค้าทั่วไป'",
            hint: "SELECT name, CASE WHEN member_tier IN ('Gold', 'Platinum') THEN 'ลูกค้า VIP' ELSE 'ลูกค้าทั่วไป' END AS status_thai FROM customers;",
            solution: "SELECT name, CASE WHEN member_tier IN ('Gold', 'Platinum') THEN 'ลูกค้า VIP' ELSE 'ลูกค้าทั่วไป' END AS status_thai FROM customers;",
            checkType: 'query',
        },
    },
    {
        id: 20,
        level: 'บทที่ 20 · คิวรีขั้นสูง',
        category: 'advanced',
        title: 'ฟังก์ชันจัดการวันที่และเวลา (Date Functions)',
        description: `ใน SQLite ข้อมูลวันที่จะถูกจัดเก็บในรูปแบบข้อความ ISO-8601 \`YYYY-MM-DD\` โดยมีฟังก์ชันจัดการวันที่หลักได้แก่:
- \`DATE('now')\`: วันที่ปัจจุบัน
- \`STRFTIME('%Y', col)\`: ดึงเฉพาะปี (ค.ศ.)
- \`STRFTIME('%m', col)\`: ดึงเฉพาะเดือน (01-12)
- การคำนวณช่วงวัน: \`JULIANDAY(date1) - JULIANDAY(date2)\`

ตัวอย่าง:
\`\`\`sql
-- ดึงออเดอร์ที่สั่งในเดือนกุมภาพันธ์ 2025
SELECT order_id, order_date, total_amount 
FROM orders 
WHERE strftime('%m', order_date) = '02';
\`\`\``,
        tip: 'strftime เป็นฟังก์ชันที่มีประโยชน์มากสำหรับทำรายงานสรุปยอดรายเดือนหรือรายปี',
        starterCode: "SELECT order_id, order_date FROM orders WHERE strftime('%m', order_date) = '01';",
        challenge: {
            instruction: "ดึงรายการสั่งซื้อทั้งหมดที่เกิดขึ้นในปี 2025 (strftime('%Y', order_date) = '2025')",
            hint: "SELECT * FROM orders WHERE strftime('%Y', order_date) = '2025';",
            solution: "SELECT * FROM orders WHERE strftime('%Y', order_date) = '2025';",
            checkType: 'query',
        },
    },
    {
        id: 21,
        level: 'บทที่ 21 · คิวรีขั้นสูง',
        category: 'advanced',
        title: 'การรวมผลลัพธ์ด้วย UNION และ UNION ALL',
        description: `เมื่อมีคำสั่ง SELECT สองคำสั่งและต้องการนำแถวผลลัพธ์มาต่อกันในแนวตั้ง:
- **UNION:** รวมผลลัพธ์และตัดแถวที่ซ้ำกันออก
- **UNION ALL:** รวมผลลัพธ์ทั้งหมดโดยเก็บแถวที่ซ้ำไว้ (ทำงานเร็วกว่า)

*เงื่อนไข:* ทั้งสองคำสั่ง SELECT จะต้องมี **จำนวนคอลัมน์เท่ากัน** และมีชนิดข้อมูลที่เข้ากันได้`,
        tip: 'UNION เหมาะสำหรับการดึงข้อมูลจากแหล่งที่คล้ายกัน เช่น ประวัติผู้ป่วยนอก รวมกับ ประวัติผู้ป่วยใน',
        starterCode: `SELECT name, 'Customer' AS role FROM customers
UNION ALL
SELECT name, 'Product' AS role FROM products;`,
        challenge: {
            instruction: "เขียนคำสั่งดึงชื่อเมือง (city) จากตาราง customers มารวมกับชื่อแผนก (name) จากตาราง hospital_departments โดยใช้ UNION",
            hint: "SELECT city AS item_name FROM customers UNION SELECT name AS item_name FROM hospital_departments;",
            solution: "SELECT city AS item_name FROM customers UNION SELECT name AS item_name FROM hospital_departments;",
            checkType: 'query',
        },
    },
    {
        id: 22,
        level: 'บทที่ 22 · คิวรีขั้นสูง',
        category: 'advanced',
        title: 'การวิเคราะห์ความดันโลหิตผู้ป่วย (Clinical Case Study)',
        description: `ในเวชระเบียน เกณฑ์ผู้ป่วยความดันโลหิตสูง (Hypertension) ทั่วไปคือความดันตัวบน (Systolic) >= 140 หรือความดันตัวล่าง (Diastolic) >= 90 mmHg

ในแบบฝึกหัดนี้ ให้ลองเขียนคำสั่งค้นหาผู้ป่วยที่มีภาวะความดันโลหิตสูง และนับว่ามารับบริการทั้งหมดกี่ครั้ง พร้อมแสดงความดันตัวบนสูงสุดที่เคยวัดได้`,
        tip: 'ใช้ฟังก์ชัน MAX() และ COUNT() ร่วมกับ WHERE และ GROUP BY',
        starterCode: `SELECT p.hn, p.full_name, COUNT(*) AS visit_count, MAX(v.systolic_bp) AS max_systolic
FROM hospital_patients p
JOIN hospital_visits v ON p.hn = v.hn
WHERE v.systolic_bp >= 140 OR v.diastolic_bp >= 90
GROUP BY p.hn, p.full_name;`,
        challenge: {
            instruction: 'ดึงรหัส hn, ชื่อผู้ป่วย full_name, และค่าความดันตัวบนเฉลี่ย (AVG(systolic_bp)) จาก hospital_patients และ hospital_visits โดยกรองเฉพาะผู้ที่มาตรวจที่แผนก "อายุรกรรม (OPD)"',
            hint: 'SELECT p.hn, p.full_name, AVG(v.systolic_bp) AS avg_bp FROM hospital_patients p JOIN hospital_visits v ON p.hn = v.hn WHERE v.department = "อายุรกรรม (OPD)" GROUP BY p.hn, p.full_name;',
            solution: 'SELECT p.hn, p.full_name, AVG(v.systolic_bp) AS avg_bp FROM hospital_patients p JOIN hospital_visits v ON p.hn = v.hn WHERE v.department = "อายุรกรรม (OPD)" GROUP BY p.hn, p.full_name;',
            checkType: 'query',
        },
    },
    {
        id: 23,
        level: 'บทที่ 23 · การจัดการข้อมูล',
        category: 'dml',
        title: 'การเพิ่มข้อมูลใหม่ด้วย INSERT INTO',
        description: `คำสั่ง **INSERT INTO** ใช้เพิ่มแถวข้อมูลใหม่เข้าไปในตาราง

ไวยากรณ์:
\`\`\`sql
INSERT INTO table_name (col1, col2, col3)
VALUES (val1, val2, val3);
\`\`\`
ตัวอย่าง:
\`\`\`sql
INSERT INTO categories (category_id, name, description)
VALUES (5, 'Health & Beauty', 'ผลิตภัณฑ์เพื่อสุขภาพและความงาม');
\`\`\``,
        tip: 'หลังจากรันคำสั่ง INSERT แล้ว สามารถเขียน SELECT * FROM categories; เพื่อตรวจสอบผลลัพธ์ที่เพิ่มเข้าไปได้',
        starterCode: "INSERT INTO categories (category_id, name, description) VALUES (5, 'Health & Beauty', 'ผลิตภัณฑ์เพื่อสุขภาพและความงาม');",
        challenge: {
            instruction: "เพิ่มหมวดหมู่ใหม่ลงในตาราง categories โดยมี category_id = 5, name = 'Health & Beauty', description = 'ผลิตภัณฑ์สุขภาพ'",
            hint: "INSERT INTO categories (category_id, name, description) VALUES (5, 'Health & Beauty', 'ผลิตภัณฑ์สุขภาพ');",
            solution: "INSERT INTO categories (category_id, name, description) VALUES (5, 'Health & Beauty', 'ผลิตภัณฑ์สุขภาพ');",
            checkType: 'dml',
        },
    },
    {
        id: 24,
        level: 'บทที่ 24 · การจัดการข้อมูล',
        category: 'dml',
        title: 'การแก้ไขข้อมูลด้วย UPDATE',
        description: `คำสั่ง **UPDATE** ใช้แก้ไขข้อมูลที่มีอยู่เดิมในตาราง
⚠️ **ข้อควรระวังอย่างยิ่ง:** จะต้องใส่ประโยค **WHERE** เสมอ มิฉะนั้นข้อมูลทุกแถวในตารางจะถูกแก้ไขทั้งหมด!

ไวยากรณ์:
\`\`\`sql
UPDATE table_name
SET column1 = new_value1, column2 = new_value2
WHERE condition;
\`\`\``,
        tip: 'เทคนิคปลอดภัย: ลองเขียน SELECT ... WHERE ดูก่อนว่าตรงกับแถวที่ต้องการแก้จริงหรือไม่ แล้วค่อยเปลี่ยนเป็น UPDATE',
        starterCode: "UPDATE products SET price = 499.00 WHERE product_id = 1;",
        challenge: {
            instruction: "ปรับปรุงระดับสมาชิกของลูกค้า customer_id = 3 ในตาราง customers ให้เป็น 'Platinum'",
            hint: "UPDATE customers SET member_tier = 'Platinum' WHERE customer_id = 3;",
            solution: "UPDATE customers SET member_tier = 'Platinum' WHERE customer_id = 3;",
            checkType: 'dml',
        },
    },
    {
        id: 25,
        level: 'บทที่ 25 · การจัดการข้อมูล',
        category: 'dml',
        title: 'การลบข้อมูลด้วย DELETE',
        description: `คำสั่ง **DELETE** ใช้ลบแถวข้อมูลออกจากตาราง
⚠️ **ข้อควรระวัง:** หากไม่ระบุ WHERE คำสั่งจะลบข้อมูล *ทุกแถว* ในตารางออกจนหมด!

ไวยากรณ์:
\`\`\`sql
DELETE FROM table_name WHERE condition;
\`\`\``,
        tip: 'ในระบบโรงพยาบาลส่วนใหญ่จะไม่ใช้ DELETE จริง แต่มักใช้วิธีเปลี่ยนสถานะ เช่น is_active = false เพื่อรักษาประวัติย้อนหลัง (Audit trail)',
        starterCode: "DELETE FROM reviews WHERE review_id = 1;",
        challenge: {
            instruction: "ลบคำสั่งซื้อที่มีสถานะเป็น 'Cancelled' (orders.status = 'Cancelled') ออกจากตาราง orders",
            hint: "DELETE FROM orders WHERE status = 'Cancelled';",
            solution: "DELETE FROM orders WHERE status = 'Cancelled';",
            checkType: 'dml',
        },
    },
    {
        id: 26,
        level: 'บทที่ 26 · ภารกิจส่งท้าย',
        category: 'dml',
        title: 'ภารกิจวิเคราะห์รายงานสรุปยอดผู้ป่วยและมูลค่ายา',
        description: `ขอแสดงความยินดีที่คุณได้เรียนรู้ทักษะ SQL มาจนถึงบทเรียนสุดท้าย!
ในภารกิจนี้ ให้นำความรู้เรื่อง JOIN, Aggregate functions และ GROUP BY มาร่วมกันทำรายงานสรุป:

จงหาว่า **ผู้ป่วยแต่ละคน (hn, full_name) ได้รับยารวมมูลค่าทั้งสิ้นกี่บาท (SUM(total_cost))**
โดยเรียงลำดับจากผู้ที่มียอดค่ายาสูงที่สุดไปน้อยที่สุด`,
        tip: 'เชื่อมตาราง hospital_patients -> hospital_visits -> hospital_prescriptions แล้วใช้ SUM และ GROUP BY',
        starterCode: `SELECT p.hn, p.full_name, SUM(rx.total_cost) AS total_drug_cost
FROM hospital_patients p
JOIN hospital_visits v ON p.hn = v.hn
JOIN hospital_prescriptions rx ON v.vn = rx.vn
GROUP BY p.hn, p.full_name
ORDER BY total_drug_cost DESC;`,
        challenge: {
            instruction: 'เขียนคำสั่งดึง p.hn, p.full_name, และยอดค่ายารวม SUM(rx.total_cost) AS total_drug_cost โดย GROUP BY p.hn, p.full_name และ ORDER BY total_drug_cost DESC',
            hint: 'SELECT p.hn, p.full_name, SUM(rx.total_cost) AS total_drug_cost FROM hospital_patients p JOIN hospital_visits v ON p.hn = v.hn JOIN hospital_prescriptions rx ON v.vn = rx.vn GROUP BY p.hn, p.full_name ORDER BY total_drug_cost DESC;',
            solution: 'SELECT p.hn, p.full_name, SUM(rx.total_cost) AS total_drug_cost FROM hospital_patients p JOIN hospital_visits v ON p.hn = v.hn JOIN hospital_prescriptions rx ON v.vn = rx.vn GROUP BY p.hn, p.full_name ORDER BY total_drug_cost DESC;',
            checkType: 'query',
        },
    },
];
