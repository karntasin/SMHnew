<?php

namespace Database\Seeders;

use App\Models\HrdAnswer;
use App\Models\HrdCourse;
use App\Models\HrdCourseCategory;
use App\Models\HrdLesson;
use App\Models\HrdModule;
use App\Models\HrdQuestion;
use App\Models\HrdQuiz;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CyberSecurityPdpaCoursesSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('email', 'admin@admin.com')->first()
            ?? User::role('admin')->first()
            ?? User::first();

        if (! $admin) {
            $this->command?->error('ไม่พบผู้ใช้ในระบบ กรุณารัน DatabaseSeeder ก่อน');

            return;
        }

        $category = HrdCourseCategory::firstOrCreate(
            ['slug' => 'cyber-security-pdpa'],
            ['name' => 'ความมั่นคงปลอดภัยและ PDPA']
        );

        foreach ($this->courses() as $courseData) {
            DB::transaction(function () use ($courseData, $admin, $category) {
                if (HrdCourse::where('code', $courseData['code'])->exists()) {
                    $this->command?->warn("ข้าม {$courseData['code']} — มีอยู่แล้ว");

                    return;
                }

                $course = HrdCourse::create([
                    'code' => $courseData['code'],
                    'title' => $courseData['title'],
                    'description' => $courseData['description'],
                    'type' => 'online',
                    'hours' => $courseData['hours'],
                    'instructor' => 'ฝ่ายเทคโนโลยีสารสนเทศและงานกฎหมาย',
                    'created_by' => $admin->id,
                    'category_id' => $category->id,
                    'is_active' => true,
                    'is_mandatory' => true,
                    'status' => 'published',
                ]);

                $module = HrdModule::create([
                    'course_id' => $course->id,
                    'title' => $courseData['module_title'],
                    'description' => $courseData['module_description'] ?? null,
                    'order' => 0,
                ]);

                foreach ($courseData['lessons'] as $lessonIndex => $lessonData) {
                    $lesson = HrdLesson::create([
                        'module_id' => $module->id,
                        'title' => $lessonData['title'],
                        'type' => $lessonData['type'],
                        'content' => $lessonData['content'] ?? null,
                        'duration_minutes' => $lessonData['duration_minutes'] ?? 15,
                        'order' => $lessonIndex,
                    ]);

                    if ($lessonData['type'] === 'quiz' && isset($lessonData['quiz'])) {
                        $this->createQuiz($course, $lesson, $lessonData['quiz']);
                    }
                }

                $this->command?->info("สร้างหลักสูตร: {$course->title}");
            });
        }
    }

    private function createQuiz(HrdCourse $course, HrdLesson $lesson, array $quizData): void
    {
        $quiz = HrdQuiz::create([
            'course_id' => $course->id,
            'lesson_id' => $lesson->id,
            'title' => $quizData['title'],
            'description' => $quizData['description'] ?? '',
            'passing_score' => $quizData['passing_score'] ?? 80,
            'randomize_questions' => $quizData['randomize_questions'] ?? true,
        ]);

        foreach ($quizData['questions'] as $questionIndex => $questionData) {
            $question = HrdQuestion::create([
                'quiz_id' => $quiz->id,
                'question_text' => $questionData['question_text'],
                'type' => $questionData['type'],
                'points' => $questionData['points'] ?? 1,
                'order' => $questionIndex,
            ]);

            $answers = $questionData['answers'];
            if (in_array($questionData['type'], ['multiple_choice', 'true_false'], true)) {
                shuffle($answers);
            }

            foreach ($answers as $answerIndex => $answerData) {
                $answer = new HrdAnswer([
                    'question_id' => $question->id,
                    'answer_text' => $answerData['answer_text'],
                    'is_correct' => $answerData['is_correct'],
                    'order' => $answerIndex,
                ]);
                $answer->matching_pair = $answerData['matching_pair'] ?? null;
                $answer->save();
            }
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function courses(): array
    {
        return [
            $this->courseCyberBasics(),
            $this->coursePhishingMalware(),
            $this->coursePasswordAuth(),
            $this->coursePdpaBasics(),
            $this->coursePdpaPractice(),
        ];
    }

    private function courseCyberBasics(): array
    {
        return [
            'code' => 'CYB-001',
            'title' => 'พื้นฐานความมั่นคงปลอดภัยทางไซเบอร์สำหรับบุคลากร',
            'description' => 'เรียนรู้แนวคิด CIA Triad ภัยคุกคามทางไซเบอร์ และหลักปฏิบัติความปลอดภัยข้อมูลเบื้องต้นสำหรับบุคลากรในองค์กรสาธารณสุข',
            'hours' => 1.5,
            'module_title' => 'บทที่ 1: ความมั่นคงปลอดภัยทางไซเบอร์เบื้องต้น',
            'module_description' => 'ทำความเข้าใจภัยคุกคามและหลักการปกป้องข้อมูล',
            'lessons' => [
                [
                    'title' => 'ทำไมไซเบอร์ซีเคียร์จึงสำคัญกับหน่วยงานสาธารณสุข',
                    'type' => 'text',
                    'duration_minutes' => 20,
                    'content' => <<<'HTML'
<h2>ทำไมไซเบอร์ซีเคียร์จึงสำคัญ</h2>
<p>โรงพยาบาลและหน่วยงานสาธารณสุขเก็บรักษาข้อมูลที่ละเอียดอ่อน เช่น ประวัติการรักษา ข้อมูลส่วนบุคคล และข้อมูลทางการเงิน การถูกโจมตีทางไซเบอร์อาจส่งผลต่อการให้บริการผู้ป่วย ความน่าเชื่อถือขององค์กร และค่าปรับทางกฎหมาย</p>
<ul>
<li><strong>ข้อมูลผู้ป่วยมีมูลค่าสูง</strong> — มักถูกขายในตลาดมืด</li>
<li><strong>ระบบเชื่อมต่อหลายระบบ</strong> — HOSxP, อีเมล, อุปกรณ์ IoT ทำให้จุดเสี่ยงเพิ่มขึ้น</li>
<li><strong>บุคลากรเป็นจุดอ่อนหลัก</strong> — Phishing และการใช้รหัสผ่านซ้ำเป็นสาเหตุอันดับต้นๆ</li>
</ul>
<p><strong>เป้าหมายการเรียนรู้:</strong> ตระหนักถึงความสำคัญของความปลอดภัยทางไซเบอร์และบทบาทของทุกคนในการปกป้องข้อมูล</p>
HTML,
                ],
                [
                    'title' => 'CIA Triad และหลักปฏิบัติความปลอดภัยข้อมูล',
                    'type' => 'text',
                    'duration_minutes' => 25,
                    'content' => <<<'HTML'
<h2>CIA Triad</h2>
<ul>
<li><strong>Confidentiality (ความลับ)</strong> — ข้อมูลเข้าถึงได้เฉพาะผู้มีสิทธิ์ เช่น ล็อกหน้าจอเมื่อออกจากโต๊ะทำงาน</li>
<li><strong>Integrity (ความถูกต้องสมบูรณ์)</strong> — ข้อมูลไม่ถูกแก้ไขโดยไม่ได้รับอนุญาต เช่น ตรวจสอบ log การเข้าถึงข้อมูลผู้ป่วย</li>
<li><strong>Availability (ความพร้อมใช้งาน)</strong> — ระบบพร้อมให้บริการเมื่อต้องการ เช่น สำรองข้อมูลและป้องกัน Ransomware</li>
</ul>
<h3>หลักปฏิบัติ 5 ข้อสำหรับบุคลากร</h3>
<ol>
<li>ใช้รหัสผ่านที่แข็งแรงและไม่ซ้ำกันในแต่ละระบบ</li>
<li>ระวังอีเมลและลิงก์ที่น่าสงสัย</li>
<li>อัปเดตซอฟต์แวร์และแอนตี้ไวรัสสม่ำเสมอ</li>
<li>ไม่ติดตั้งโปรแกรมที่ไม่ได้รับอนุญาต</li>
<li>รายงานเหตุการณ์ผิดปกติทันทีที่พบ</li>
</ol>
HTML,
                ],
                [
                    'title' => 'แบบทดสอบท้ายบท — พื้นฐานไซเบอร์ซีเคียร์',
                    'type' => 'quiz',
                    'duration_minutes' => 15,
                    'quiz' => [
                        'title' => 'แบบทดสอบท้ายบท — พื้นฐานไซเบอร์ซีเคียร์',
                        'description' => 'ทดสอบความเข้าใจเรื่อง CIA Triad และหลักปฏิบัติความปลอดภัย ต้องได้คะแนนอย่างน้อย 80%',
                        'passing_score' => 80,
                        'questions' => [
                            [
                                'question_text' => 'ตัวอักษร "C" ใน CIA Triad หมายถึงอะไร?',
                                'type' => 'multiple_choice',
                                'answers' => [
                                    ['answer_text' => 'Confidentiality (ความลับ)', 'is_correct' => true],
                                    ['answer_text' => 'Compliance (การปฏิบัติตามกฎ)', 'is_correct' => false],
                                    ['answer_text' => 'Connectivity (การเชื่อมต่อ)', 'is_correct' => false],
                                    ['answer_text' => 'Capacity (ความจุ)', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'ข้อมูลผู้ป่วยในโรงพยาบาลถือเป็นข้อมูลที่มีความละเอียดอ่อนสูง',
                                'type' => 'true_false',
                                'answers' => [
                                    ['answer_text' => 'ถูก', 'is_correct' => true],
                                    ['answer_text' => 'ผิด', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'เมื่อออกจากโต๊ะทำงานชั่วคราว ควรทำอย่างไร?',
                                'type' => 'multiple_choice',
                                'answers' => [
                                    ['answer_text' => 'ล็อกหน้าจอคอมพิวเตอร์ทุกครั้ง', 'is_correct' => true],
                                    ['answer_text' => 'ปล่อยหน้าจอเปิดไว้เพื่อความสะดวก', 'is_correct' => false],
                                    ['answer_text' => 'แชร์รหัสผ่านให้เพื่อนร่วมงาน', 'is_correct' => false],
                                    ['answer_text' => 'ถ่ายโอนไฟล์ไป USB ส่วนตัว', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'Availability ใน CIA Triad หมายถึงการที่ข้อมูลและระบบพร้อมใช้งานเมื่อต้องการ',
                                'type' => 'true_false',
                                'answers' => [
                                    ['answer_text' => 'ถูก', 'is_correct' => true],
                                    ['answer_text' => 'ผิด', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'เมื่อพบเหตุการณ์ผิดปกติด้านความปลอดภัย ควรทำอย่างไรเป็นอันดับแรก?',
                                'type' => 'multiple_choice',
                                'answers' => [
                                    ['answer_text' => 'รายงานฝ่าย IT/เจ้าหน้าที่ความปลอดภัยทันที', 'is_correct' => true],
                                    ['answer_text' => 'รอดูว่าจะเกิดอะไรขึ้นต่อ', 'is_correct' => false],
                                    ['answer_text' => 'โพสต์ในโซเชียลมีเดีย', 'is_correct' => false],
                                    ['answer_text' => 'ลบหลักฐานเพื่อไม่ให้ใครรู้', 'is_correct' => false],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    private function coursePhishingMalware(): array
    {
        return [
            'code' => 'CYB-002',
            'title' => 'การป้องกันภัยคุกคาม Phishing และ Malware',
            'description' => 'เรียนรู้การระบุอีเมลหลอกลวง ลิงก์อันตราย และมัลแวร์ พร้อมแนวทางปฏิบัติเมื่อพบภัยคุกคาม',
            'hours' => 1.5,
            'module_title' => 'บทที่ 2: Phishing และ Malware',
            'lessons' => [
                [
                    'title' => 'รู้จัก Phishing และ Social Engineering',
                    'type' => 'text',
                    'duration_minutes' => 20,
                    'content' => <<<'HTML'
<h2>Phishing คืออะไร?</h2>
<p>Phishing คือการหลอกลวงให้ผู้ใช้เปิดเผยข้อมูลสำคัญ เช่น รหัสผ่าน หรือคลิกลิงก์ที่ติดมัลแวร์ โดยมักแอบอ้างเป็นหน่วยงานที่น่าเชื่อถือ</p>
<h3>สัญญาณเตือนของอีเมล Phishing</h3>
<ul>
<li>ผู้ส่งใช้อีเมลที่คล้ายแต่ไม่ตรงกับโดเมนจริง (เช่น hosxp-support.com แทน hos.go.th)</li>
<li>เร่งรัดให้ดำเนินการทันที หรือขู่ว่าบัญชีจะถูกระงับ</li>
<li>มีลิงก์หรือไฟล์แนบที่ไม่คาดคิด</li>
<li>มีข้อผิดพลาดทางภาษา หรือรูปแบบที่ผิดปกติ</li>
</ul>
<h3>Social Engineering</h3>
<p>การโจมตีที่ใช้จิตวิทยาหลอกลวง เช่น โทรมาอ้างว่าเป็นฝ่าย IT ขอรหัสผ่าน หรือแอบอ้างเป็นผู้บริหารขอให้โอนเงินด่วน</p>
HTML,
                ],
                [
                    'title' => 'Malware, Ransomware และการป้องกัน',
                    'type' => 'text',
                    'duration_minutes' => 25,
                    'content' => <<<'HTML'
<h2>ประเภทของ Malware</h2>
<ul>
<li><strong>Virus/Worm</strong> — แพร่กระจายและทำลายไฟล์หรือระบบ</li>
<li><strong>Ransomware</strong> — เข้ารหัสข้อมูลแล้วเรียกค่าไถ่ เป็นภัยร้ายแรงต่อโรงพยาบาล</li>
<li><strong>Spyware/Keylogger</strong> — ดักจับข้อมูลที่พิมพ์หรือหน้าจอ</li>
</ul>
<h3>แนวทางป้องกัน</h3>
<ol>
<li>ไม่เปิดไฟล์แนบจากผู้ส่งที่ไม่รู้จัก</li>
<li>ตรวจสอบ URL ก่อนคลิก — วางเมาส์เหนือลิงก์เพื่อดูปลายทางจริง</li>
<li>ใช้แอนตี้ไวรัสที่อัปเดตและสแกนไฟล์แนบ</li>
<li>สำรองข้อมูลสำคัญเป็นประจำ (3-2-1 rule)</li>
<li>แยกเครือข่ายระบบสำคัญออกจากอินเทอร์เน็ตสาธารณะ</li>
</ol>
<h3>เมื่อสงสัยว่าติดมัลแวร์</h3>
<p>ตัดการเชื่อมต่อเครือข่าย → แจ้งฝ่าย IT ทันที → อย่าปิดเครื่องก่อนได้รับคำแนะนำ → เปลี่ยนรหัสผ่านจากเครื่องอื่น</p>
HTML,
                ],
                [
                    'title' => 'แบบทดสอบท้ายบท — Phishing และ Malware',
                    'type' => 'quiz',
                    'quiz' => [
                        'title' => 'แบบทดสอบท้ายบท — Phishing และ Malware',
                        'passing_score' => 80,
                        'questions' => [
                            [
                                'question_text' => 'อีเมลที่เร่งรัดให้เปลี่ยนรหัสผ่านภายใน 1 ชั่วโมง โดยคลิกลิงก์ในข้อความ น่าจะเป็น Phishing',
                                'type' => 'true_false',
                                'answers' => [
                                    ['answer_text' => 'ถูก', 'is_correct' => true],
                                    ['answer_text' => 'ผิด', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'Ransomware ทำงานอย่างไร?',
                                'type' => 'multiple_choice',
                                'answers' => [
                                    ['answer_text' => 'เข้ารหัสไฟล์แล้วเรียกค่าไถ่', 'is_correct' => true],
                                    ['answer_text' => 'เพิ่มความเร็วคอมพิวเตอร์', 'is_correct' => false],
                                    ['answer_text' => 'ลบไวรัสในเครื่องอัตโนมัติ', 'is_correct' => false],
                                    ['answer_text' => 'สำรองข้อมูลให้ฟรี', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'มีคนโทรอ้างว่าเป็นฝ่าย IT ขอรหัสผ่านเพื่อแก้ไขระบบ ควรให้รหัสผ่านหรือไม่?',
                                'type' => 'multiple_choice',
                                'answers' => [
                                    ['answer_text' => 'ไม่ควร — ฝ่าย IT จริงไม่ขอรหัสผ่านทางโทรศัพท์', 'is_correct' => true],
                                    ['answer_text' => 'ควรให้เพื่อความรวดเร็ว', 'is_correct' => false],
                                    ['answer_text' => 'ให้เฉพาะรหัสผ่านชั่วคราว', 'is_correct' => false],
                                    ['answer_text' => 'ให้รหัสผ่านเก่าที่ไม่ได้ใช้แล้ว', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'ก่อนคลิกลิงก์ในอีเมล ควรตรวจสอบ URL ปลายทางจริงก่อน',
                                'type' => 'true_false',
                                'answers' => [
                                    ['answer_text' => 'ถูก', 'is_correct' => true],
                                    ['answer_text' => 'ผิด', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'เมื่อสงสัยว่าเครื่องติดมัลแวร์ ควรทำอย่างไรก่อน?',
                                'type' => 'multiple_choice',
                                'answers' => [
                                    ['answer_text' => 'แจ้งฝ่าย IT และตัดการเชื่อมต่อเครือข่าย', 'is_correct' => true],
                                    ['answer_text' => 'ลบไฟล์ทั้งหมดด้วยตนเอง', 'is_correct' => false],
                                    ['answer_text' => 'ส่งต่ออีเมลให้เพื่อนเปิดดู', 'is_correct' => false],
                                    ['answer_text' => 'รีสตาร์ทเครื่องซ้ำๆ จนกว่าจะหาย', 'is_correct' => false],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    private function coursePasswordAuth(): array
    {
        return [
            'code' => 'CYB-003',
            'title' => 'การจัดการรหัสผ่านและการยืนยันตัวตน (MFA)',
            'description' => 'เรียนรู้การสร้างรหัสผ่านที่ปลอดภัย การใช้ MFA และแนวปฏิบัติที่ดีในการจัดการบัญชีผู้ใช้',
            'hours' => 1,
            'module_title' => 'บทที่ 3: รหัสผ่านและการยืนยันตัวตน',
            'lessons' => [
                [
                    'title' => 'รหัสผ่านที่แข็งแรงและ Password Manager',
                    'type' => 'text',
                    'duration_minutes' => 20,
                    'content' => <<<'HTML'
<h2>รหัสผ่านที่แข็งแรง</h2>
<ul>
<li>ความยาวอย่างน้อย 12 ตัวอักษร</li>
<li>ผสมตัวพิมพ์ใหญ่-เล็ก ตัวเลข และสัญลักษณ์</li>
<li>ไม่ใช้ข้อมูลส่วนตัว เช่น วันเกิด ชื่อ หรือเลขบัตรประชาชน</li>
<li><strong>ไม่ใช้รหัสผ่านเดียวกันในหลายระบบ</strong></li>
</ul>
<h3>Passphrase</h3>
<p>ใช้วลีที่จำง่ายแต่ยาว เช่น "กาแฟ!2แก้ว@ตอนเช้า" ปลอดภัยกว่ารหัสสั้นๆ ที่ซับซ้อน</p>
<h3>Password Manager</h3>
<p>โปรแกรมจัดการรหัสผ่านช่วยสร้างและเก็บรหัสผ่านที่ไม่ซ้ำกัน ลดภาระการจำและเพิ่มความปลอดภัย</p>
HTML,
                ],
                [
                    'title' => 'Multi-Factor Authentication (MFA)',
                    'type' => 'text',
                    'duration_minutes' => 15,
                    'content' => <<<'HTML'
<h2>MFA คืออะไร?</h2>
<p>การยืนยันตัวตนหลายปัจจัย ใช้มากกว่า 1 วิธี เช่น รหัสผ่าน + OTP จากแอป หรือรหัสผ่าน + ลายนิ้วมือ</p>
<h3>ปัจจัย 3 ประเภท</h3>
<ol>
<li><strong>สิ่งที่รู้</strong> — รหัสผ่าน, PIN</li>
<li><strong>สิ่งที่มี</strong> — โทรศัพท์, Token, บัตร Smart Card</li>
<li><strong>สิ่งที่เป็น</strong> — ลายนิ้วมือ, ใบหน้า</li>
</ol>
<p>เปิดใช้ MFA กับบัญชีสำคัญทั้งหมด โดยเฉพาะอีเมลองค์กร ระบบ HOSxP และ VPN</p>
<h3>ข้อห้าม</h3>
<ul>
<li>ห้ามแชร์รหัสผ่านหรือ OTP กับใครก็ตาม</li>
<li>ห้ามบันทึกรหัสผ่านบน Post-it หรือส่งทางแชท</li>
</ul>
HTML,
                ],
                [
                    'title' => 'แบบทดสอบท้ายบท — รหัสผ่านและ MFA',
                    'type' => 'quiz',
                    'quiz' => [
                        'title' => 'แบบทดสอบท้ายบท — รหัสผ่านและ MFA',
                        'passing_score' => 80,
                        'questions' => [
                            [
                                'question_text' => 'การใช้รหัสผ่านเดียวกันในหลายระบบเป็นความเสี่ยงด้านความปลอดภัย',
                                'type' => 'true_false',
                                'answers' => [
                                    ['answer_text' => 'ถูก', 'is_correct' => true],
                                    ['answer_text' => 'ผิด', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'รหัสผ่านที่ดีที่สุดคือข้อใด?',
                                'type' => 'multiple_choice',
                                'answers' => [
                                    ['answer_text' => 'ยาว ไม่ซ้ำกับระบบอื่น และไม่ใช้ข้อมูลส่วนตัว', 'is_correct' => true],
                                    ['answer_text' => 'ชื่อตัวเอง + ปีเกิด', 'is_correct' => false],
                                    ['answer_text' => '12345678', 'is_correct' => false],
                                    ['answer_text' => 'รหัสเดียวกับอีเมลส่วนตัว', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'MFA หมายถึงการยืนยันตัวตนด้วยปัจจัยเดียว',
                                'type' => 'true_false',
                                'answers' => [
                                    ['answer_text' => 'ถูก', 'is_correct' => false],
                                    ['answer_text' => 'ผิด', 'is_correct' => true],
                                ],
                            ],
                            [
                                'question_text' => 'OTP ที่ได้รับทาง SMS ควรแชร์ให้เพื่อนร่วมงานช่วยล็อกอินได้หรือไม่?',
                                'type' => 'multiple_choice',
                                'answers' => [
                                    ['answer_text' => 'ไม่ควร — OTP เป็นของตนเองเท่านั้น', 'is_correct' => true],
                                    ['answer_text' => 'ควร ถ้าเป็นคนที่ไว้ใจได้', 'is_correct' => false],
                                    ['answer_text' => 'ควร ถ้าเป็นหัวหน้าแผนก', 'is_correct' => false],
                                    ['answer_text' => 'ควร ถ้าเร่งด่วน', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'Password Manager ช่วยอะไร?',
                                'type' => 'multiple_choice',
                                'answers' => [
                                    ['answer_text' => 'สร้างและเก็บรหัสผ่านที่ไม่ซ้ำกันอย่างปลอดภัย', 'is_correct' => true],
                                    ['answer_text' => 'แชร์รหัสผ่านให้ทุกคนในแผนก', 'is_correct' => false],
                                    ['answer_text' => 'ปิดการใช้ MFA', 'is_correct' => false],
                                    ['answer_text' => 'ลบรหัสผ่านอัตโนมัติทุกวัน', 'is_correct' => false],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    private function coursePdpaBasics(): array
    {
        return [
            'code' => 'PDPA-001',
            'title' => 'กฎหมาย PDPA เบื้องต้นสำหรับหน่วยงานสาธารณสุข',
            'description' => 'ทำความเข้าใจพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 สิทธิของเจ้าของข้อมูล และบทบาทของหน่วยงานในฐานะผู้ควบคุมข้อมูล',
            'hours' => 2,
            'module_title' => 'บทที่ 4: พื้นฐานกฎหมาย PDPA',
            'lessons' => [
                [
                    'title' => 'ความหมายและหลักการสำคัญของ PDPA',
                    'type' => 'text',
                    'duration_minutes' => 25,
                    'content' => <<<'HTML'
<h2>PDPA คืออะไร?</h2>
<p>พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 กำหนดกรอบการเก็บ ใช้ และเปิดเผยข้อมูลส่วนบุคคลของบุคคลธรรมดาในประเทศไทย</p>
<h3>คำสำคัญ</h3>
<ul>
<li><strong>ข้อมูลส่วนบุคคล</strong> — ข้อมูลที่ระบุตัวบุคคลได้ เช่น ชื่อ เลขบัตรประชาชน ประวัติการรักษา</li>
<li><strong>ข้อมูลส่วนบุคคลอ่อนไหว</strong> — ข้อมูลสุขภาพ ชีวภาพ พฤติกรรม ซึ่งต้องคุ้มครองเป็นพิเศษ</li>
<li><strong>ผู้ควบคุมข้อมูลส่วนบุคคล</strong> — หน่วยงานที่กำหนดวัตถุประสงค์การเก็บข้อมูล (เช่น โรงพยาบาล)</li>
<li><strong>ผู้ประมวลผลข้อมูลส่วนบุคคล</strong> — ผู้ที่ประมวลผลตามคำสั่งผู้ควบคุม (เช่น ผู้ให้บริการ Cloud)</li>
</ul>
<h3>หลักการ 7 ประการ</h3>
<p>เก็บอย่างจำกัด ใช้อย่างตรงวัตถุประสงค์ มีมาตรการรักษาความมั่นคงปลอดภัย เปิดเผยข้อมูลแก่เจ้าของข้อมูล และเคารพสิทธิของเจ้าของข้อมูล</p>
HTML,
                ],
                [
                    'title' => 'ฐานทางกฎหมายและสิทธิของเจ้าของข้อมูล',
                    'type' => 'text',
                    'duration_minutes' => 25,
                    'content' => <<<'HTML'
<h2>ฐานทางกฎหมายในการเก็บข้อมูล</h2>
<ul>
<li><strong>ความยินยอม</strong> — ได้รับความยินยอมจากเจ้าของข้อมูล</li>
<li><strong>สัญญา</strong> — จำเป็นเพื่อปฏิบัติตามสัญญา</li>
<li><strong>หน้าที่ตามกฎหมาย</strong> — เช่น บันทึกข้อมูลตาม พ.ร.บ. สถานพยาบาล</li>
<li><strong>ประโยชน์สำคัญต่อชีวิต</strong> — กรณีฉุกเฉินทางการแพทย์</li>
<li><strong>ประโยชน์โดยชอบด้วยกฎหมาย</strong> — ต้องไม่เกินสมควรเมื่อเทียบกับสิทธิของเจ้าของข้อมูล</li>
</ul>
<h3>สิทธิของเจ้าของข้อมูล (8 สิทธิ)</h3>
<ol>
<li>สิทธิในการเข้าถึงข้อมูล</li>
<li>สิทธิในการแก้ไขข้อมูล</li>
<li>สิทธิในการลบข้อมูล</li>
<li>สิทธิในการระงับการใช้ข้อมูล</li>
<li>สิทธิในการโอนย้ายข้อมูล</li>
<li>สิทธิในการคัดค้าน</li>
<li>สิทธิในการถอนความยินยอม</li>
<li>สิทธิในการร้องเรียน</li>
</ol>
HTML,
                ],
                [
                    'title' => 'แบบทดสอบท้ายบท — พื้นฐาน PDPA',
                    'type' => 'quiz',
                    'quiz' => [
                        'title' => 'แบบทดสอบท้ายบท — พื้นฐาน PDPA',
                        'passing_score' => 80,
                        'questions' => [
                            [
                                'question_text' => 'ประวัติการรักษาผู้ป่วยถือเป็นข้อมูลส่วนบุคคลอ่อนไหวตาม PDPA',
                                'type' => 'true_false',
                                'answers' => [
                                    ['answer_text' => 'ถูก', 'is_correct' => true],
                                    ['answer_text' => 'ผิด', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'โรงพยาบาลในฐานะผู้ให้บริการรักษาพยาบาล มักเป็นผู้ควบคุมข้อมูลส่วนบุคคล',
                                'type' => 'true_false',
                                'answers' => [
                                    ['answer_text' => 'ถูก', 'is_correct' => true],
                                    ['answer_text' => 'ผิด', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'เจ้าของข้อมูลมีสิทธิขอเข้าถึงข้อมูลส่วนบุคคลของตนเองได้',
                                'type' => 'true_false',
                                'answers' => [
                                    ['answer_text' => 'ถูก', 'is_correct' => true],
                                    ['answer_text' => 'ผิด', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'การเก็บข้อมูลผู้ป่วยเพื่อการรักษาในกรณีฉุกเฉิน อาจอาศัยฐานทางกฎหมายใด?',
                                'type' => 'multiple_choice',
                                'answers' => [
                                    ['answer_text' => 'ประโยชน์สำคัญต่อชีวิต', 'is_correct' => true],
                                    ['answer_text' => 'การตลาด', 'is_correct' => false],
                                    ['answer_text' => 'ความบันเทิง', 'is_correct' => false],
                                    ['answer_text' => 'ไม่ต้องมีฐานทางกฎหมาย', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'เจ้าของข้อมูลสามารถถอนความยินยอมได้เมื่อใดก็ได้ (ยกเว้นกรณีที่กฎหมายกำหนดไว้)',
                                'type' => 'true_false',
                                'answers' => [
                                    ['answer_text' => 'ถูก', 'is_correct' => true],
                                    ['answer_text' => 'ผิด', 'is_correct' => false],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    private function coursePdpaPractice(): array
    {
        return [
            'code' => 'PDPA-002',
            'title' => 'การปฏิบัติตาม PDPA ในชีวิตการทำงาน',
            'description' => 'เรียนรู้การขอความยินยอม การจัดการเหตุละเมิดข้อมูล การโอนข้อมูล และแนวปฏิบัติในสถานการณ์จริงของหน่วยงานสาธารณสุข',
            'hours' => 2,
            'module_title' => 'บทที่ 5: การปฏิบัติตาม PDPA',
            'lessons' => [
                [
                    'title' => 'ความยินยอมและการเปิดเผยข้อมูล',
                    'type' => 'text',
                    'duration_minutes' => 25,
                    'content' => <<<'HTML'
<h2>การขอความยินยอม</h2>
<p>ความยินยอมต้อง <strong>ชัดเจน เฉพาะเจาะจง โปร่งใส และถอนได้</strong> ห้ามใช้ความยินยอมเป็นสิ่งแลกเปลี่ยนกับการให้บริการที่จำเป็น</p>
<h3>ตัวอย่างในสถานพยาบาล</h3>
<ul>
<li>แบบฟอร์มยินยอมการรักษา — แยกจากการยินยอมการตลาด</li>
<li>การถ่ายภาพ/วิดีโอในพื้นที่รักษา — ต้องขอความยินยอมก่อน</li>
<li>การส่งข้อมูลให้บุคคลภายนอก — ต้องมีฐานทางกฎหมายหรือความยินยอม</li>
</ul>
<h3>การเปิดเผยข้อมูล</h3>
<p>เปิดเผยเท่าที่จำเป็น (Need-to-know) ห้ามพูดคุยข้อมูลผู้ป่วยในที่สาธารณะ หรือส่งข้อมูลทาง LINE ส่วนตัวโดยไม่มีมาตรการรักษาความปลอดภัย</p>
HTML,
                ],
                [
                    'title' => 'เหตุละเมิดข้อมูลและการรายงาน',
                    'type' => 'text',
                    'duration_minutes' => 25,
                    'content' => <<<'HTML'
<h2>เหตุละเมิดข้อมูลส่วนบุคคล (Data Breach)</h2>
<p>เหตุการณ์ที่ทำให้ข้อมูลส่วนบุคคลถูกละเมิด สูญหาย หรือถูกเข้าถึงโดยไม่ได้รับอนุญาต</p>
<h3>ตัวอย่างเหตุการณ์</h3>
<ul>
<li>ส่งอีเมลผิดผู้รับที่มีข้อมูลผู้ป่วยแนบ</li>
<li>โน้ตบุ๊กหายที่มีข้อมูลไม่เข้ารหัส</li>
<li>ถูก Ransomware เข้ารหัสข้อมูลผู้ป่วย</li>
<li>พนักงานแชร์ข้อมูลผู้ป่วยในกลุ่มแชทส่วนตัว</li>
</ul>
<h3>ขั้นตอนเมื่อพบเหตุการณ์</h3>
<ol>
<li>รายงาน DPO หรือผู้รับผิดชอบ PDPA ทันที</li>
<li>ระงับการแพร่กระจายของข้อมูล</li>
<li>บันทึกรายละเอียดเหตุการณ์</li>
<li>ประเมินความเสี่ยงและแจ้ง สคส. ภายใน 72 ชั่วโมง (กรณีที่มีความเสี่ยงสูง)</li>
<li>แจ้งเจ้าของข้อมูลที่ได้รับผลกระทบ</li>
</ol>
HTML,
                ],
                [
                    'title' => 'แบบทดสอบท้ายบท — การปฏิบัติตาม PDPA',
                    'type' => 'quiz',
                    'quiz' => [
                        'title' => 'แบบทดสอบท้ายบท — การปฏิบัติตาม PDPA',
                        'passing_score' => 80,
                        'questions' => [
                            [
                                'question_text' => 'ความยินยอมตาม PDPA ต้องชัดเจนและถอนได้',
                                'type' => 'true_false',
                                'answers' => [
                                    ['answer_text' => 'ถูก', 'is_correct' => true],
                                    ['answer_text' => 'ผิด', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'การส่งข้อมูลผู้ป่วยผ่าน LINE ส่วนตัวโดยไม่มีมาตรการรักษาความปลอดภัย อาจละเมิด PDPA',
                                'type' => 'true_false',
                                'answers' => [
                                    ['answer_text' => 'ถูก', 'is_correct' => true],
                                    ['answer_text' => 'ผิด', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'เมื่อพบเหตุละเมิดข้อมูล ควรทำอย่างไรเป็นอันดับแรก?',
                                'type' => 'multiple_choice',
                                'answers' => [
                                    ['answer_text' => 'รายงาน DPO/ผู้รับผิดชอบ PDPA ทันที', 'is_correct' => true],
                                    ['answer_text' => 'ปกปิดไว้ก่อน', 'is_correct' => false],
                                    ['answer_text' => 'โพสต์ใน Facebook', 'is_correct' => false],
                                    ['answer_text' => 'ลบหลักฐานทั้งหมด', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'หลัก Need-to-know หมายถึงอะไร?',
                                'type' => 'multiple_choice',
                                'answers' => [
                                    ['answer_text' => 'เปิดเผยข้อมูลเฉพาะผู้ที่จำเป็นต้องใช้ในการทำงาน', 'is_correct' => true],
                                    ['answer_text' => 'แชร์ข้อมูลให้ทุกคนในแผนก', 'is_correct' => false],
                                    ['answer_text' => 'เก็บข้อมูลให้มากที่สุด', 'is_correct' => false],
                                    ['answer_text' => 'ไม่ต้องบันทึกข้อมูลใดๆ', 'is_correct' => false],
                                ],
                            ],
                            [
                                'question_text' => 'ในกรณีเหตุละเมิดที่มีความเสี่ยงสูง ต้องแจ้งสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลภายใน 72 ชั่วโมง',
                                'type' => 'true_false',
                                'answers' => [
                                    ['answer_text' => 'ถูก', 'is_correct' => true],
                                    ['answer_text' => 'ผิด', 'is_correct' => false],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}
