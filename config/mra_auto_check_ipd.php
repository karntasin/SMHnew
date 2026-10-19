<?php

/**
 * Mapping หลักฐาน MRA IPD จาก HOSxP
 * mode: มีหลักฐาน = auto ผ่าน
 */
return [
    'mode' => 'evidence_auto_pass',
    'sources' => [
        'dso_1' => ['table' => 'patient', 'field' => 'pname,fname,lname,sex,birthday'],
        'dso_2' => ['table' => 'patient', 'field' => 'cid'],
        'dso_3' => ['table' => 'patient', 'field' => 'addrpart,chwpart'],
        'dso_4' => ['table' => 'patient,ipt', 'field' => 'hn,an'],
        'dso_5' => ['table' => 'ipt', 'field' => 'regdate,dchdate'],

        'dsd_1' => ['table' => 'ovstdiag,iptdiag', 'field' => 'icd10'],
        'dsd_2' => ['table' => 'ovstdiag', 'field' => 'icd10'],
        'dsd_3' => ['table' => 'operation_list', 'field' => 'operation_name'],
        'dsd_4' => ['table' => 'operation_oper_note', 'field' => 'operation_time_start,operation_time_end'],

        'ih_1' => ['table' => 'opdscreen', 'field' => 'cc'],
        'ih_2' => ['table' => 'opdscreen', 'field' => 'hpi,his_*'],
        'ih_3' => ['table' => 'opdscreen', 'field' => 'hpi,help4_note'],
        'ih_4' => ['table' => 'opdscreen,patient_history', 'field' => 'pmh,fh'],
        'ih_5' => ['table' => 'patient,opd_allergy', 'field' => 'drugallergy'],
        'ih_6' => ['table' => 'opdscreen,patient_history', 'field' => 'smoking,drink,vaccine'],
        'ih_7' => ['table' => 'patient_history,opdscreen', 'field' => 'ros,pe'],
        'ih_8' => ['table' => 'ovst,doctor,ovst_doctor_sign', 'field' => 'doctor,sign_datetime'],
        'ih_9' => ['table' => 'opdscreen', 'field' => 'note'],

        'ipe_1' => ['table' => 'opdscreen', 'field' => 'temperature,pulse,rr,bps,bpd'],
        'ipe_2' => ['table' => 'opdscreen', 'field' => 'bw,height'],
        'ipe_3' => ['table' => 'opdscreen', 'field' => 'pe,pe_*'],
        'ipe_5' => ['table' => 'opdscreen', 'field' => 'pe_*'],
        'ipe_6' => ['table' => 'patient_history_pe_visit', 'field' => 'ascessment_detail'],
        'ipe_7' => ['table' => 'ovstdiag', 'field' => 'icd10'],
        'ipe_8' => ['table' => 'patient_history_pe_visit', 'field' => 'plan_of_management'],
        'ipe_9' => ['table' => 'ovst,doctor', 'field' => 'doctor'],

        'ipg_1' => ['table' => 'ovst,opdscreen', 'field' => 'vstdate,vsttime'],
        'ipg_4' => ['table' => 'opitemrece', 'field' => 'icode'],
        'ipg_6' => ['table' => 'lab_order', 'field' => 'lab_order_result'],
        'ipg_8' => ['table' => 'ovst,doctor', 'field' => 'doctor'],
        'ipg_9' => ['table' => 'ovst_doctor_sign', 'field' => 'sign_datetime'],

        'ico_1' => ['table' => 'doctor_consult', 'field' => 'consult_date'],
        'ico_2' => ['table' => 'doctor_consult', 'field' => 'consult_question'],
        'ico_5' => ['table' => 'doctor_consult', 'field' => 'consult_reply'],

        'iic_1' => ['table' => 'patient_consent', 'field' => 'fname,lname,hn'],
        'iic_2' => ['table' => 'patient_consent', 'field' => 'officer_staff'],
        'iic_3' => ['table' => 'patient_consent_sign', 'field' => 'patient_consent_id'],
        'iic_9' => ['table' => 'patient_consent', 'field' => 'patient_consent_date,patient_consent_time'],
    ],
];
