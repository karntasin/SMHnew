@php
    $type = $type ?? 'default';
@endphp

@if ($type === 'login')
<svg viewBox="0 0 520 300" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:520px;height:auto">
  <rect width="520" height="300" rx="16" fill="#F5F3FF"/>
  <rect x="130" y="30" width="260" height="240" rx="12" fill="#fff" stroke="#C4B5FD" stroke-width="2"/>
  <rect x="130" y="30" width="260" height="6" rx="3" fill="#7C3AED"/>
  <circle cx="260" cy="85" r="28" fill="#EDE9FE" stroke="#7C3AED" stroke-width="2"/>
  <text x="260" y="92" text-anchor="middle" font-size="22" fill="#7C3AED">🏥</text>
  <text x="260" y="125" text-anchor="middle" font-size="13" font-weight="bold" fill="#4C1D95">เข้าสู่ระบบ</text>
  <rect x="165" y="140" width="190" height="28" rx="6" fill="#F9FAFB" stroke="#D8B4FE"/>
  <text x="175" y="158" font-size="10" fill="#9CA3AF">อีเมล</text>
  <rect x="165" y="176" width="190" height="28" rx="6" fill="#F9FAFB" stroke="#D8B4FE"/>
  <text x="175" y="194" font-size="10" fill="#9CA3AF">รหัสผ่าน</text>
  <rect x="165" y="214" width="190" height="32" rx="8" fill="#7C3AED"/>
  <text x="260" y="234" text-anchor="middle" font-size="11" fill="#fff" font-weight="bold">เข้าสู่ระบบ</text>
  <rect x="165" y="254" width="190" height="28" rx="6" fill="#06C755"/>
  <text x="260" y="272" text-anchor="middle" font-size="10" fill="#fff">LINE Login</text>
</svg>
@elseif ($type === 'sidebar')
<svg viewBox="0 0 520 300" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:520px;height:auto">
  <rect width="520" height="300" rx="16" fill="#F8FAFC"/>
  <rect x="10" y="10" width="150" height="280" rx="10" fill="#F5F3FF" stroke="#DDD6FE"/>
  <rect x="20" y="22" width="130" height="36" rx="8" fill="#fff" stroke="#C4B5FD"/>
  <text x="30" y="44" font-size="11" font-weight="bold" fill="#7C3AED">SMH</text>
  <rect x="20" y="66" width="130" height="24" rx="6" fill="#fff" stroke="#E9D5FF"/>
  <text x="30" y="82" font-size="9" fill="#9CA3AF">🔍 ค้นหาเมนู...</text>
  <rect x="20" y="98" width="130" height="22" rx="5" fill="#EDE9FE"/>
  <text x="28" y="113" font-size="9" fill="#6D28D9">📊 แดชบอร์ด</text>
  <rect x="20" y="124" width="130" height="22" rx="5" fill="#7C3AED"/>
  <text x="28" y="139" font-size="9" fill="#fff">📖 คู่มือการใช้งาน</text>
  <rect x="20" y="150" width="130" height="22" rx="5" fill="#fff"/>
  <text x="28" y="165" font-size="9" fill="#4B5563">🏆 ศูนย์พัฒนาคุณภาพ ›</text>
  <rect x="28" y="176" width="122" height="18" rx="4" fill="#F9FAFB"/>
  <text x="36" y="189" font-size="8" fill="#6B7280">└ ภาพรวมคุณภาพ</text>
  <rect x="20" y="200" width="130" height="22" rx="5" fill="#fff"/>
  <text x="28" y="215" font-size="9" fill="#4B5563">🔧 แจ้งซ่อม ›</text>
  <rect x="170" y="10" width="340" height="280" rx="10" fill="#fff" stroke="#E5E7EB"/>
  <rect x="186" y="26" width="308" height="40" rx="8" fill="#F9FAFB" stroke="#E5E7EB"/>
  <text x="200" y="50" font-size="11" fill="#374151">เนื้อหาหลักของระบบ</text>
  <rect x="186" y="78" width="145" height="70" rx="8" fill="#EDE9FE"/>
  <rect x="341" y="78" width="153" height="70" rx="8" fill="#F0FDF4"/>
  <rect x="186" y="158" width="308" height="118" rx="8" fill="#F9FAFB" stroke="#E5E7EB"/>
  <text x="200" y="220" font-size="10" fill="#9CA3AF">ตาราง / กราฟ / ฟอร์ม</text>
