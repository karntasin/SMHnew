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

/**
 * หลักสูตรดิจิทัลพื้นฐาน 5 เรื่อง (เนื้อหา + วิดีโอ + แบบทดสอบ 30 ข้อ)
 *
 * อ้างอิงแนวเนื้อหาจาก Thai MOOC / PDPC e-learning / CISA-Proofpoint awareness / digital citizenship
 *
 * php artisan db:seed --class=DigitalLiteracyCoursesSeeder
 */
class DigitalLiteracyCoursesSeeder extends Seeder
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
            ['slug' => 'digital-literacy'],
            ['name' => 'ทักษะดิจิทัลและความปลอดภัย']
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
                    'instructor' => 'ฝ่ายเทคโนโลยีสารสนเทศ',
                    'created_by' => $admin->id,
                    'category_id' => $category->id,
                    'is_active' => true,
                    'is_mandatory' => false,
                    'status' => 'published',
                ]);

                foreach ($courseData['modules'] as $moduleIndex => $moduleData) {
                    $module = HrdModule::create([
                        'course_id' => $course->id,
                        'title' => $moduleData['title'],
                        'description' => $moduleData['description'] ?? null,
                        'order' => $moduleIndex,
                    ]);

                    foreach ($moduleData['lessons'] as $lessonIndex => $lessonData) {
                        $lesson = HrdLesson::create([
                            'module_id' => $module->id,
                            'title' => $lessonData['title'],
                            'type' => $lessonData['type'],
                            'content' => $lessonData['content'] ?? null,
                            'video_url' => $lessonData['video_url'] ?? null,
                            'duration_minutes' => $lessonData['duration_minutes'] ?? 15,
                            'order' => $lessonIndex,
                        ]);

                        if ($lessonData['type'] === 'quiz' && isset($lessonData['quiz'])) {
                            $this->createQuiz($course, $lesson, $lessonData['quiz']);
                        }
                    }
                }

                $this->command?->info("สร้างหลักสูตร: {$course->code} — {$course->title}");
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
            'passing_score' => $quizData['passing_score'] ?? 70,
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

    private function loadQuiz(string $filename): array
    {
        $path = database_path('seeders/data/digital_literacy/'.$filename);

        return require $path;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function courses(): array
    {
        return [
            $this->courseComputerBasics(),
            $this->courseComputerEndUser(),
            $this->courseCybersecurity(),
            $this->coursePdpa(),
            $this->courseSocialMedia(),
        ];
    }

    private function courseComputerBasics(): array
    {
        return [
            'code' => 'DL-001',
            'title' => 'คอมพิวเตอร์พื้นฐาน',
            'description' => 'เรียนรู้ส่วนประกอบคอมพิวเตอร์ ฮาร์ดแวร์ ซอฟต์แวร์ ระบบปฏิบัติการ การจัดการไฟล์ และอินเทอร์เน็ตเบื้องต้น ตามแนวหลักสูตร IT Literacy / Thai MOOC',
            'hours' => 3,
            'modules' => [
                [
                    'title' => 'บทที่ 1: รู้จักคอมพิวเตอร์',
                    'description' => 'ฮาร์ดแวร์ ซอฟต์แวร์ และหลักการทำงาน',
                    'lessons' => [
                        [
                            'title' => 'คอมพิวเตอร์คืออะไร และมีประโยชน์อย่างไร',
                            'type' => 'text',
                            'duration_minutes' => 15,
                            'content' => <<<'HTML'
<h2>คอมพิวเตอร์คืออะไร</h2>
<p>คอมพิวเตอร์คือเครื่องอิเล็กทรอนิกส์ที่รับข้อมูล (Input) ประมวลผล (Process) เก็บข้อมูล (Storage) และแสดงผล (Output) ตามคำสั่งของโปรแกรม เพื่อช่วยงานประจำวัน การสื่อสาร และการเรียนรู้</p>
<h3>องค์ประกอบหลักของระบบคอมพิวเตอร์</h3>
<ul>
<li><strong>ฮาร์ดแวร์ (Hardware)</strong> — ส่วนที่จับต้องได้ เช่น จอภาพ คีย์บอร์ด เมาส์ ซีพียู ฮาร์ดดิสก์</li>
<li><strong>ซอฟต์แวร์ (Software)</strong> — ชุดคำสั่ง/โปรแกรม เช่น Windows, เว็บเบราว์เซอร์, Microsoft Office</li>
<li><strong>ข้อมูล (Data)</strong> — ข้อความ รูปภาพ เสียง วิดีโอ ที่คอมพิวเตอร์ประมวลผล</li>
<li><strong>ผู้ใช้ (User)</strong> — คนที่สั่งงานและใช้ประโยชน์จากระบบ</li>
</ul>
<h3>ประเภทคอมพิวเตอร์ที่พบบ่อย</h3>
<ul>
<li>คอมพิวเตอร์ตั้งโต๊ะ (Desktop)</li>
<li>โน้ตบุ๊ก (Notebook/Laptop)</li>
<li>แท็บเล็ตและสมาร์ทโฟน</li>
<li>เซิร์ฟเวอร์ (Server) ในองค์กร เช่น ระบบ HOSxP</li>
</ul>
<p><em>แหล่งอ้างอิงแนวเนื้อหา: Thai MOOC — คอมพิวเตอร์สารสนเทศขั้นพื้นฐาน / การรู้เทคโนโลยีสารสนเทศ (IT Literacy)</em></p>
HTML,
                        ],
                        [
                            'title' => 'วิดีโอ: How Computers Work — Hardware and Software',
                            'type' => 'video',
                            'duration_minutes' => 12,
                            'video_url' => 'https://www.youtube.com/watch?v=xnyFYiK2rSY',
                            'content' => '<p>วิดีโอยอดนิยมภาษาอังกฤษ อธิบายความแตกต่างระหว่างฮาร์ดแวร์และซอฟต์แวร์อย่างเข้าใจง่าย (แนะนำเปิดคำบรรยาย)</p>',
                        ],
                        [
                            'title' => 'วิดีโอ: ความรู้พื้นฐานเกี่ยวกับคอมพิวเตอร์ (ภาษาไทย)',
                            'type' => 'video',
                            'duration_minutes' => 20,
                            'video_url' => 'https://www.youtube.com/watch?v=WnZcAir48mk',
                            'content' => '<p>สื่อการสอนภาษาไทย ครอบคลุมวิวัฒนาการคอมพิวเตอร์และแนวคิดพื้นฐาน</p>',
                        ],
                    ],
                ],
                [
                    'title' => 'บทที่ 2: ฮาร์ดแวร์ ซอฟต์แวร์ และการใช้งานเบื้องต้น',
                    'lessons' => [
                        [
                            'title' => 'CPU, RAM, Storage และอุปกรณ์รอบข้าง',
                            'type' => 'text',
                            'duration_minutes' => 20,
                            'content' => <<<'HTML'
<h2>ฮาร์ดแวร์สำคัญที่ควรรู้</h2>
<ul>
<li><strong>CPU (หน่วยประมวลผลกลาง)</strong> — “สมอง” ของเครื่อง ทำหน้าที่คำนวณและสั่งงาน</li>
<li><strong>RAM (หน่วยความจำชั่วคราว)</strong> — เก็บข้อมูลขณะทำงาน เมื่อปิดเครื่องข้อมูลใน RAM จะหาย</li>
<li><strong>Storage (หน่วยเก็บข้อมูลถาวร)</strong> — HDD/SSD เก็บระบบปฏิบัติการ โปรแกรม และไฟล์งาน</li>
<li><strong>เมนบอร์ด</strong> — แผงหลักเชื่อมต่ออุปกรณ์ทุกส่วน</li>
</ul>
<h3>อุปกรณ์นำเข้าและแสดงผล</h3>
<ul>
<li>Input: คีย์บอร์ด เมาส์ สแกนเนอร์ ไมโครโฟน กล้อง</li>
<li>Output: จอภาพ เครื่องพิมพ์ ลำโพง</li>
</ul>
<h3>ซอฟต์แวร์</h3>
<ul>
<li><strong>ระบบปฏิบัติการ (OS)</strong> เช่น Windows, macOS, Linux — จัดการฮาร์ดแวร์และโปรแกรม</li>
<li><strong>โปรแกรมประยุกต์</strong> เช่น Word, Excel, เบราว์เซอร์, อีเมล</li>
</ul>
<h3>การจัดการไฟล์เบื้องต้น</h3>
<p>ใช้โฟลเดอร์จัดหมวดหมู่ ตั้งชื่อไฟล์ให้เข้าใจ หลีกเลี่ยงการเก็บไฟล์สำคัญไว้บนเดสก์ท็อปอย่างเดียว และสำรองข้อมูลเป็นประจำ</p>
HTML,
                        ],
                        [
                            'title' => 'วิดีโอ: Crash Course Computer Science — Early Computing',
                            'type' => 'video',
                            'duration_minutes' => 11,
                            'video_url' => 'https://www.youtube.com/watch?v=O5nskjZ_GoI',
                            'content' => '<p>ซีรีส์ Crash Course Computer Science ที่ได้รับความนิยมสูง แนะนำที่มาของคอมพิวเตอร์และความคิดเรื่อง abstraction</p>',
                        ],
                        [
                            'title' => 'อินเทอร์เน็ต อีเมล และคลาวด์เบื้องต้น',
                            'type' => 'text',
                            'duration_minutes' => 15,
                            'content' => <<<'HTML'
<h2>อินเทอร์เน็ตและการใช้งานอย่างปลอดภัย</h2>
<ul>
<li>ใช้เว็บเบราว์เซอร์ (Chrome, Edge, Firefox) และตรวจดูว่าเว็บไซต์ขึ้นต้นด้วย <strong>https://</strong></li>
<li>อย่าคลิกลิงก์จากแหล่งที่ไม่น่าเชื่อถือ</li>
<li>อีเมลองค์กรใช้สำหรับงาน — ระวังไฟล์แนบและลิงก์ปลอม</li>
<li>คลาวด์ (OneDrive, Google Drive) ช่วยสำรองและแชร์ไฟล์ แต่ต้องตั้งสิทธิ์ให้ถูกต้อง</li>
</ul>
<h3>จริยธรรมและกฎหมายเบื้องต้น</h3>
<p>ไม่ติดตั้งซอฟต์แวร์เถื่อน ไม่แชร์รหัสผ่าน ไม่เผยแพร่ข้อมูลผู้ป่วย/ข้อมูลส่วนบุคคลโดยไม่ได้รับอนุญาต</p>
HTML,
                        ],
                        [
                            'title' => 'แบบทดสอบ: คอมพิวเตอร์พื้นฐาน (30 ข้อ)',
                            'type' => 'quiz',
                            'duration_minutes' => 40,
                            'quiz' => [
                                'title' => 'แบบทดสอบคอมพิวเตอร์พื้นฐาน',
                                'description' => 'วัดความรู้ฮาร์ดแวร์ ซอฟต์แวร์ ไฟล์ อินเทอร์เน็ต และจริยธรรมการใช้คอมพิวเตอร์',
                                'passing_score' => 70,
                                'questions' => $this->loadQuiz('quiz_computer_basics.php'),
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    private function courseComputerEndUser(): array
    {
        return [
            'code' => 'DL-002',
            'title' => 'คอมพิวเตอร์ระดับผู้ใช้งาน',
            'description' => 'ทักษะใช้งาน Windows จัดการไฟล์ Microsoft Office (Word Excel PowerPoint) อีเมล คลาวด์ และการพิมพ์เอกสาร สำหรับงานประจำวัน ตามแนว IT Literacy / Basic Office',
            'hours' => 4,
            'modules' => [
                [
                    'title' => 'บทที่ 1: Windows และการจัดการไฟล์',
                    'lessons' => [
                        [
                            'title' => 'ใช้งาน Windows อย่างมีประสิทธิภาพ',
                            'type' => 'text',
                            'duration_minutes' => 20,
                            'content' => <<<'HTML'
<h2>ทักษะ Windows สำหรับผู้ใช้งานทั่วไป</h2>
<ul>
<li>เปิด/ปิดเครื่องอย่างถูกวิธี — อย่าบังคับปิดขณะระบบกำลังอัปเดต</li>
<li>ใช้ <strong>File Explorer</strong> สร้างโฟลเดอร์ คัดลอก ย้าย เปลี่ยนชื่อ และค้นหาไฟล์</li>
<li>รู้จักนามสกุลไฟล์: .docx .xlsx .pptx .pdf .jpg .png</li>
<li>ถังขยะ (Recycle Bin) — ลบแล้วยังกู้คืนได้จนกว่าจะลบถาวร</li>
<li>คีย์ลัดที่ใช้บ่อย: Ctrl+C / Ctrl+V / Ctrl+X / Ctrl+Z / Ctrl+S / Alt+Tab / Windows+E</li>
</ul>
<h3>การสำรองข้อมูล</h3>
<p>สำรองไฟล์สำคัญไปยังไดรฟ์ภายนอกหรือคลาวด์องค์กรอย่างน้อยสัปดาห์ละครั้ง และอย่าวางรหัสผ่าน/ข้อมูลผู้ป่วยในไฟล์สาธารณะ</p>
HTML,
                        ],
                        [
                            'title' => 'วิดีโอ: Microsoft Word สำหรับผู้เริ่มต้น',
                            'type' => 'video',
                            'duration_minutes' => 25,
                            'video_url' => 'https://www.youtube.com/watch?v=5Im87VPQZ_0',
                            'content' => '<p>สอนใช้งาน Word พื้นฐานโดย Kevin Stratvert (ยอดชมสูง) — จัดรูปแบบ ตาราง บันทึก และแชร์</p>',
                        ],
                    ],
                ],
                [
                    'title' => 'บทที่ 2: Office อีเมล และคลาวด์',
                    'lessons' => [
                        [
                            'title' => 'Word Excel PowerPoint ในงานประจำ',
                            'type' => 'text',
                            'duration_minutes' => 25,
                            'content' => <<<'HTML'
<h2>Microsoft Office สำหรับงานโรงพยาบาล/สำนักงาน</h2>
<h3>Word</h3>
<ul>
<li>สร้างจดหมาย รายงาน บันทึกข้อความ</li>
<li>ใช้สไตล์หัวข้อ ตาราง และหัวกระดาษ/ท้ายกระดาษ</li>
<li>บันทึกเป็น PDF เมื่อต้องการแชร์แบบไม่ให้แก้ไขง่าย</li>
</ul>
<h3>Excel</h3>
<ul>
<li>ใช้ตาราง กรองข้อมูล และสูตรพื้นฐาน เช่น SUM AVERAGE COUNT</li>
<li>แยกชีตตามเดือน/หน่วยงาน</li>
<li>ระวังการส่งไฟล์ที่มีข้อมูลส่วนบุคคล</li>
</ul>
<h3>PowerPoint</h3>
<ul>
<li>สไลด์ไม่ควรแน่นตัวอักษร — เน้นหัวข้อและภาพประกอบ</li>
<li>ใช้เทมเพลตองค์กรถ้ามี</li>
</ul>
<h3>อีเมลและคลาวด์</h3>
<ul>
<li>เขียนหัวข้ออีเมลให้ชัด ตรวจผู้รับก่อนส่ง โดยเฉพาะ Reply All</li>
<li>ใช้ OneDrive/Google Drive ขององค์กร ตั้งสิทธิ์ “ดูอย่างเดียว” เมื่อจำเป็น</li>
<li>ตรวจสอบเครื่องพิมพ์ก่อนพิมพ์จำนวนมาก และใช้ Print Preview</li>
</ul>
<p><em>แนวเนื้อหาอ้างอิง: Thai MOOC IT Literacy / หลักสูตร Basic Office ที่ศูนย์อบรมทั่วไปนิยมสอน</em></p>
HTML,
                        ],
                        [
                            'title' => 'วิดีโอ: Excel สำหรับผู้เริ่มต้น',
                            'type' => 'video',
                            'duration_minutes' => 30,
                            'video_url' => 'https://www.youtube.com/watch?v=rwbho0CgEAE',
                            'content' => '<p>วิดีโอสอน Excel พื้นฐานที่ได้รับความนิยมสูง ครอบคลุมตาราง สูตร และการจัดรูปแบบ</p>',
                        ],
                        [
                            'title' => 'วิดีโอเสริม: Microsoft Word Overview',
                            'type' => 'video',
                            'duration_minutes' => 15,
                            'video_url' => 'https://www.youtube.com/watch?v=2bQSJPQhafg',
                            'content' => '<p>ภาพรวม Microsoft Word ฉบับสั้นยอดนิยม — เสริมความเข้าใจอินเทอร์เฟซโปรแกรมสำนักงาน</p>',
                        ],
                        [
                            'title' => 'แบบทดสอบ: คอมพิวเตอร์ระดับผู้ใช้งาน (30 ข้อ)',
                            'type' => 'quiz',
                            'duration_minutes' => 40,
                            'quiz' => [
                                'title' => 'แบบทดสอบคอมพิวเตอร์ระดับผู้ใช้งาน',
                                'description' => 'วัดทักษะ Windows Office อีเมล คลาวด์ และการสำรองข้อมูล',
                                'passing_score' => 70,
                                'questions' => $this->loadQuiz('quiz_computer_enduser.php'),
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    private function courseCybersecurity(): array
    {
        return [
            'code' => 'DL-003',
            'title' => 'ความปลอดภัยทางไซเบอร์สำหรับบุคลากร',
            'description' => 'สร้างความตระหนักรู้ด้านไซเบอร์: Phishing, รหัสผ่าน, MFA, มัลแวร์, Social Engineering และการรายงานเหตุ ตามแนว Security Awareness ที่องค์กรชั้นนำใช้ (Proofpoint / CISA)',
            'hours' => 3,
            'modules' => [
                [
                    'title' => 'บทที่ 1: ภัยคุกคามที่พบบ่อย',
                    'lessons' => [
                        [
                            'title' => 'ทำไมบุคลากรจึงเป็นแนวป้องกันสำคัญ',
                            'type' => 'text',
                            'duration_minutes' => 18,
                            'content' => <<<'HTML'
<h2>Security Awareness คืออะไร</h2>
<p>การสร้างความตระหนักรู้ด้านความมั่นคงปลอดภัยทางไซเบอร์ช่วยให้บุคลากรรู้เท่าทัน หยุดคิด ตรวจสอบ และรายงานภัยคุกคาม แทนที่จะเป็นช่องโหว่ขององค์กร</p>
<h3>หลัก CIA Triad</h3>
<ul>
<li><strong>Confidentiality</strong> — รักษาความลับ ข้อมูลเข้าถึงได้เฉพาะผู้มีสิทธิ์</li>
<li><strong>Integrity</strong> — ข้อมูลถูกต้อง ไม่ถูกแก้ไขโดยไม่ได้รับอนุญาต</li>
<li><strong>Availability</strong> — ระบบพร้อมใช้งานเมื่อต้องการ</li>
</ul>
<h3>ภัยที่พบบ่อยในองค์กร</h3>
<ul>
<li><strong>Phishing / Smishing / Vishing</strong> — หลอกลวงผ่านอีเมล SMS โทรศัพท์</li>
<li><strong>Malware / Ransomware</strong> — ซอฟต์แวร์มุ่งร้าย เข้ารหัสไฟล์เรียกค่าไถ่</li>
<li><strong>Social Engineering</strong> — ใช้จิตวิทยาเร่งด่วน แอบอ้างผู้บริหาร/IT</li>
<li><strong>รหัสผ่านอ่อน / ใช้ซ้ำ</strong> และ MFA push ที่ไม่ได้ตั้งใจล็อกอิน</li>
</ul>
<p><em>อ้างอิงแนวหลักสูตร: Proofpoint Security Awareness, CISA “More than a Password”, Adaptive Security awareness topics</em></p>
HTML,
                        ],
                        [
                            'title' => 'วิดีโอ: What is Cyber Security?',
                            'type' => 'video',
                            'duration_minutes' => 12,
                            'video_url' => 'https://www.youtube.com/watch?v=inWWhr5tnEA',
                            'content' => '<p>คลิปอธิบายภาพรวม Cybersecurity ที่มียอดชมสูง เหมาะเป็นบทนำ</p>',
                        ],
                        [
                            'title' => 'รู้ทัน Phishing และ Social Engineering',
                            'type' => 'text',
                            'duration_minutes' => 20,
                            'content' => <<<'HTML'
<h2>สัญญาณของอีเมล/ข้อความน่าสงสัย</h2>
<ul>
<li>เร่งด่วนผิดปกติ ขู่ตัดสิทธิ์ เรียกเก็บเงิน</li>
<li>ผู้ส่งชื่อคล้ายของจริงแต่โดเมนผิด</li>
<li>ลิงก์ชี้ไปเว็บที่ไม่คุ้นเคย / ขอรหัสผ่าน</li>
<li>ไฟล์แนบ .exe .js .macro ที่ไม่ได้คาดหวัง</li>
</ul>
<h3>แนวปฏิบัติ</h3>
<ol>
<li><strong>Pause</strong> — หยุดคิดเมื่อถูกเร่ง</li>
<li><strong>Verify</strong> — ยืนยันผ่านช่องทางอื่น (โทรหา IT / ผู้เกี่ยวข้องโดยตรง)</li>
<li><strong>Report</strong> — แจ้งทีมไอทีทันที ไม่แชร์ต่อในกลุ่มแชท</li>
</ol>
<h3>รหัสผ่านและ MFA</h3>
<p>ใช้รหัสผ่านยาวและไม่ซ้ำกัน เปิด Multi-Factor Authentication ทุกบัญชีสำคัญ และ<strong>อย่ากด Approve</strong> คำขอ MFA ที่ตัวเองไม่ได้กำลังล็อกอิน</p>
HTML,
                        ],
                        [
                            'title' => 'วิดีโอ: Phishing Explained',
                            'type' => 'video',
                            'duration_minutes' => 8,
                            'video_url' => 'https://www.youtube.com/watch?v=XBkzBrXlle0',
                            'content' => '<p>อธิบายการโจมตีแบบ Phishing และวิธีสังเกต</p>',
                        ],
                    ],
                ],
                [
                    'title' => 'บทที่ 2: ปฏิบัติงานอย่างปลอดภัย',
                    'lessons' => [
                        [
                            'title' => 'Wi-Fi สาธารณะ USB Clean Desk และการรายงานเหตุ',
                            'type' => 'text',
                            'duration_minutes' => 15,
                            'content' => <<<'HTML'
<h2>พฤติกรรมปลอดภัยในที่ทำงาน</h2>
<ul>
<li>อย่าเชื่อมต่อ USB ไม่ทราบที่มา</li>
<li>ระวัง Wi-Fi สาธารณะเมื่อเข้าถึงระบบงาน — ใช้ VPN ขององค์กรถ้ามี</li>
<li>ล็อกหน้าจอเมื่อออกจากโต๊ะ (Windows+L) และเก็บเอกสารผู้ป่วยไม่ให้คนอื่นเห็น</li>
<li>อัปเดตระบบและแอนตี้ไวรัสตามที่ IT กำหนด</li>
<li>เมื่อสงสัยว่าถูกแฮ็ก/คลิกลิงก์ผิด — ถอดสายเน็ตถ้าทำได้ แล้วแจ้ง IT ทันที</li>
</ul>
HTML,
                        ],
                        [
                            'title' => 'แบบทดสอบ: ความปลอดภัยทางไซเบอร์ (30 ข้อ)',
                            'type' => 'quiz',
                            'duration_minutes' => 40,
                            'quiz' => [
                                'title' => 'แบบทดสอบความปลอดภัยทางไซเบอร์',
                                'description' => 'วัดความเข้าใจภัยคุกคาม การป้องกัน และการรายงานเหตุ',
                                'passing_score' => 70,
                                'questions' => $this->loadQuiz('quiz_cybersecurity.php'),
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    private function coursePdpa(): array
    {
        return [
            'code' => 'DL-004',
            'title' => 'PDPA พื้นฐานสำหรับบุคลากร',
            'description' => 'พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562: ประเภทข้อมูล ฐานกฎหมาย สิทธิเจ้าของข้อมูล บทบาท Controller/Processor/DPO และการปฏิบัติในโรงพยาบาล ตามแนว PDPC e-learning',
            'hours' => 3,
            'modules' => [
                [
                    'title' => 'บทที่ 1: รู้จัก PDPA',
                    'lessons' => [
                        [
                            'title' => 'PDPA คืออะไร และข้อมูลส่วนบุคคลคืออะไร',
                            'type' => 'text',
                            'duration_minutes' => 20,
                            'content' => <<<'HTML'
<h2>พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</h2>
<p>กฎหมายที่คุ้มครองสิทธิของบุคคลเกี่ยวกับการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล มีผลบังคับใช้เต็มรูปแบบตั้งแต่วันที่ 1 มิถุนายน 2565 โดยมีสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส. / PDPC) เป็นหน่วยงานกำกับดูแล</p>
<h3>ข้อมูลส่วนบุคคล</h3>
<p>ข้อมูลที่ทำให้ระบุตัวบุคคลได้ เช่น ชื่อ-สกุล ที่อยู่ เลขบัตรประชาชน เบอร์โทร อีเมล รูปภาพ ประวัติการรักษาเมื่อเชื่อมโยงถึงตัวบุคคลได้</p>
<h3>ข้อมูลอ่อนไหว (Sensitive Personal Data)</h3>
<p>เช่น เชื้อชาติ ศาสนา พฤติกรรมทางเพศ ข้อมูลสุขภาพ ข้อมูลชีวภาพ ความพิการ ประวัติอาชญากรรม — โดยทั่วไปต้องได้รับความยินยอมโดยชัดแจ้งหรือมีฐานกฎหมายเฉพาะ</p>
<h3>หลักการสำคัญ</h3>
<ul>
<li>เก็บเท่าที่จำเป็น (Data Minimization)</li>
<li>ใช้ตามวัตถุประสงค์ที่แจ้งไว้ (Purpose Limitation)</li>
<li>โปร่งใส แจ้ง Privacy Notice</li>
<li>รักษาความมั่นคงปลอดภัยของข้อมูล</li>
</ul>
<p><em>แหล่งอ้างอิง: PDPC e-learning (elearning.pdpc.or.th), สรุปสาระสำคัญ PDPA โดยสภาดิจิทัลฯ</em></p>
HTML,
                        ],
                        [
                            'title' => 'วิดีโอ: กฎหมายที่ควรรู้คู่โลกออนไลน์ (แนะนำ PDPA/คอมฯ)',
                            'type' => 'video',
                            'duration_minutes' => 20,
                            'video_url' => 'https://www.youtube.com/watch?v=pLaLXhvqBb0',
                            'content' => '<p>สื่อการศึกษาภาษาไทยเกี่ยวกับกฎหมายออนไลน์ที่เกี่ยวข้องกับการใช้ข้อมูลและคอมพิวเตอร์</p>',
                        ],
                        [
                            'title' => 'สิทธิเจ้าของข้อมูล และบทบาทในองค์กร',
                            'type' => 'text',
                            'duration_minutes' => 20,
                            'content' => <<<'HTML'
<h2>สิทธิของเจ้าของข้อมูลส่วนบุคคล</h2>
<ul>
<li>ขอเข้าถึงและขอสำเนาข้อมูล</li>
<li>ขอแก้ไขให้ถูกต้อง</li>
<li>ขอให้ลบหรือทำลายเมื่อเงื่อนไขครบ</li>
<li>ขอระงับการใช้</li>
<li>คัดค้านการเก็บรวบรวม ใช้ เปิดเผย</li>
<li>ขอถอนความยินยอม</li>
<li>ขอให้โอนย้ายข้อมูลในรูปแบบที่อ่านด้วยเครื่องได้ (ในกรณีที่เข้าเงื่อนไข)</li>
</ul>
<h3>บทบาท</h3>
<ul>
<li><strong>ผู้ควบคุมข้อมูล (Data Controller)</strong> — กำหนดวัตถุประสงค์และวิธีการประมวลผล</li>
<li><strong>ผู้ประมวลผล (Data Processor)</strong> — ทำตามคำสั่งของผู้ควบคุม</li>
<li><strong>DPO</strong> — เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล ให้คำปรึกษาและประสานงาน</li>
</ul>
<h3>เหตุละเมิดข้อมูล</h3>
<p>เมื่อเกิดเหตุละเมิดที่เสี่ยงต่อสิทธิเสรีภาพ องค์กรต้องแจ้ง สคส. โดยไม่ชักช้าภายใน <strong>72 ชั่วโมง</strong> นับแต่ทราบเหตุ (ตามหลักเกณฑ์ที่กฎหมายกำหนด) และอาจต้องแจ้งเจ้าของข้อมูลด้วย</p>
HTML,
                        ],
                    ],
                ],
                [
                    'title' => 'บทที่ 2: ปฏิบัติตาม PDPA ในงานประจำ',
                    'lessons' => [
                        [
                            'title' => 'แนวปฏิบัติสำหรับบุคลากรโรงพยาบาล',
                            'type' => 'text',
                            'duration_minutes' => 18,
                            'content' => <<<'HTML'
<h2>สิ่งที่บุคลากรควรทำ</h2>
<ul>
<li>เข้าถึงข้อมูลผู้ป่วยตาม Need-to-Know เท่านั้น</li>
<li>ไม่ถ่ายรูป/แชร์ข้อมูลผู้ป่วยในโซเชียลหรือไลน์ส่วนตัว</li>
<li>ใช้ระบบของโรงพยาบาลในการส่งข้อมูล และเข้ารหัส/ตั้งรหัสผ่านไฟล์เมื่อจำเป็น</li>
<li>อ่าน Privacy Notice ของหน่วยงาน และรู้ช่องทางติดต่อ DPO</li>
<li>เมื่อถูกขอข้อมูลจากภายนอก ให้ส่งต่อตามกระบวนการ ไม่ตัดสินใจคนเดียว</li>
</ul>
<h3>ความยินยอม</h3>
<p>ความยินยอมต้องให้โดยอิสระ ชัดเจน แจ้งวัตถุประสงค์ และถอนได้ — แต่ในงานสาธารณสุขอาจมีฐานกฎหมายอื่นนอกเหนือจากความยินยอม ควรปรึกษานโยบายของหน่วยงาน</p>
<p><em>แนะนำเรียนต่อเนื่องที่หลักสูตรอย่างเป็นทางการของ PDPC: https://elearning.pdpc.or.th</em></p>
HTML,
                        ],
                        [
                            'title' => 'แบบทดสอบ: PDPA พื้นฐาน (30 ข้อ)',
                            'type' => 'quiz',
                            'duration_minutes' => 40,
                            'quiz' => [
                                'title' => 'แบบทดสอบ PDPA พื้นฐาน',
                                'description' => 'วัดความเข้าใจกฎหมายคุ้มครองข้อมูลส่วนบุคคลและการปฏิบัติงาน',
                                'passing_score' => 70,
                                'questions' => $this->loadQuiz('quiz_pdpa.php'),
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    private function courseSocialMedia(): array
    {
        return [
            'code' => 'DL-005',
            'title' => 'การใช้สื่อโซเชียลอย่างถูกวิธี',
            'description' => 'Digital Footprint ความเป็นส่วนตัว การไม่โพสต์ข้อมูลผู้ป่วย การรู้เท่าทันข่าวปลอม การกลั่นแกล้งออนไลน์ และมารยาทบนโลกออนไลน์ ตามแนว Digital Citizenship',
            'hours' => 2.5,
            'modules' => [
                [
                    'title' => 'บทที่ 1: รอยเท้าดิจิทัลและความเป็นส่วนตัว',
                    'lessons' => [
                        [
                            'title' => 'Digital Footprint และการตั้งค่าความเป็นส่วนตัว',
                            'type' => 'text',
                            'duration_minutes' => 18,
                            'content' => <<<'HTML'
<h2>Digital Footprint คืออะไร</h2>
<p>รอยเท้าดิจิทัลคือข้อมูลที่เกิดจากการใช้งานออนไลน์ ทั้งที่ตั้งใจ (โพสต์ รูป คลิป) และไม่ได้ตั้งใจ (ประวัติค้นหา การเช็กอิน การกดไลก์) ซึ่งอาจถูกค้นพบได้นานและส่งผลต่อชื่อเสียง การสมัครงาน หรือความน่าเชื่อถือขององค์กร</p>
<h3>สิ่งที่ไม่ควรแชร์</h3>
<ul>
<li>ข้อมูลผู้ป่วย รูปในหอผู้ป่วย ผลแล็บ ใบรับรองแพทย์</li>
<li>เลขบัตรประชาชน รหัส OTP ที่อยู่บ้านขณะไม่อยู่</li>
<li>ข้อมูลภายในองค์กรที่ยังไม่เปิดเผยต่อสาธารณะ</li>
<li>ภาพ/คลิปที่ทำให้ผู้อื่นอับอาย โดยไม่ได้รับอนุญาต</li>
</ul>
<h3>ตั้งค่าความปลอดภัยบัญชี</h3>
<ul>
<li>ตั้งค่าโปรไฟล์เป็นส่วนตัวตามความเหมาะสม</li>
<li>เปิดยืนยันตัวตนสองชั้น (2FA)</li>
<li>ตรวจแอปที่เชื่อมต่อบัญชีและยกเลิกสิทธิ์ที่ไม่ใช้</li>
<li>คิดก่อนโพสต์: จะรู้สึกอย่างไรหากผู้บริหาร เพื่อนร่วมงาน หรือผู้ป่วยเห็น</li>
</ul>
<p><em>อ้างอิงแนวคิด: ALTV Thai PBS / OKMD Knowledge Portal — Digital Footprint, หลักสูตร digital citizenship ในสถานศึกษา</em></p>
HTML,
                        ],
                        [
                            'title' => 'วิดีโอ: Digital Footprint (Common Sense Education)',
                            'type' => 'video',
                            'duration_minutes' => 3,
                            'video_url' => 'https://www.youtube.com/watch?v=HSkodmhg8vQ',
                            'content' => '<p>คลิปสั้นยอดนิยมจาก Common Sense Education อธิบาย Digital Footprint (แนะนำเปิดคำบรรยาย)</p>',
                        ],
                    ],
                ],
                [
                    'title' => 'บทที่ 2: ใช้โซเชียลอย่างรับผิดชอบ',
                    'lessons' => [
                        [
                            'title' => 'ข่าวปลอม การกลั่นแกล้ง และมารยาทออนไลน์',
                            'type' => 'text',
                            'duration_minutes' => 20,
                            'content' => <<<'HTML'
<h2>รู้เท่าทันข้อมูลและพฤติกรรมออนไลน์</h2>
<ul>
<li><strong>ข่าวปลอม / Misinformation</strong> — ตรวจสอบแหล่งที่มา วันที่ และอย่าแชร์เมื่อยังไม่แน่ใจ</li>
<li><strong>Cyberbullying</strong> — ไม่โพสต์เหยียดหยาม บันทึกหลักฐานและรายงานตามช่องทาง</li>
<li><strong>มิจฉาชีพ / โฆษณาหลอกลวง</strong> — อย่าโอนเงินตามลิงก์แชท ไม่บอก OTP</li>
<li><strong>Deepfake</strong> — คลิป/เสียงปลอมอาจใช้หลอกได้ ควรยืนยันผ่านช่องทางทางการ</li>
</ul>
<h3>นโยบายองค์กร</h3>
<p>บุคลากรโรงพยาบาลเป็นตัวแทนภาพลักษณ์หน่วยงาน แม้โพสต์ในบัญชีส่วนตัว หากระบุสังกัดหรือโพสต์เนื้อหาเกี่ยวกับงาน อาจมีผลทางวินัย — ศึกษาคู่มือการใช้โซเชียลของโรงพยาบาล และเมื่อไม่แน่ใจให้ถามหัวหน้างาน/PR</p>
<h3>กฎหมายที่เกี่ยวข้อง (ภาพรวม)</h3>
<ul>
<li>PDPA — คุ้มครองข้อมูลส่วนบุคคล</li>
<li>พ.ร.บ.ว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ — เช่น นำเข้าข้อมูลเท็จที่ก่อให้เกิดความเสียหาย</li>
</ul>
HTML,
                        ],
                        [
                            'title' => 'วิดีโอ: Online Safety & Thinking Before You Share',
                            'type' => 'video',
                            'duration_minutes' => 5,
                            'video_url' => 'https://www.youtube.com/watch?v=utKJzXcQOBY',
                            'content' => '<p>สื่อความปลอดภัยออนไลน์ที่ได้รับความนิยม เน้นคิดก่อนแชร์</p>',
                        ],
                        [
                            'title' => 'แบบทดสอบ: การใช้สื่อโซเชียลอย่างถูกวิธี (30 ข้อ)',
                            'type' => 'quiz',
                            'duration_minutes' => 40,
                            'quiz' => [
                                'title' => 'แบบทดสอบการใช้สื่อโซเชียลอย่างถูกวิธี',
                                'description' => 'วัดความเข้าใจ Digital Footprint ความเป็นส่วนตัว และพฤติกรรมออนไลน์ที่เหมาะสม',
                                'passing_score' => 70,
                                'questions' => $this->loadQuiz('quiz_social_media.php'),
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}
