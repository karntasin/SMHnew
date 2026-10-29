<?php

namespace App\Data;

/**
 * คำค้นใกล้เคียง → Laravel route names ในตาราง menus
 *
 * @phpstan-type AliasMap array<string, list<string>>
 */
class SystemsCatalogAliases
{
    /**
     * @return AliasMap
     */
    public static function map(): array
    {
        return [
            'ลา' => ['leave.index', 'leave.create'],
            'การลา' => ['leave.index', 'leave.create'],
            'ลางาน' => ['leave.index', 'leave.create'],
            'ใบลา' => ['leave.create', 'leave.index'],
            'ยื่นลา' => ['leave.create'],
            'leave' => ['leave.index', 'leave.create'],

            'จองห้อง' => ['rooms.index', 'rooms.bookings', 'rooms.my', 'rooms.calendar'],
            'ห้องประชุม' => ['rooms.index', 'rooms.calendar'],
            'ห้อง' => ['rooms.index', 'rooms.bookings'],
            'room' => ['rooms.index'],

            'เอกสาร' => [
                'quality-docs.index',
                'documents.dashboard',
                'documents.inbox',
                'documents.outbox',
                'documents.index',
            ],
            'เอกสารควบคุม' => ['quality-docs.index', 'quality-docs.create'],
            'quality doc' => ['quality-docs.index'],
            'qualitydoc' => ['quality-docs.index'],

            'หนังสือ' => ['documents.dashboard', 'documents.inbox', 'documents.outbox', 'documents.index'],
            'หนังสือราชการ' => ['documents.dashboard', 'documents.inbox', 'documents.index'],
            'สารบรรณ' => ['documents.dashboard', 'documents.inbox'],
            'กล่องรับ' => ['documents.inbox'],
            'กล่องส่ง' => ['documents.outbox'],
            'document' => ['documents.dashboard', 'quality-docs.index'],

            'แจ้งซ่อม' => ['maintenance.dashboard', 'maintenance.requests.index', 'maintenance.requests.my'],
            'ซ่อม' => ['maintenance.dashboard', 'maintenance.requests.index'],
            'ซ่อมบำรุง' => ['maintenance.dashboard', 'maintenance.requests.index'],
            'maintenance' => ['maintenance.dashboard'],

            'ยานพาหนะ' => ['vehicles.index'],
            'รถ' => ['vehicles.index'],
            'จองรถ' => ['vehicles.index'],

            'เบิกยา' => ['pharmacy.inventory.index', 'pharmacy.index'],
            'คลังยา' => ['pharmacy.inventory.index', 'pharmacy.index'],
            'เภสัช' => ['pharmacy.index', 'pharmacy.inventory.index'],
            'pharmacy' => ['pharmacy.index'],

            'ยืมครุภัณฑ์' => ['equipment-borrowing.dashboard'],
            'เบิกครุภัณฑ์' => ['equipment-borrowing.dashboard'],
            'ครุภัณฑ์' => ['equipment-borrowing.dashboard'],

            'คุณภาพ' => ['quality.index'],
            'qa' => ['quality.index'],

            'ธุรการ' => ['admin.hub'],
            'admin' => ['admin.hub'],

            'เมนู' => ['menus.hub'],
            'hub' => ['menus.hub'],
            'ระบบทั้งหมด' => ['menus.hub'],

            'ความรู้' => ['km.dashboard', 'km.learn.hub'],
            'อบรม' => ['km.learn.hub'],
            'hrd' => ['km.learn.hub'],
            'e-learning' => ['km.learn.hub'],

            'ตั้งค่า' => ['settings.hub'],
            'settings' => ['settings.hub'],

            'ผู้ใช้' => ['users.index', 'users.directory'],
            'ไดเรกทอรี' => ['users.directory'],
            'directory' => ['users.directory'],
        ];
    }

    /**
     * คำค้นที่เปิดโหมดหลายผลลัพธ์ + ค้นเรคอร์ดเอกสาร
     *
     * @return list<string>
     */
    public static function documentCategoryQueries(): array
    {
        return [
            'เอกสาร',
            'เอกสารควบคุม',
            'หนังสือ',
            'หนังสือราชการ',
            'สารบรรณ',
            'กล่องรับ',
            'กล่องส่ง',
            'document',
            'quality doc',
            'qualitydoc',
        ];
    }

    /**
     * ตัวอย่างคำค้นสำหรับข้อความช่วยเหลือ
     *
     * @return list<string>
     */
    public static function helpExamples(): array
    {
        return ['การลา', 'เอกสาร', 'จองห้อง', 'หนังสือ', 'แจ้งซ่อม', 'เภสัช', 'ช่วยเหลือ'];
    }
}
