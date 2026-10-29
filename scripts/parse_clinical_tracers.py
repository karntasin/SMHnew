import zipfile
import xml.etree.ElementTree as ET
import sys
import json
import os
import glob
import re

sys.stdout.reconfigure(encoding='utf-8')
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

def get_text(elem):
    return ''.join([t.text for t in elem.iter('{' + ns['w'] + '}t') if t.text]).strip()

def mask_pii(text):
    if not text:
        return text
    # Mask HN patterns like HN 12345, HN: 56-1234, HN000012345
    def mask_hn(match):
        prefix = match.group(1)
        num = match.group(2)
        if len(num) > 2:
            return f"{prefix} {num[:2]}{'*' * (len(num) - 2)}"
        return f"{prefix} **"
    
    masked = re.sub(r'(HN\s*:?\s*)([0-9\-]+)', mask_hn, text, flags=re.IGNORECASE)
    
    # Mask Thai full names e.g. นายสมชาย ใจดี -> นายสมชาย ใ***
    # Patterns like นายสมชาย ใจดี, นางสาวสมศรี มีสุข
    masked = re.sub(
        r'(นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.|ร\.ต\.|ส\.อ\.|จ\.ส\.อ\.|พ\.ต\.)([ก-๙]+)\s+([ก-๙]{1,3})([ก-๙]+)',
        r'\1\2 \3***',
        masked
    )
    return masked

metadata_map = {
    'Sepsis': {
        'code': 'SEPSIS',
        'title': 'ภาวะติดเชื้อในกระแสเลือด (Sepsis / Septic Shock)',
        'subtitle': 'Clinical Tracer Sepsis Management',
        'category': 'emergency',
        'order': 1
    },
    'STEMI': {
        'code': 'STEMI',
        'title': 'กล้ามเนื้อหัวใจขาดเลือดเฉียบพลัน (STEMI Fast Track)',
        'subtitle': 'ST-Elevation Myocardial Infarction',
        'category': 'emergency',
        'order': 2
    },
    'Stroke': {
        'code': 'STROKE',
        'title': 'โรคหลอดเลือดสมอง (Stroke Fast Track)',
        'subtitle': 'Acute Ischemic Stroke & Hemorrhagic Stroke',
        'category': 'emergency',
        'order': 3
    },
    'Heat Stroke': {
        'code': 'HEAT_STROKE',
        'title': 'ภาวะฉุกเฉินจากความร้อนและโรคลมแดด (Heat Stroke)',
        'subtitle': 'Exertional & Classic Heat Stroke in Military & Civilians',
        'category': 'emergency',
        'order': 4
    },
    'HI': {
        'code': 'HEAD_INJURY',
        'title': 'การบาดเจ็บที่ศีรษะ (Head Injury : HI)',
        'subtitle': 'Mild, Moderate and Severe Traumatic Brain Injury',
        'category': 'emergency',
        'order': 5
    },
    'DM': {
        'code': 'DM',
        'title': 'โรคเบาหวาน (Diabetes Mellitus)',
        'subtitle': 'Type 2 DM Prevention, Control & Complications (DKA/HHS)',
        'category': 'chronic',
        'order': 6
    },
    'HT': {
        'code': 'HT',
        'title': 'โรคความดันโลหิตสูง (Hypertension)',
        'subtitle': 'Essential Hypertension & Hypertensive Crisis',
        'category': 'chronic',
        'order': 7
    },
    'ESRD': {
        'code': 'ESRD',
        'title': 'โรคไตวายเรื้อรังระยะสุดท้าย (End Stage Renal Disease)',
        'subtitle': 'Hemodialysis Unit & Vascular Access Care',
        'category': 'chronic',
        'order': 8
    },
    'Pneumonia': {
        'code': 'PNEUMONIA',
        'title': 'โรคปอดอักเสบ (Pneumonia : CAP & HAP)',
        'subtitle': 'Community & Hospital Acquired Pneumonia',
        'category': 'infectious',
        'order': 9
    },
    'TB': {
        'code': 'TB',
        'title': 'วัณโรค (Tuberculosis : Pulmonary & Extrapulmonary)',
        'subtitle': 'TB Screening, DOTS & Infection Control',
        'category': 'infectious',
        'order': 10
    },
    'Dengue': {
        'code': 'DENGUE',
        'title': 'โรคไข้เลือดออก (Dengue Hemorrhagic Fever : DHF)',
        'subtitle': 'Dengue Warning Signs & Fluid Resuscitation Protocol',
        'category': 'infectious',
        'order': 11
    },
    'Influenza': {
        'code': 'INFLUENZA',
        'title': 'โรคไข้หวัดใหญ่ (Influenza / Seasonal Flu)',
        'subtitle': 'Surveillance, Rapid Antigen Testing & Antiviral Protocol',
        'category': 'infectious',
        'order': 12
    },
    'Depression': {
        'code': 'DEPRESSION',
        'title': 'ภาวะซึมเศร้าและความเสี่ยงฆ่าตัวตาย (Depression & 2Q/9Q/8Q)',
        'subtitle': 'Mental Health Screening & Suicide Prevention System',
        'category': 'mental_health',
        'order': 13
    },
}

