-- สร้าง MySQL users แยกสิทธิ์สำหรับ SMH (รันบนเซิร์ฟเวอร์ฐานข้อมูลด้วยบัญชี root/admin)
-- เปลี่ยนรหัสผ่านด้านล่างก่อนรัน แล้วอัปเดต .env ให้ตรงกัน
--
-- แนะนำ:
--   DB_*                  → smh_app   (แอปหลัก)
--   HOSXP_DB_*            → smh_report (รายงานอ่านอย่างเดียว)
--   HOSXP_BACKUP_DB_*     → smh_backup (dump อ่านอย่างเดียว)

-- ========== 1) แอปหลัก (app_db) ==========
CREATE USER IF NOT EXISTS 'smh_app'@'%' IDENTIFIED BY 'CHANGE_ME_APP_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON `app_db`.* TO 'smh_app'@'%';
-- ถ้าใช้ queue/cache/session ตารางใน DB เดียวกัน สิทธิ์ด้านบนพอ
-- อย่าให้ DROP / FILE / SUPER / PROCESS

-- ========== 2) รายงาน HOSxP (อ่านอย่างเดียว) ==========
CREATE USER IF NOT EXISTS 'smh_report'@'%' IDENTIFIED BY 'CHANGE_ME_REPORT_PASSWORD';
GRANT SELECT ON `hos`.* TO 'smh_report'@'%';

-- ========== 3) สำรอง HOSxP (อ่านอย่างเดียว + สำหรับ mysqldump) ==========
CREATE USER IF NOT EXISTS 'smh_backup'@'%' IDENTIFIED BY 'CHANGE_ME_BACKUP_PASSWORD';
GRANT SELECT, SHOW VIEW, TRIGGER, EVENT, LOCK TABLES
  ON `hos`.* TO 'smh_backup'@'%';
-- ถ้า app_db อยู่เครื่องเดียวกับ backup
GRANT SELECT, SHOW VIEW, TRIGGER, EVENT, LOCK TABLES
  ON `app_db`.* TO 'smh_backup'@'%';

FLUSH PRIVILEGES;

-- ตรวจสิทธิ์
-- SHOW GRANTS FOR 'smh_app'@'%';
-- SHOW GRANTS FOR 'smh_report'@'%';
-- SHOW GRANTS FOR 'smh_backup'@'%';
