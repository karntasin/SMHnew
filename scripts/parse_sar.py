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

def parse_docx_to_sections(filepath, part_number):
    with zipfile.ZipFile(filepath) as z:
        root = ET.fromstring(z.read('word/document.xml'))
        body = root.find('w:body', ns)
        
        elements = []
        for child in body:
            tag = child.tag.split('}')[-1]
            if tag == 'p':
                t = get_text(child)
                if t:
                    elements.append(('p', t))
            elif tag == 'tbl':
                rows = []
                for tr in child.findall('w:tr', ns):
                    row_cells = []
                    for tc in tr.findall('w:tc', ns):
                        ps = [get_text(p) for p in tc.findall('w:p', ns) if get_text(p)]
                        row_cells.append(ps)
                    rows.append(row_cells)
                elements.append(('tbl', rows))
        
        # Group into sections based on headings like 'I-1', 'II-1', 'III-1', 'IV-1'
        sections = []
        current_section = None
        
        for elem_type, elem_val in elements:
            if elem_type == 'p':
                # Check if heading
                text = elem_val
                is_heading = False
                code = ''
                title = text
                
                # Check matching part
                if part_number == 'I' and re.match(r'^(I-\d+)', text):
                    m = re.match(r'^(I-\d+)', text)
                    code = m.group(1)
                    is_heading = True
                elif part_number == 'II' and re.match(r'^(II-[\d\.\w]+)', text):
                    m = re.match(r'^(II-[\d\.\w]+)', text)
                    code = m.group(1)
                    is_heading = True
                elif part_number == 'III' and re.match(r'^(III-[\d\.\w]+)', text):
                    m = re.match(r'^(III-[\d\.\w]+)', text)
                    code = m.group(1)
                    is_heading = True
                elif part_number == 'IV' and (re.match(r'^(IV-\d+)', text) or 'ตอนที่ IV' in text):
                    if re.match(r'^(IV-\d+)', text):
                        m = re.match(r'^(IV-\d+)', text)
                        code = m.group(1)
                        is_heading = True
                
                if is_heading:
                    current_section = {
                        'code': code,
                        'title': title,
                        'requirement': '',
                        'context': '',
                        'self_assessment_data': [],
                        'process_content': '',
                        'achievements': '',
                        'results_kpi_data': {'headers': [], 'rows': [], 'pdca': ''},
                        'raw_tables': []
                    }
                    sections.append(current_section)
                elif current_section:
                    # Might be additional heading or intro text
                    if not current_section['context'] and ('บริบท' in text or 'สถานการณ์' in text):
                        current_section['context'] += text + '\n'
            
            elif elem_type == 'tbl' and current_section:
                current_section['raw_tables'].append(elem_val)
        
        # Now process raw_tables for each section
        for s in sections:
            all_ps_narrative = []
            kpi_rows = []
            kpi_headers = []
            
            for tbl in s['raw_tables']:
                for r_idx, r in enumerate(tbl):
                    # If single large cell or first cell in table 1, it's narrative
                    if len(r) == 1 or (r_idx == 0 and len(r[0]) > 5):
                        all_ps_narrative.extend(r[0])
                    elif len(r) >= 3:
                        # Probably a KPI table or assessment table
                        row_texts = [' '.join(c).strip() for c in r]
                        if any('ตัวชี้วัด' in c or 'ข้อมูล' in c or 'เป้าหมาย' in c for c in row_texts[:2]):
                            kpi_headers = row_texts
                        else:
                            # It's a data row
                            if any(row_texts):
                                kpi_rows.append({
                                    'name': row_texts[0] if len(row_texts) > 0 else '',
                                    'target': row_texts[1] if len(row_texts) > 1 else '',
                                    'y2565': row_texts[2] if len(row_texts) > 2 else '',
                                    'y2566': row_texts[3] if len(row_texts) > 3 else '',
                                    'y2567': row_texts[4] if len(row_texts) > 4 else '',
                                    'y2568': row_texts[5] if len(row_texts) > 5 else '',
                                    'y2569': row_texts[6] if len(row_texts) > 6 else '',
                                })
            
            # Segment narrative
            req_lines = []
            ctx_lines = []
            assess_lines = []
            proc_lines = []
            achieve_lines = []
            pdca_lines = []
            
            curr_mode = 'req'
            for p in all_ps_narrative:
                p_trim = p.strip()
                if not p_trim:
                    continue
                if any(k in p_trim for k in ['i. บริบท', 'i.บริบท', '๑. บริบท', 'บริบท']):
                    curr_mode = 'ctx'
                elif any(k in p_trim for k in ['Score', 'DALI Gap', 'ตารางประเมินตนเอง']):
                    curr_mode = 'assess'
                elif any(k in p_trim for k in ['ii. กระบวนการ', 'ii.กระบวนการ', '๒. กระบวนการ', 'การปฏิบัติตามมาตรฐาน']):
                    curr_mode = 'proc'
                elif any(k in p_trim for k in ['iii. ผลการพัฒนา', 'iii.ผลการพัฒนา', '๓. ผลการพัฒนา', 'ความภาคภูมิใจ']):
                    curr_mode = 'achieve'
                elif any(k in p_trim for k in ['iv. ผลลัพธ์', 'iv.ผลลัพธ์', '๔. ผลลัพธ์', 'การวิเคราะห์ผลลัพธ์', 'PDCA']):
                    curr_mode = 'pdca'
                
                if curr_mode == 'req':
                    req_lines.append(p_trim)
                elif curr_mode == 'ctx':
                    ctx_lines.append(p_trim)
                elif curr_mode == 'assess':
                    assess_lines.append(p_trim)
                elif curr_mode == 'proc':
                    proc_lines.append(p_trim)
                elif curr_mode == 'achieve':
                    achieve_lines.append(p_trim)
                elif curr_mode == 'pdca':
                    pdca_lines.append(p_trim)
            
            s['requirement'] = '\n'.join(req_lines)
            s['context'] = '\n'.join(ctx_lines)
            s['process_content'] = '\n'.join(proc_lines)
            s['achievements'] = '\n'.join(achieve_lines)
            
            # Build structured self_assessment_data
            assessment_items = []
            if assess_lines:
                assessment_items.append({
                    'criterion': s['title'],
                    'score': '3',
                    'dali_gap': 'L',
                    'issues_and_plans': '\n'.join(assess_lines[:15])
                })
            else:
                assessment_items.append({
                    'criterion': s['title'],
                    'score': '3',
                    'dali_gap': '',
                    'issues_and_plans': ''
                })
            s['self_assessment_data'] = assessment_items
            
            if not kpi_headers:
                kpi_headers = ['ข้อมูล/ตัวชี้วัด', 'เป้าหมาย', 'ปี 2565', 'ปี 2566', 'ปี 2567', 'ปี 2568', 'ปี 2569']
            
            s['results_kpi_data'] = {
                'headers': kpi_headers,
                'rows': kpi_rows,
                'pdca': '\n'.join(pdca_lines)
            }
            
            del s['raw_tables']
            
        return sections

