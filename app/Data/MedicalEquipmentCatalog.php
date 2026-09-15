<?php

namespace App\Data;

class MedicalEquipmentCatalog
{
    public const INITIAL_QTY = 5;

    public const STORAGE_LOCATION = 'คลังศูนย์พัฒนาคุณภาพ';

    /**
     * รายการตาม Google Form เบิก/คืน อุปกรณ์เครื่องมือแพทย์
     * รูปแคตตาล็อกเก็บที่ public/images/medical-equipment
     *
     * @return list<array{
     *   key:string,code:string,name:string,unit:string,category:string,
     *   location:string,notes:string,sort:int,images:list<string>
     * }>
     */
    public static function items(): array
    {
        $w = static fn (string $file, int $width = 900) => 'https://commons.wikimedia.org/wiki/Special:FilePath/'.rawurlencode($file).'?width='.$width;

        $items = [
            [
                'key' => 'ems-bag',
                'code' => 'ME-01',
                'name' => 'กระเป๋า EMS',
                'unit' => 'ชุด',
                'category' => 'ชุดปฐมพยาบาล',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 1',
                'sort' => 1,
                'images' => [
                    $w('British_Red_Cross_First_Aid_Kits.jpg'),
                    $w('First_Aid_Kit_01.jpg'),
                ],
            ],
            [
                'key' => 'first-aid-bag',
                'code' => 'ME-02',
                'name' => 'กระเป๋าปฐมพยาบาลเบื้องต้น First aid bag',
                'unit' => 'ชุด',
                'category' => 'ชุดปฐมพยาบาล',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 2',
                'sort' => 2,
                'images' => [
                    $w('First_aid_kit.jpg'),
                    $w('Open_first_aid_kit.jpg'),
                ],
            ],
            [
                'key' => 'doctor-exam-bag',
                'code' => 'ME-03',
                'name' => 'กระเป๋าชุดตรวจแพทย์',
                'unit' => 'ชุด',
                'category' => 'ชุดปฐมพยาบาล',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 3',
                'sort' => 3,
                'images' => [
                    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Finnish_military_physicians_bag_1940s.JPG/800px-Finnish_military_physicians_bag_1940s.JPG',
                    $w('Finnish_military_physicians_bag_1940s.JPG'),
                    $w('Fred-stone-medical-bag-moa-tn1.jpg'),
                ],
            ],
            [
                'key' => 'heat-stroke-kit',
                'code' => 'ME-04',
                'name' => 'ชุดปฐมพยาบาล Heat stroke',
                'unit' => 'ชุด',
                'category' => 'ชุดปฐมพยาบาล',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 4',
                'sort' => 4,
                'images' => [
                    $w('Instant_cold_pack.jpg'),
                    $w('Ice_pack.jpg'),
                    $w('Cold_pack.jpg'),
                ],
            ],
            [
                'key' => 'common-medicine-kit',
                'code' => 'ME-05',
                'name' => 'ชุดยาสามัญ',
                'unit' => 'ชุด',
                'category' => 'ชุดปฐมพยาบาล',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 5',
                'sort' => 5,
                'images' => [
                    $w('Pill_organiser.jpg'),
                    $w('Medicine.jpg'),
                    $w('Pharmaceutical_drugs.jpg'),
                ],
            ],
            [
                'key' => 'dtx-kit',
                'code' => 'ME-06',
                'name' => 'ชุดตรวจ DTX',
                'unit' => 'ชุด',
                'category' => 'อุปกรณ์ตรวจวินิจฉัย',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ชุดตรวจน้ำตาลในเลือด ตามแบบฟอร์มรายการที่ 6',
                'sort' => 6,
                'images' => [
                    $w('Glucose_meters.jpg'),
                    $w('Blood_glucose_testing.jpg'),
                    $w('Glucometer.jpg'),
                ],
            ],
            [
                'key' => 'bp-manual',
                'code' => 'ME-07',
                'name' => 'เครื่องวัดความดันโลหิต แบบวัดด้วยมือ',
                'unit' => 'ชิ้น',
                'category' => 'อุปกรณ์ตรวจวินิจฉัย',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 7',
                'sort' => 7,
                'images' => [
                    $w('Aneroid_sphygmomanometer.jpg'),
                    $w('Sphygmomanometer.jpg'),
                    $w('Blood_pressure_cuff.jpg'),
                ],
            ],
            [
                'key' => 'bp-auto',
                'code' => 'ME-08',
                'name' => 'เครื่องวัดความดันโลหิต แบบอัตโนมัติ',
                'unit' => 'ชิ้น',
                'category' => 'อุปกรณ์ตรวจวินิจฉัย',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 8',
                'sort' => 8,
                'images' => [
                    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Digital_Blood_Pressure_Monitor.jpg/800px-Digital_Blood_Pressure_Monitor.jpg',
                    $w('Digital_Blood_Pressure_Monitor.jpg'),
                    $w('Blood_pressure_and_pulse_digital_meter.jpg'),
                    $w('Digital_blood_pressure_monitor_strap_on_woman_s_arm.jpg'),
                ],
            ],
            [
                'key' => 'bp-wrist',
                'code' => 'ME-09',
                'name' => 'เครื่องวัดความดันโลหิต แบบสอดแขน',
                'unit' => 'ชิ้น',
                'category' => 'อุปกรณ์ตรวจวินิจฉัย',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 9',
                'sort' => 9,
                'images' => [
                    $w('Wrist_blood_pressure_monitor.jpg'),
                    $w('Wrist-oximeter.jpg'),
                    $w('Blood_pressure_monitor.jpg'),
                ],
            ],
            [
                'key' => 'bp-monitor',
                'code' => 'ME-10',
                'name' => 'BP Monitor',
                'unit' => 'ชิ้น',
                'category' => 'อุปกรณ์ตรวจวินิจฉัย',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 10',
                'sort' => 10,
                'images' => [
                    $w('Blood_Pressure_Monitor.jpg'),
                    $w('Blood_pressure_and_pulse_digital_meter.jpg'),
                    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Digital_Blood_Pressure_Monitor.jpg/800px-Digital_Blood_Pressure_Monitor.jpg',
                ],
            ],
            [
                'key' => 'pulse-oximeter',
                'code' => 'ME-11',
                'name' => 'เครื่องวัดออกซิเจนปลายนิ้ว',
                'unit' => 'ชิ้น',
                'category' => 'อุปกรณ์ตรวจวินิจฉัย',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 11',
                'sort' => 11,
                'images' => [
                    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Wrist-oximeter.jpg/800px-Wrist-oximeter.jpg',
                    $w('Yokota_pulse_oximeter.jpg'),
                    $w('OxyWatch_C20_Pulse_Oximeter.png'),
                    $w('Measurement_of_oxygen_saturation_with_finger_pulse_oximeter.jpg'),
                    $w('Pulox_Pulse_Oximeter.JPG'),
                ],
            ],
            [
                'key' => 'thermo-axilla',
                'code' => 'ME-12',
                'name' => 'ปรอทวัดไข้ทางรักแร้',
                'unit' => 'ชิ้น',
                'category' => 'อุปกรณ์ตรวจวินิจฉัย',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 12',
                'sort' => 12,
                'images' => [
                    $w('Clinical_thermometer_38.7.JPG'),
                    $w('Fieberthermometer_clinical_thermometer_01.jpg'),
                    $w('Medical_mercury_thermometer_with_velvet-lined_cardboard_box_-_focus_stack_(2020-05-25).jpg'),
                    $w('2023_Elektroniczny_termometr_lekarski.jpg'),
                ],
            ],
            [
                'key' => 'thermo-rectal',
                'code' => 'ME-13',
                'name' => 'ปรอทวัดไข้ทางทวาร',
                'unit' => 'ชิ้น',
                'category' => 'อุปกรณ์ตรวจวินิจฉัย',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 13',
                'sort' => 13,
                'images' => [
                    $w('Rectal_thermometer.jpg'),
                    $w('Clinical_thermometer.jpg'),
                    $w('Digital_thermometer.jpg'),
                ],
            ],
            [
                'key' => 'thermo-digital',
                'code' => 'ME-14',
                'name' => 'ปรอทวัดไข้ แบบอัตโนมัติ',
                'unit' => 'ชิ้น',
                'category' => 'อุปกรณ์ตรวจวินิจฉัย',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 14',
                'sort' => 14,
                'images' => [
                    $w('Digital_thermometer.jpg'),
                    $w('Electronic_thermometer.jpg'),
                    $w('Digital_medical_thermometer.jpg'),
                ],
            ],
            [
                'key' => 'thermo-infrared',
                'code' => 'ME-15',
                'name' => 'ปรอทวัดไข้ แบบยิงศีรษะ',
                'unit' => 'ชิ้น',
                'category' => 'อุปกรณ์ตรวจวินิจฉัย',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 15',
                'sort' => 15,
                'images' => [
                    $w('Infrared_thermometer_(Innovo).jpg'),
                    $w('Digital_IR-Thermometer.jpg'),
                    $w('Taking_temperature_by_infrared_thermometer_in_entrance_of_Matsuzakaya_Nagoya.jpg'),
                    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/1024_Pyrometer-8445.jpg/800px-1024_Pyrometer-8445.jpg',
                ],
            ],
            [
                'key' => 'stethoscope',
                'code' => 'ME-16',
                'name' => 'หูฟัง stethoscope',
                'unit' => 'ชิ้น',
                'category' => 'เครื่องมือแพทย์',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 16',
                'sort' => 16,
                'images' => [
                    $w('Stethoscope-2.png'),
                    $w('Stethoscope.jpg'),
                    $w('Littmann_stethoscope.jpg'),
                ],
            ],
            [
                'key' => 'aed',
                'code' => 'ME-17',
                'name' => 'เครื่อง AED',
                'unit' => 'ชิ้น',
                'category' => 'อุปกรณ์ช่วยชีวิต',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 17',
                'sort' => 17,
                'images' => [
                    $w('AED_machine_medisource.jpg'),
                    $w('Automated_External_Defibrillator.jpg'),
                    $w('AED.jpg'),
                ],
            ],
            [
                'key' => 'weighing-scale',
                'code' => 'ME-18',
                'name' => 'เครื่องชั่งน้ำหนัก',
                'unit' => 'ชิ้น',
                'category' => 'อุปกรณ์ตรวจวินิจฉัย',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 18',
                'sort' => 18,
                'images' => [
                    $w('Physician_scale.jpg'),
                    $w('Medical_scale.jpg'),
                    $w('Digital_bathroom_scale.jpg'),
                    $w('Weighing_scale.jpg'),
                ],
            ],
            [
                'key' => 'splint',
                'code' => 'ME-19',
                'name' => 'อุปกรณ์ดาม',
                'unit' => 'ชิ้น',
                'category' => 'เครื่องมือแพทย์',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 19',
                'sort' => 19,
                'images' => [
                    $w('SAM_Splint.jpg'),
                    $w('Ankle_foot_orthosis_splint.JPG'),
                    $w('Arm_splint.jpg'),
                    $w('Splint.jpg'),
                ],
            ],
            [
                'key' => 'cpr-manikin',
                'code' => 'ME-20',
                'name' => 'หุ่น CPR',
                'unit' => 'ชิ้น',
                'category' => 'อุปกรณ์ช่วยชีวิต',
                'location' => 'ห้องฝึก',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 20',
                'sort' => 20,
                'images' => [
                    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Resusci_Anne_-_CPR_dummy.jpg/800px-Resusci_Anne_-_CPR_dummy.jpg',
                    $w('Resusci_Anne_-_CPR_dummy.jpg'),
                    $w('CPR_training.jpg'),
                ],
            ],
            [
                'key' => 'aed-trainer',
                'code' => 'ME-21',
                'name' => 'เครื่อง AED ช่วยฝึกซ้อม',
                'unit' => 'ชิ้น',
                'category' => 'อุปกรณ์ช่วยชีวิต',
                'location' => 'ห้องฝึก',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 21',
                'sort' => 21,
                'images' => [
                    $w('Medtronic_aed_training_kit.jpg'),
                    $w('AED_trainer.jpg'),
                    $w('Training_AED.jpg'),
                ],
            ],
            [
                'key' => 'hospital-armband',
                'code' => 'ME-22',
                'name' => 'ปลอกแขนมีตราสัญลักษณ์ รพ.ค่ายฯ',
                'unit' => 'ชิ้น',
                'category' => 'อุปกรณ์ทั่วไป',
                'location' => 'คลังเวชภัณฑ์',
                'notes' => 'ตามแบบฟอร์มเบิก-คืน รายการที่ 22',
                'sort' => 22,
                'images' => [
                    $w('Wrist_Identification_Band.jpg'),
                    $w('Post_vitrectomy_warning_wristband.jpg'),
                    $w('Wikipedia_Name_Silicon_Wristband.jpg'),
                ],
            ],
        ];

        return array_map(static function (array $item): array {
            $item['location'] = self::STORAGE_LOCATION;
            $item['images'] = ['images/medical-equipment/'.$item['key'].'.jpg'];

            return $item;
        }, $items);
    }

    /**
     * @return list<array{name:string,icon:string,color:string,sort:int}>
     */
    public static function categories(): array
    {
        return [
            ['name' => 'ชุดปฐมพยาบาล', 'icon' => 'BriefcaseMedical', 'color' => '#0f766e', 'sort' => 1],
            ['name' => 'อุปกรณ์ตรวจวินิจฉัย', 'icon' => 'Activity', 'color' => '#2563eb', 'sort' => 2],
            ['name' => 'เครื่องมือแพทย์', 'icon' => 'Stethoscope', 'color' => '#7c3aed', 'sort' => 3],
            ['name' => 'อุปกรณ์ช่วยชีวิต', 'icon' => 'HeartPulse', 'color' => '#dc2626', 'sort' => 4],
            ['name' => 'อุปกรณ์ทั่วไป', 'icon' => 'Package', 'color' => '#64748b', 'sort' => 5],
        ];
    }
}
