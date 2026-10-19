<?php

/**
 * Mapping หลักฐาน MRA OPD/ER จาก HOSxP (evidence-only)
 * อ้างอิง excel/MRA-auto-OPD-er.xlsx
 *
 * mode = evidence_only → API คืน passed=null เสมอ ใส่เฉพาะ value/message
 */
return [
    'mode' => 'evidence_only',
    'min_score_general_er' => 14,
    'min_score_chronic_followup' => 18,
    'sources' => [
        'pp_1' => ['table' => 'patient', 'field' => 'pname,fname,lname,hn,sex,birthday'],
        'pp_2' => ['table' => 'patient', 'field' => 'addrpart,moopart,tmbpart,amppart,chwpart'],
        'pp_3' => ['table' => 'patient', 'field' => 'cid'],
        'pp_4' => ['table' => 'patient,opd_allergy,opdscreen', 'field' => 'drugallergy,agent,found_allergy'],
        'pp_5' => ['table' => 'patient', 'field' => 'informname,informrelation,informtel,informaddr'],
        'pp_6' => ['table' => 'ovst', 'field' => 'vstdate,vsttime'],
        'pp_7' => ['table' => 'patient,ovst', 'field' => 'fname,lname,hn'],
        'pp_bonus_blood' => ['table' => 'patient', 'field' => 'bloodgrp,bloodgroup_rh'],

        'hist_1' => ['table' => 'opdscreen', 'field' => 'cc,symptom'],
        'hist_2' => ['table' => 'opdscreen', 'field' => 'hpi,his_expand'],
        'hist_3' => ['table' => 'opdscreen', 'field' => 'hpi,his_expand,help4_note'],
        'hist_4' => ['table' => 'opdscreen,patient_history', 'field' => 'pmh,fh,chronic_disease_text'],
        'hist_5' => ['table' => 'opdscreen', 'field' => 'menstrual_cycle_type_id,vaccine_screen_type_id,development_screen_type_id'],
        'hist_6' => ['table' => 'patient,opd_allergy,opdscreen', 'field' => 'drugallergy,agent,found_allergy'],
        'hist_7' => ['table' => 'opdscreen,patient_history', 'field' => 'smoking_type_id,drinking_type_id,smoking,drink'],
        'hist_bonus_5w2h' => ['table' => 'opdscreen', 'field' => 'his_begin_date,his_frequency,his_severity,his_cause,his_expand,his_cause_increase,his_cause_decrease,his_related_sign'],

        'pe_1' => ['table' => 'ovst,er_regist', 'field' => 'vstdate,vsttime,enter_er_time,triage_datetime'],
        'pe_2' => ['table' => 'opdscreen', 'field' => 'pe,pe_ga,pe_heent,pe_skin,pe_ext'],
        'pe_3' => ['table' => 'opdscreen', 'field' => 'pe,pe_heart,pe_lung,pe_ab,pe_chest,pe_neuro'],
        'pe_4' => ['table' => 'opdscreen', 'field' => 'pulse,rr,temperature'],
        'pe_5' => ['table' => 'opdscreen', 'field' => 'bps,bpd'],
        'pe_6' => ['table' => 'opdscreen', 'field' => 'bw,height'],
        'pe_7' => ['table' => 'ovstdiag,opdscreen', 'field' => 'icd10,pe'],
        'pe_bonus_diagram' => ['table' => 'opdscreen_pe_img', 'field' => 'vn'],

        'tx_1' => ['table' => 'lab_head,xray_head', 'field' => 'lab_order_number,confirm_report'],
        'tx_2' => ['table' => 'opitemrece', 'field' => 'icode,qty,drugusage'],
        'tx_3' => ['table' => 'opdscreen', 'field' => 'advice1-8,advice7_note'],
        'tx_4' => ['table' => 'oapp', 'field' => 'nextdate'],
        'tx_5' => ['table' => 'doctor_consult', 'field' => 'consult_question,consult_reply'],
        'tx_6' => ['table' => 'ovst,doctor,ovst_doctor_sign', 'field' => 'doctor,sign_datetime'],
        'tx_7' => ['table' => 'ovst_doctor_sign,doctor', 'field' => 'sign_datetime,doctor'],

        'fu1_1' => ['table' => 'opdscreen', 'field' => 'cc,hpi'],
        'fu1_2' => ['table' => 'opdscreen', 'field' => 'hpi,pmh'],
        'fu1_3' => ['table' => 'opdscreen', 'field' => 'bps,bpd,pulse,rr,temperature,pe'],
        'fu1_4' => ['table' => 'opdscreen', 'field' => 'hpi,pe,note'],
        'fu1_5' => ['table' => 'lab_head,xray_head', 'field' => 'lab_order_number'],
        'fu1_6' => ['table' => 'opitemrece', 'field' => 'icode'],
        'fu1_7' => ['table' => 'opdscreen', 'field' => 'advice1-8'],
        'fu1_8' => ['table' => 'oapp', 'field' => 'nextdate'],
        'fu1_9' => ['table' => 'ovst,doctor', 'field' => 'doctor'],

        'fu2_1' => ['table' => 'opdscreen', 'field' => 'cc,hpi'],
        'fu2_2' => ['table' => 'opdscreen', 'field' => 'hpi,pmh'],
        'fu2_3' => ['table' => 'opdscreen', 'field' => 'bps,bpd,pulse,rr,temperature,pe'],
        'fu2_4' => ['table' => 'opdscreen', 'field' => 'hpi,pe,note'],
        'fu2_5' => ['table' => 'lab_head,xray_head', 'field' => 'lab_order_number'],
        'fu2_6' => ['table' => 'opitemrece', 'field' => 'icode'],
        'fu2_7' => ['table' => 'opdscreen', 'field' => 'advice1-8'],
        'fu2_8' => ['table' => 'oapp', 'field' => 'nextdate'],
        'fu2_9' => ['table' => 'ovst,doctor', 'field' => 'doctor'],

        'fu3_1' => ['table' => 'opdscreen', 'field' => 'cc,hpi'],
        'fu3_2' => ['table' => 'opdscreen', 'field' => 'hpi,pmh'],
        'fu3_3' => ['table' => 'opdscreen', 'field' => 'bps,bpd,pulse,rr,temperature,pe'],
        'fu3_4' => ['table' => 'opdscreen', 'field' => 'hpi,pe,note'],
        'fu3_5' => ['table' => 'lab_head,xray_head', 'field' => 'lab_order_number'],
        'fu3_6' => ['table' => 'opitemrece', 'field' => 'icode'],
        'fu3_7' => ['table' => 'opdscreen', 'field' => 'advice1-8'],
        'fu3_8' => ['table' => 'oapp', 'field' => 'nextdate'],
        'fu3_9' => ['table' => 'ovst,doctor', 'field' => 'doctor'],

        'op_1' => ['table' => 'operation_list,patient', 'field' => 'hn,vn,operation_name'],
        'op_2' => ['table' => 'operation_oper_note', 'field' => 'finding_text'],
        'op_3' => ['table' => 'operation_oper_note,operation_list', 'field' => 'operation_text,operation_name'],
        'op_4' => ['table' => 'operation_list', 'field' => 'require_anes,pre_anes_operation_note'],
        'op_5' => ['table' => 'operation_oper_note,operation_list', 'field' => 'post_operative_diag_text,post_diagnosis_text_list'],
        'op_6' => ['table' => 'operation_oper_note,operation_list', 'field' => 'operation_time_start,operation_time_end,enter_date,leave_date'],
        'op_7' => ['table' => 'operation_oper_note', 'field' => 'surgeon_doctor_code'],

        'ic_1' => ['table' => 'patient_consent', 'field' => 'pname,fname,lname,hn,vn'],
        'ic_2' => ['table' => 'patient_consent', 'field' => 'patient_consent_form_id'],
        'ic_3' => ['table' => 'patient_consent', 'field' => 'patient_consent_form_id'],
        'ic_4' => ['table' => 'patient_consent', 'field' => 'status_specify'],
        'ic_5' => ['table' => 'patient_consent_sign', 'field' => 'patient_consent_id'],
        'ic_6' => ['table' => 'patient_consent', 'field' => 'officer_staff'],
        'ic_7' => ['table' => 'patient_consent', 'field' => 'patient_consent_date,patient_consent_time'],
    ],
];
