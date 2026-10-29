import { csrfHeaders } from '@/lib/csrf';

export async function downloadDocx(url: string, body?: unknown, fallbackName = 'memo.docx'): Promise<void> {
    const response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ...csrfHeaders(),
        },
        body: JSON.stringify(body ?? {}),
    });

    if (!response.ok) {
        let message = 'ดาวน์โหลดไฟล์ไม่สำเร็จ';
        if (response.status === 419) {
            message = 'เซสชันหมดอายุ กรุณารีเฟรชหน้าแล้วลองใหม่';
        } else {
            try {
                const data = await response.json();
                if (typeof data?.message === 'string' && data.message !== '') {
                    message = data.message;
                }
            } catch {
                // non-JSON body
            }
        }
        throw new Error(message);
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const encoded = disposition.match(/filename\*=(?:UTF-8''|utf-8'')([^;]+)/i)?.[1];
    const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
    const name = encoded ? decodeURIComponent(encoded) : plain || fallbackName;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
}