# Run for all 4 parts
part_files = {
    'I': ('ภาพรวมองค์กรและการนำ', glob.glob('excel/SAR*/**/SAR PART I*.docx', recursive=True)),
    'II': ('ระบบงานสำคัญของโรงพยาบาล', glob.glob('excel/SAR*/**/SAR PART II*.docx', recursive=True)),
    'III': ('กระบวนการดูแลผู้ป่วย', glob.glob('excel/SAR*/**/SAR*III*.docx', recursive=True)),
    'IV': ('ผลการดำเนินการ', glob.glob('excel/SAR*/**/SAR Part IV*.docx', recursive=True)),
}

full_data = {
    'year': '2569',
    'title': 'รายงานการประเมินตนเอง SAR ประจำปี 2569 (Re-accreditation ขั้น 3)',
    'hospital_name': 'โรงพยาบาลค่ายสุรสิงหนาท',
    'bed_count': '60 เตียง (เปิดให้บริการจริง 30 เตียง)',
    'parts': []
}

for part_no, (part_name, flist) in part_files.items():
    if not flist:
        print(f'Warning: File for Part {part_no} not found!')
        continue
    fpath = flist[0]
    print(f'Parsing Part {part_no} from {fpath}...')
    sections = parse_docx_to_sections(fpath, part_no)
    print(f'  Found {len(sections)} sections in Part {part_no}')
    full_data['parts'].append({
        'part_number': part_no,
        'part_name': part_name,
        'sections': sections
    })

os.makedirs('storage/app', exist_ok=True)
output_path = 'storage/app/sar_parsed_data.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(full_data, f, ensure_ascii=False, indent=2)

print(f'Successfully exported parsed SAR data to {output_path}')
