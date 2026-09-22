# SMH Module Catalog

> **trigger: model_decision** — โหลดเมื่อต้องการรู้ว่ามีโมดูลอะไรอยู่แล้ว
> เพื่อป้องกัน re-create code ที่มีอยู่แล้ว (ประหยัด context และ effort)

---

## โมดูลทั้งหมดในระบบ

### 🏥 HOSxP Integration
| Service | ไฟล์ | ฟังก์ชัน |
|---------|------|---------|
| Queue | `app/Services/HosxpQueueService.php` | ดึงคิวผู้ป่วยวันนี้ grouped by room |
| Desktop Notify | `app/Services/Hosxp/HosxpDesktopNotifyService.php` | ส่ง notification ผ่าน ksklog |

### 📺 ระบบคิว (FSHH-Q)
| ส่วนประกอบ | ไฟล์ |
|-----------|------|
| TV Display | `resources/views/tv/board.blade.php` |
| Admin Layout | `resources/views/layouts/admin.blade.php` |
| Settings | `resources/views/admin/tv/settings.blade.php` |
| Rooms | `resources/views/admin/tv/rooms.blade.php` |
| Playlist | `resources/views/admin/tv/playlist.blade.php` |
| Board Controller | `app/Http/Controllers/TvBoardController.php` |
| Settings Controller | `app/Http/Controllers/Admin/TvDisplaySettingController.php` |
| Rooms Controller | `app/Http/Controllers/Admin/TvClinicRoomController.php` |
| Playlist Controller | `app/Http/Controllers/Admin/TvMediaPlaylistController.php` |
| Models | `TvDisplaySetting`, `TvClinicRoom`, `TvMediaPlaylist` |

**URL:** `/tv` (จอทีวี), `/admin/tv/*` (ตั้งค่า)

### 💊 เภสัชกรรม (Pharmacy)
| ส่วนประกอบ | ไฟล์ |
|-----------|------|
| Pages | `resources/js/pages/Pharmacy/` |
| Drug Alerts | `pharmacy/drug-alerts` |
| Inventory | `pharmacy/inventory/*` |

### 💰 การเงิน (Finance)
- Revenue Dashboard: `finance-dashboard`
- CGD Claim: `finance/data-hub/cgd-claim`
- LGO: `finance/data-hub/lgo`
- SSO, UC: similar pattern

### 📋 คุณภาพ (Quality)
- QA: `quality-indicators`
- Quality Docs: `quality-docs`
- IM (IT Management): `im/`

### 📄 เอกสาร (Documents)
- Inbound/Outbound: `documents/inbox`, `documents/outbox`
- Director view: `documents/director`

### 🔧 งานซ่อมบำรุง (Maintenance)
- Requests: `maintenance/requests`
- Technician: `technician/work-orders`
- Settings: `maintenance/settings`

### 🚗 ยานพาหนะ (Vehicles)
- Bookings: `vehicles/bookings`
- Calendar: `vehicles/calendar`
- Management: `vehicles/manage`

### 🔬 RDU / Drug Usage
- RDU Cases: `rdu/cases`
- Drug Usage Report: `drug-usage/report`

### 🛡️ Firewall Monitor
- Dashboard: `firewall` (FortiGate integration)
- ใช้ `FortiGateMonitorService`, `FortiGateClient`

### 👥 Administration
- Users: `users/`
- Roles & Permissions: `roles/`, `permissions/`
- Menus: `menus/` (จัดการ dynamic menu)
- Audit Logs: `audit-logs`

### 🏠 Room Booking
- Rooms: `administration/rooms`
- Bookings: `administration/rooms/bookings`

### 📦 Equipment Borrowing
- Borrowings: `equipment-borrowing/borrowings`
- Equipment: `equipment-borrowing/equipment`

---

## Models ที่มีอยู่ (app/Models/)

```
User, Menu, Role, Permission
TvDisplaySetting, TvClinicRoom, TvMediaPlaylist
MaintenanceRequest, WorkOrder
Vehicle, VehicleBooking
MeetingRoom, RoomBooking
Document, DocumentAction
QualityIndicator, QualityIndicatorEntry
PharmacyItem, PharmacyBalance, PharmacyLot
EquipmentBorrowing, Equipment
```

---

## Services ที่มีอยู่ (app/Services/)

```
HosxpQueueService          — คิวผู้ป่วย
Hosxp/HosxpDesktopNotifyService — notify ผ่าน ksklog
FortiGate/FortiGateMonitorService — Firewall monitoring
FortiGate/FortiGateClient   — API client สำหรับ FortiGate
ThreatIntel/ThreatIntelMatcher — IP threat detection
FshhChat/FshhChatSyncService — Chat integration
```

---

## Keys ที่ใช้บ่อย

### Route Names
```
dashboard, home, tv.board, tv.queue-data
admin.tv.settings.edit, admin.tv.playlist.index, admin.tv.rooms.index
pharmacy.index, pharmacy.inventory.index
finance.dashboard, finance.revenue
rdu.index, drug-usage.index
quality.index, quality-indicators.index
maintenance.dashboard, vehicles.index
documents.inbox, rooms.index
```

### Environment Variables ที่สำคัญ
```
DB_CONNECTION, DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD
HOSXP_DB_HOST, HOSXP_DB_DATABASE, HOSXP_DB_USERNAME, HOSXP_DB_PASSWORD
APP_KEY, APP_URL, ASSET_URL
```