</svg>
@elseif ($type === 'dashboard')
<svg viewBox="0 0 520 300" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:520px;height:auto">
  <rect width="520" height="300" rx="16" fill="#F5F3FF"/>
  <rect x="20" y="20" width="480" height="50" rx="10" fill="url(#g1)"/>
  <defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#6D28D9"/><stop offset="1" stop-color="#7C3AED"/></linearGradient></defs>
  <text x="40" y="50" font-size="14" fill="#fff" font-weight="bold">แดชบอร์ด — ภาพรวมสถิติ</text>
  <rect x="20" y="82" width="110" height="68" rx="8" fill="#fff" stroke="#DDD6FE"/>
  <text x="32" y="104" font-size="9" fill="#6B7280">OPD</text>
  <text x="32" y="130" font-size="18" fill="#7C3AED" font-weight="bold">1,248</text>
  <rect x="142" y="82" width="110" height="68" rx="8" fill="#fff" stroke="#DDD6FE"/>
  <text x="154" y="104" font-size="9" fill="#6B7280">IPD</text>
  <text x="154" y="130" font-size="18" fill="#7C3AED" font-weight="bold">356</text>
  <rect x="264" y="82" width="110" height="68" rx="8" fill="#fff" stroke="#DDD6FE"/>
  <text x="276" y="104" font-size="9" fill="#6B7280">ER</text>
  <text x="276" y="130" font-size="18" fill="#7C3AED" font-weight="bold">89</text>
  <rect x="386" y="82" width="114" height="68" rx="8" fill="#fff" stroke="#DDD6FE"/>
  <text x="398" y="104" font-size="9" fill="#6B7280">ค่ารักษา</text>
  <text x="398" y="130" font-size="14" fill="#7C3AED" font-weight="bold">฿2.4M</text>
  <rect x="20" y="162" width="300" height="118" rx="8" fill="#fff" stroke="#DDD6FE"/>
  <polyline points="40,250 80,220 120,230 160,190 200,200 240,170 280,180" fill="none" stroke="#7C3AED" stroke-width="2"/>
  <text x="32" y="180" font-size="9" fill="#6B7280">กราฟผู้มารับบริการรายเดือน</text>
  <rect x="332" y="162" width="168" height="118" rx="8" fill="#fff" stroke="#DDD6FE"/>
  <text x="344" y="180" font-size="9" fill="#6B7280">Top ICD-10</text>
  <rect x="344" y="190" width="120" height="8" rx="4" fill="#EDE9FE"/><rect x="344" y="190" width="90" height="8" rx="4" fill="#7C3AED"/>
  <rect x="344" y="206" width="120" height="8" rx="4" fill="#EDE9FE"/><rect x="344" y="206" width="70" height="8" rx="4" fill="#9333EA"/>
  <rect x="344" y="222" width="120" height="8" rx="4" fill="#EDE9FE"/><rect x="344" y="222" width="50" height="8" rx="4" fill="#A78BFA"/>
</svg>
@elseif ($type === 'modules-map')
<svg viewBox="0 0 520 340" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:520px;height:auto">
  <rect width="520" height="340" rx="16" fill="#FAFAFA"/>
  <rect x="185" y="15" width="150" height="44" rx="10" fill="#7C3AED"/>
  <text x="260" y="43" text-anchor="middle" font-size="12" fill="#fff" font-weight="bold">SMH Dashboard</text>
  @foreach ([
    ['x'=>20,'y'=>80,'l'=>'แดชบอร์ด','c'=>'#6D28D9'],
    ['x'=>140,'y'=>80,'l'=>'ศูนย์พัฒนาคุณภาพ','c'=>'#7C3AED'],
    ['x'=>260,'y'=>80,'l'=>'งานธุรการ','c'=>'#8B5CF6'],
    ['x'=>380,'y'=>80,'l'=>'จองรถ','c'=>'#9333EA'],
    ['x'=>20,'y'=>150,'l'=>'หนังสือ','c'=>'#A78BFA'],
    ['x'=>140,'y'=>150,'l'=>'แจ้งซ่อม','c'=>'#C084FC'],
    ['x'=>260,'y'=>150,'l'=>'KM/อบรม','c'=>'#7C3AED'],
    ['x'=>380,'y'=>150,'l'=>'แจ้งเตือน','c'=>'#6D28D9'],
    ['x'=>80,'y'=>220,'l'=>'MRA / IC / ENV','c'=>'#5B21B6'],
    ['x'=>240,'y'=>220,'l'=>'รายงาน HOSxP','c'=>'#4C1D95'],
    ['x'=>380,'y'=>220,'l'=>'ตั้งค่าระบบ','c'=>'#64748B'],
  ] as $box)
  <rect x="{{ $box['x'] }}" y="{{ $box['y'] }}" width="110" height="52" rx="8" fill="{{ $box['c'] }}" opacity="0.9"/>
  <text x="{{ $box['x']+55 }}" y="{{ $box['y']+30 }}" text-anchor="middle" font-size="9" fill="#fff">{{ $box['l'] }}</text>
  <line x1="260" y1="59" x2="{{ $box['x']+55 }}" y2="{{ $box['y'] }}" stroke="#DDD6FE" stroke-width="1.5"/>
  @endforeach
</svg>
@elseif ($type === 'notification')
<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:400px;height:auto">
  <rect width="400" height="200" rx="12" fill="#FFFBEB" stroke="#FDE68A"/>
  <path d="M320 40 L340 40 L340 55 Q330 65 320 55 Z" fill="#F59E0B"/>
  <circle cx="335" cy="38" r="8" fill="#EF4444"/><text x="335" y="42" text-anchor="middle" font-size="8" fill="#fff">3</text>
  <rect x="240" y="60" width="140" height="120" rx="8" fill="#fff" stroke="#E5E7EB"/>
  <text x="252" y="80" font-size="9" font-weight="bold" fill="#374151">แจ้งเตือน</text>
  <rect x="252" y="88" width="116" height="28" rx="4" fill="#FEF3C7"/>
  <text x="260" y="106" font-size="8" fill="#92400E">หนังสือรอรับทราบ</text>
  <rect x="252" y="122" width="116" height="28" rx="4" fill="#EDE9FE"/>
  <text x="260" y="140" font-size="8" fill="#5B21B6">ใบแจ้งซ่อมใหม่</text>
</svg>
@else
<svg viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:400px;height:auto">
  <rect width="400" height="120" rx="12" fill="#EDE9FE"/>
  <rect x="20" y="30" width="60" height="60" rx="10" fill="#7C3AED" opacity="0.8"/>
  <text x="50" y="68" text-anchor="middle" font-size="24" fill="#fff">📋</text>
  <text x="100" y="55" font-size="14" font-weight="bold" fill="#4C1D95">ระบบงานโรงพยาบาล</text>
  <text x="100" y="78" font-size="10" fill="#6B7280">SMH Hospital Dashboard</text>
</svg>
@endif