def parse_clinical_tracer(fpath):
    fname = os.path.basename(fpath)
    disease_key = None
    # Sort keys by length descending so 'Heat Stroke' matches before 'Stroke'
    sorted_keys = sorted(metadata_map.keys(), key=lambda x: len(x), reverse=True)
    for k in sorted_keys:
        if k in fname:
            disease_key = k
            break
    
    if not disease_key:
        print(f"Unknown disease for file: {fname}")
        return None

    meta = metadata_map[disease_key]
    
    with zipfile.ZipFile(fpath) as z:
        root = ET.fromstring(z.read('word/document.xml'))
        body = root.find('w:body', ns)
        
        paragraphs = []
        tables = []
        for child in body:
            tag = child.tag.split('}')[-1]
            if tag == 'p':
                t = get_text(child)
                if t:
                    paragraphs.append(t)
            elif tag == 'tbl':
                rows = []
                for tr in child.findall('w:tr', ns):
                    row_cells = []
                    for tc in tr.findall('w:tc', ns):
                        ps = [get_text(p) for p in tc.findall('w:p', ns) if get_text(p)]
                        row_cells.append(ps)
                    rows.append(row_cells)
                tables.append(rows)

    # Segment paragraphs into 6 standard sections:
    # 1.บริบท, 2.ประเด็นสำคัญ, 3.เป้าหมาย, 4.กระบวนการ, 5.ผลการพัฒนา, 6.แผนการพัฒนา
    sections = {
        'context': [],
        'key_issues': [],
        'goals': [],
        'processes': [],
        'results': [],
        'next_plans': []
    }
    
    current_sec = 'context'
    for p in paragraphs:
        p_clean = p.strip()
        if not p_clean:
            continue
        
        # Check transition
        if any(kw in p_clean for kw in ['1.บริบท', '1. บริบท', '๑. บริบท']):
            current_sec = 'context'
        elif any(kw in p_clean for kw in ['2.ประเด็นสำคัญ', '2. ประเด็นสำคัญ', '๒. ประเด็นสำคัญ', 'ประเด็นสำคัญ/ความเสี่ยง', 'ประเด็นสำคัญ/ ความเสี่ยง']):
            current_sec = 'key_issues'
        elif any(kw in p_clean for kw in ['3.เป้าหมาย', '3. เป้าหมาย', '๓. เป้าหมาย']):
            current_sec = 'goals'
        elif any(kw in p_clean for kw in ['4.กระบวนการ', '4. กระบวนการ', '๔. กระบวนการ', 'กระบวนการเพื่อให้ได้คุณภาพ']):
            current_sec = 'processes'
        elif any(kw in p_clean for kw in ['5.ผลการพัฒนา', '5. ผลการพัฒนา', '๕. ผลการพัฒนา']):
            current_sec = 'results'
        elif any(kw in p_clean for kw in ['6.แผนการพัฒนา', '6. แผนการพัฒนา', '๖. แผนการพัฒนา']):
            current_sec = 'next_plans'
            
        sections[current_sec].append(mask_pii(p_clean))
        
    # Extract KPI Table from tables
    kpi_headers = ['ตัวชี้วัด', 'เป้าหมาย', 'ปี 2565', 'ปี 2566', 'ปี 2567', 'ปี 2568', 'ปี 2569']
    kpi_rows = []
    
    for tbl in tables:
        for r_idx, r in enumerate(tbl):
            if len(r) >= 3:
                row_texts = [' '.join(c).strip() for c in r]
                # Check if it's KPI table
                if any('ตัวชี้วัด' in c or 'ข้อมูล' in c or 'เป้าหมาย' in c for c in row_texts[:2]):
                    kpi_headers = row_texts
                elif any(row_texts):
                    # Data row
                    # Avoid table headers or single note rows
                    if len(row_texts[0]) > 2 and not any(row_texts[0].startswith(x) for x in ['ตัวชี้วัด', 'ข้อมูล', 'สถิติ']):
                        kpi_rows.append({
                            'name': row_texts[0] if len(row_texts) > 0 else '',
                            'target': row_texts[1] if len(row_texts) > 1 else '',
                            'y2565': row_texts[2] if len(row_texts) > 2 else '',
                            'y2566': row_texts[3] if len(row_texts) > 3 else '',
                            'y2567': row_texts[4] if len(row_texts) > 4 else '',
                            'y2568': row_texts[5] if len(row_texts) > 5 else '',
                            'y2569': row_texts[6] if len(row_texts) > 6 else '',
                        })

    # Prepare final item
    item = {
        'code': meta['code'],
        'title': meta['title'],
        'subtitle': meta['subtitle'],
        'category': meta['category'],
        'order': meta['order'],
        'context': '\n\n'.join(sections['context']),
        'key_issues': '\n\n'.join(sections['key_issues']),
        'goals': '\n\n'.join(sections['goals']),
        'processes': '\n\n'.join(sections['processes']),
        'results_analysis': '\n\n'.join(sections['results']),
        'next_plans': '\n\n'.join(sections['next_plans']),
        'kpi_data': {
            'headers': kpi_headers[:7],
            'rows': kpi_rows[:30] # Top 30 clinical indicators
        },
        'status': 'completed',
        'current_version': 1
    }
    return item

files = sorted(glob.glob('excel/Clinical tracer*/**/*.docx', recursive=True))
print(f"Found {len(files)} tracer docx files")

all_tracers = []
for f in files:
    res = parse_clinical_tracer(f)
    if res:
        print(f"Extracted: [{res['code']}] {res['title']} | KPIs: {len(res['kpi_data']['rows'])} | Context len: {len(res['context'])}")
        all_tracers.append(res)

output_path = 'storage/app/clinical_tracers_parsed.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(all_tracers, f, ensure_ascii=False, indent=2)

print(f"Saved {len(all_tracers)} tracers to {output_path}")
