import React, { useState, useRef, useEffect, useCallback } from 'react';
import RcmLayout from './RcmLayout';
import {
    FileEdit,
    Search,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    Download,
    HardDrive,
    FileText,
    Database,
    Archive,
    History,
    Check,
    ExternalLink,
    Info,
    AlertCircle,
    FolderOpen,
    ChevronDown,
    X,
    Laptop,
    UploadCloud,
    FileCheck2,
} from 'lucide-react';

interface AvailableFolder {
    name: string;
    path: string;
    last_modified: string;
    has_adp: boolean;
    adp_count: number;
    sub_dirs_count: number;
}

interface PatchBatch {
    id: number;
    batch_name: string;
    folder_path: string;
    total_files_modified: number;
    total_records_scanned: number;
    total_records_modified: number;
    backup_path?: string;
    created_at: string;
    creator_name: string;
}

interface PatchItem {
    id?: number;
    file_name: string;
    line_number: number;
    hn: string;
    an?: string;
    dateopd?: string;
    type?: string;
    code?: string;
    qty?: number | string;
    rate?: number | string;
    seq?: string;
    total?: number | string;
    old_use_status: string;
    new_use_status: string;
    raw_line?: string;
}

interface LoadedClientFile {
    name: string;
    handle?: any; // FileSystemFileHandle if available
    file: File;
    relPath: string;
    type: 'TXT' | 'DBF';
    originalContent?: string;
    originalBuffer?: ArrayBuffer;
    patchedContent?: string;
    patchedBuffer?: Uint8Array;
}

interface ScanSummary {
    folder_path: string;
    folder_name: string;
    files: Array<{
        file_name: string;
        file_path: string;
        type: string;
        total_records: number;
        non_empty_use_status: number;
    }>;
    total_records: number;
    issues_count: number;
    items: PatchItem[];
    source?: 'server' | 'client';
}

interface FilePatchProps {
    availableFolders: AvailableFolder[];
    recentBatches: PatchBatch[];
    defaultFolder: string;
}

export default function FilePatch({
    availableFolders = [],
    recentBatches: initialBatches = [],
    defaultFolder = 'E:\\ec\\ECLAIM_14689_20261106080727',
}: FilePatchProps) {
    const [selectedPath, setSelectedPath] = useState<string>(defaultFolder);
    const [targetStatus, setTargetStatus] = useState<string>('1');
    const [isScanning, setIsScanning] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [scanResult, setScanResult] = useState<ScanSummary | null>(null);
    const [recentBatches, setRecentBatches] = useState<PatchBatch[]>(initialBatches);
    const [activeBatchId, setActiveBatchId] = useState<number | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Client-side files loaded
    const [clientDirHandle, setClientDirHandle] = useState<any>(null);
    const [loadedClientFiles, setLoadedClientFiles] = useState<LoadedClientFile[]>([]);
    const [downloadableFiles, setDownloadableFiles] = useState<Array<{ name: string; blob: Blob }>>([]);

    const folderInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // ปิด Dropdown เมื่อคลิกนอกขอบเขต
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // กรองโฟลเดอร์ที่มีอยู่ตามข้อความในช่องค้นหา
    const matchingFolders = availableFolders.filter((f) => {
        if (!selectedPath) return true;
        const q = selectedPath.toLowerCase().trim();
        return f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q);
    });

    const getCsrfToken = () => {
        const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
        return meta ? meta.content : '';
    };

    // ==========================================
    // DBF Parser & Patcher (Browser side)
    // ==========================================
    const parseClientDbf = (buffer: ArrayBuffer, fileName: string, targetVal: string = targetStatus) => {
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);
        if (bytes.length < 32) return { numRecords: 0, items: [], useStatusOffset: -1, headerLen: 0, recordLen: 0 };

        const numRecords = view.getUint32(4, true);
        const headerLen = view.getUint16(8, true);
        const recordLen = view.getUint16(10, true);

        const numFields = Math.floor((headerLen - 33) / 32);
        let currentOffset = 1; // 1 byte deletion flag
        let useStatusOffset = -1;

        for (let i = 0; i < numFields; i++) {
            const descOffset = 32 + (i * 32);
            let name = '';
            for (let j = 0; j < 11; j++) {
                const b = bytes[descOffset + j];
                if (b === 0) break;
                name += String.fromCharCode(b);
            }
            const fieldLen = bytes[descOffset + 16];
            if (name.toUpperCase().trim() === 'USE_STATUS') {
                useStatusOffset = currentOffset;
            }
            currentOffset += fieldLen;
        }

        const items: PatchItem[] = [];
        if (useStatusOffset !== -1) {
            for (let r = 0; r < numRecords; r++) {
                const recStart = headerLen + (r * recordLen);
                const pos = recStart + useStatusOffset;
                const b = bytes[pos];
                const charVal = String.fromCharCode(b);
                // ตรวจสอบแถวที่ use_status ไม่ว่าง และยังไม่เท่ากับค่าเป้าหมาย
                if (b !== 0x20 && b !== 0x00 && charVal !== targetVal) {
                    items.push({
                        file_name: fileName,
                        line_number: r + 1,
                        hn: '',
                        old_use_status: charVal,
                        new_use_status: targetVal,
                    });
                }
            }
        }

        return { numRecords, headerLen, recordLen, useStatusOffset, items };
    };

    // ==========================================
    // TXT Parser & Patcher (Browser side)
    // ==========================================
    const parseClientTxt = (content: string, fileName: string, targetVal: string = targetStatus) => {
        const eol = content.includes('\r\n') ? '\r\n' : '\n';
        const lines = content.split(eol);
        const items: PatchItem[] = [];
        let totalRecords = 0;

        for (let idx = 0; idx < lines.length; idx++) {
            const line = lines[idx].trim();
            if (!line) continue;
            totalRecords++;
            const parts = line.split('|');
            const useStatus = parts[13] ? parts[13].trim() : '';

            // ตรวจสอบบรรทัดที่ use_status ไม่ว่าง และยังไม่ใช่ค่าเป้าหมาย
            if (useStatus !== '' && useStatus !== targetVal) {
                items.push({
                    file_name: fileName,
                    line_number: idx + 1,
                    hn: parts[0] || '',
                    an: parts[1] || '',
                    dateopd: parts[2] || '',
                    type: parts[3] || '',
                    code: parts[4] || '',
                    qty: parts[5] || '',
                    rate: parts[6] || '',
                    seq: parts[7] || '',
                    old_use_status: useStatus,
                    new_use_status: targetVal,
                    total: parts[14] || '',
                    raw_line: line,
                });
            }
        }

        return { totalRecords, items, eol };
    };

    // ==========================================
    // Process Client Files (Core scanning engine)
    // ==========================================
    const processFoundClientFiles = async (files: LoadedClientFile[], folderLabel: string, targetVal: string = targetStatus) => {
        setIsScanning(true);
        setErrorMessage(null);
        setSuccessMessage(null);
        setDownloadableFiles([]);

        try {
            const filesSummary: Array<{
                file_name: string;
                file_path: string;
                type: string;
                total_records: number;
                non_empty_use_status: number;
            }> = [];

            let totalRecords = 0;
            let allItems: PatchItem[] = [];

            for (const item of files) {
                if (item.type === 'TXT') {
                    const text = item.originalContent || (await item.file.text());
                    item.originalContent = text;
                    const parsed = parseClientTxt(text, item.name, targetVal);
                    filesSummary.push({
                        file_name: item.name,
                        file_path: item.relPath || item.name,
                        type: 'TXT',
                        total_records: parsed.totalRecords,
                        non_empty_use_status: parsed.items.length,
                    });
                    totalRecords = Math.max(totalRecords, parsed.totalRecords);
                    if (allItems.length === 0 || item.name.toUpperCase() === 'ADP.TXT') {
                        allItems = parsed.items;
                    }
                } else if (item.type === 'DBF') {
                    const buffer = item.originalBuffer || (await item.file.arrayBuffer());
                    item.originalBuffer = buffer;
                    const parsed = parseClientDbf(buffer, item.name, targetVal);
                    filesSummary.push({
                        file_name: item.name,
                        file_path: item.relPath || item.name,
                        type: 'DBF',
                        total_records: parsed.numRecords,
                        non_empty_use_status: parsed.items.length,
                    });
                    if (allItems.length === 0) {
                        allItems = parsed.items;
                    }
                }
            }

            setLoadedClientFiles(files);
            setSelectedPath(folderLabel);

            setScanResult({
                folder_path: `[เครื่องของคุณ] ${folderLabel}`,
                folder_name: folderLabel,
                files: filesSummary,
                total_records: totalRecords,
                issues_count: allItems.length,
                items: allItems,
                source: 'client',
            });

            const targetLabel = targetVal === '1' ? '1 (ใช้ครั้งเดียว)' : (targetVal || 'ค่าว่าง');
            if (allItems.length === 0) {
                setSuccessMessage(
                    `ตรวจสอบแฟ้มบนเครื่องแล้ว: ข้อมูลตรงตามข้อกำหนดเรียบร้อยแล้ว (ไม่พบรายการที่ต้องปรับเป็น ${targetLabel})`
                );
            } else {
                setSuccessMessage(
                    `สแกนแฟ้มบนเครื่องสำเร็จ: พบรายการที่ต้องปรับเป็น ${targetLabel} จำนวน ${allItems.length} รายการ กดปุ่ม "ปรับปรุงแฟ้ม & บันทึก" เพื่อแก้ไขไฟล์ได้ทันที`
                );
            }
        } catch (err: any) {
            setErrorMessage(`เกิดข้อผิดพลาดในการอ่านไฟล์บนเครื่อง: ${err.message}`);
        } finally {
            setIsScanning(false);
        }
    };

    // ==========================================
    // Recursive File System Access API Scanner
    // ==========================================
    const scanDirHandleRecursively = async (dirHandle: any, currentPath = '', maxDepth = 3): Promise<LoadedClientFile[]> => {
        if (maxDepth <= 0) return [];
        const results: LoadedClientFile[] = [];

        // Support both values() and entries()
        const entries: any[] = [];
        if (typeof dirHandle.values === 'function') {
            for await (const handle of dirHandle.values()) {
                entries.push(handle);
            }
        } else if (typeof dirHandle.entries === 'function') {
            for await (const [, handle] of dirHandle.entries()) {
                entries.push(handle);
            }
        }

        for (const handle of entries) {
            const name = handle.name;
            const itemPath = currentPath ? `${currentPath}/${name}` : name;

            if (handle.kind === 'file') {
                const uName = name.toUpperCase();
                if (uName.startsWith('ADP') && (uName.endsWith('.TXT') || uName.endsWith('.DBF'))) {
                    const ext = uName.endsWith('.TXT') ? 'TXT' : 'DBF';
                    const file = await handle.getFile();
                    results.push({
                        name,
                        handle,
                        file,
                        relPath: itemPath,
                        type: ext,
                    });
                }
            } else if (handle.kind === 'directory' && !name.startsWith('backup_')) {
                // ค้นหาลึกลงไปในโฟลเดอร์ย่อย
                const subResults = await scanDirHandleRecursively(handle, itemPath, maxDepth - 1);
                results.push(...subResults);
            }
        }

        return results;
    };

    // ==========================================
    // 1. กดปุ่ม "เลือกแฟ้มบนคอม..."
    // ==========================================
    const handleBrowseComputer = async () => {
        // 1. ลองใช้ File System Access API
        if ('showDirectoryPicker' in window) {
            try {
                const dirHandle = await (window as any).showDirectoryPicker();
                if (dirHandle) {
                    setClientDirHandle(dirHandle);
                    setIsScanning(true);
                    setErrorMessage(null);

                    const foundFiles = await scanDirHandleRecursively(dirHandle, dirHandle.name);
                    if (foundFiles.length === 0) {
                        setErrorMessage(
                            `ไม่พบแฟ้ม ADP (.txt หรือ .dbf) ในโฟลเดอร์ "${dirHandle.name}" (กรุณาตรวจสอบว่ามีแฟ้ม ADP หรือโฟลเดอร์ถูกต้อง)`
                        );
                        setIsScanning(false);
                        return;
                    }

                    await processFoundClientFiles(foundFiles, dirHandle.name);
                    return;
                }
            } catch (err: any) {
                if (err.name === 'AbortError') return;
                // fallback to folder input
            }
        }

        // 2. Fallback ใช้ HTML5 folder input
        folderInputRef.current?.click();
    };

    // ==========================================
    // 2. Fallback HTML5 folder input
    // ==========================================
    const handleFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const fileArr = Array.from(files);

        let folderName = 'Selected_Folder';
        const foundFiles: LoadedClientFile[] = [];

        for (const file of fileArr) {
            const relPath = file.webkitRelativePath || file.name;
            if (file.webkitRelativePath) {
                folderName = file.webkitRelativePath.split('/')[0];
            }
            const uName = file.name.toUpperCase();
            if (uName.startsWith('ADP') && (uName.endsWith('.TXT') || uName.endsWith('.DBF'))) {
                foundFiles.push({
                    name: file.name,
                    file,
                    relPath,
                    type: uName.endsWith('.TXT') ? 'TXT' : 'DBF',
                });
            }
        }

        if (foundFiles.length === 0) {
            setErrorMessage(`ไม่พบแฟ้ม ADP ในโฟลเดอร์ที่เลือก (${fileArr.length} ไฟล์ที่พบไม่มีชื่อขึ้นต้นด้วย ADP)`);
            return;
        }

        setClientDirHandle(null);
        await processFoundClientFiles(foundFiles, folderName);
    };

    // ==========================================
    // 3. ปุ่มเลือกเฉพาะไฟล์ ADP (.txt / .dbf) โดยตรง
    // ==========================================
    const handleDirectFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const fileArr = Array.from(files);

        const foundFiles: LoadedClientFile[] = [];
        for (const file of fileArr) {
            const uName = file.name.toUpperCase();
            const ext = uName.endsWith('.DBF') ? 'DBF' : 'TXT';
            foundFiles.push({
                name: file.name,
                file,
                relPath: file.name,
                type: ext,
            });
        }

        setClientDirHandle(null);
        await processFoundClientFiles(foundFiles, 'แฟ้ม ADP ที่เลือก');
    };

    // ==========================================
    // 4. Drag & Drop Handling
    // ==========================================
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const items = e.dataTransfer.items;
        const files = e.dataTransfer.files;
        if ((!items || items.length === 0) && (!files || files.length === 0)) return;

        const foundFiles: LoadedClientFile[] = [];
        let folderName = 'แฟ้มที่ลากวาง';

        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const uName = file.name.toUpperCase();
                if (uName.startsWith('ADP') || uName.endsWith('.TXT') || uName.endsWith('.DBF')) {
                    const ext = uName.endsWith('.DBF') ? 'DBF' : 'TXT';
                    foundFiles.push({
                        name: file.name,
                        file,
                        relPath: file.name,
                        type: ext,
                    });
                }
            }
        }

        if (foundFiles.length === 0) {
            setErrorMessage('กรุณาลากแฟ้ม ADP (.txt หรือ .dbf) หรือโฟลเดอร์ e-Claim มาวาง');
            return;
        }

        setClientDirHandle(null);
        await processFoundClientFiles(foundFiles, folderName);
    }, []);

    // ==========================================
    // 5. ปรับแก้และบันทึกไฟล์ (Client Patch & Save + Download)
    // ==========================================
    const executeClientPatch = async () => {
        if (loadedClientFiles.length === 0) return;

        setIsExecuting(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        try {
            let inPlaceWriteCount = 0;
            const downloads: Array<{ name: string; blob: Blob }> = [];

            for (const item of loadedClientFiles) {
                if (item.type === 'TXT') {
                    const text = item.originalContent || (await item.file.text());
                    const eol = text.includes('\r\n') ? '\r\n' : '\n';
                    const lines = text.split(eol);

                    for (let idx = 0; idx < lines.length; idx++) {
                        const line = lines[idx].trim();
                        if (!line) continue;
                        const parts = line.split('|');
                        if (parts[13] && parts[13].trim() !== '' && parts[13].trim() !== targetStatus) {
                            parts[13] = targetStatus;
                            lines[idx] = parts.join('|');
                        }
                    }

                    const patchedText = lines.join(eol);
                    const blob = new Blob([patchedText], { type: 'text/plain;charset=windows-874' });
                    downloads.push({ name: item.name, blob });

                    // ลองเขียนทับไฟล์เดิมถ้ามี handle
                    if (item.handle) {
                        try {
                            const writable = await item.handle.createWritable();
                            await writable.write(patchedText);
                            await writable.close();
                            inPlaceWriteCount++;
                        } catch (e) {
                            // permission rejected -> will use download
                        }
                    }
                } else if (item.type === 'DBF') {
                    const buffer = item.originalBuffer || (await item.file.arrayBuffer());
                    const parsed = parseClientDbf(buffer, item.name, targetStatus);
                    const bytes = new Uint8Array(buffer);
                    const targetByte = targetStatus !== '' ? targetStatus.charCodeAt(0) : 0x20;

                    if (parsed.useStatusOffset !== -1) {
                        for (let r = 0; r < parsed.numRecords; r++) {
                            const pos = parsed.headerLen + (r * parsed.recordLen) + parsed.useStatusOffset;
                            if (bytes[pos] !== 0x20 && bytes[pos] !== 0x00 && bytes[pos] !== targetByte) {
                                bytes[pos] = targetByte;
                            }
                        }
                    }

                    const blob = new Blob([bytes], { type: 'application/octet-stream' });
                    downloads.push({ name: item.name, blob });

                    if (item.handle) {
                        try {
                            const writable = await item.handle.createWritable();
                            await writable.write(bytes);
                            await writable.close();
                            inPlaceWriteCount++;
                        } catch (e) {
                            // will use download
                        }
                    }
                }
            }

            setDownloadableFiles(downloads);

            // ส่งข้อมูลสรุปไปบันทึกลง MySQL Database (Audit Log)
            const patchedItems = scanResult?.items || [];
            try {
                const res = await fetch(route('rcm.file-patch.log-client-batch'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken(),
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({
                        batch_name: scanResult?.folder_name || 'Client_Folder',
                        folder_path: scanResult?.folder_path || '[Client]',
                        target_value: targetStatus,
                        total_files_modified: loadedClientFiles.length,
                        total_records_scanned: scanResult?.total_records || 0,
                        total_records_modified: patchedItems.length,
                        backup_path: null,
                        items: patchedItems.map((it) => ({
                            ...it,
                            new_use_status: targetStatus,
                        })),
                    }),
                });

                const json = await res.json();
                if (json.success && json.batch_id) {
                    setActiveBatchId(json.batch_id);
                }
            } catch (e) {
                // log fail silent
            }

            const targetLabel = targetStatus === '1' ? '1 (ใช้ครั้งเดียว)' : (targetStatus || 'ค่าว่าง');
            // แจ้งข้อความสำเร็จ
            if (inPlaceWriteCount > 0) {
                setSuccessMessage(
                    `ปรับปรุงแฟ้มสำเร็จ! ได้บันทึกทับไฟล์เดิมบนเครื่องจำนวน ${inPlaceWriteCount} แฟ้ม (ปรับ use_status เป็น ${targetLabel} จำนวน ${patchedItems.length} รายการ) เรียบร้อยแล้ว`
                );
            } else {
                setSuccessMessage(
                    `ปรับปรุงข้อมูลสำเร็จ! ปรับ use_status เป็น ${targetLabel} จำนวน ${patchedItems.length} รายการ กรุณากดปุ่ม "ดาวน์โหลดแฟ้มที่แก้ไขแล้ว" ด้านล่างเพื่อนำไฟล์ไปวางทับในเครื่อง`
                );
                // ดาวน์โหลดไฟล์อัตโนมัติให้ผู้ใช้ทันที
                triggerAutoDownload(downloads);
            }

            if (scanResult) {
                setScanResult({
                    ...scanResult,
                    issues_count: 0,
                    items: patchedItems.map((it) => ({
                        ...it,
                        new_use_status: targetStatus,
                    })),
                });
            }

            fetchHistory();
        } catch (err: any) {
            setErrorMessage(`เกิดข้อผิดพลาดในการปรับแก้แฟ้ม: ${err.message}`);
        } finally {
            setIsExecuting(false);
        }
    };

    // ดาวน์โหลดไฟล์
    const triggerAutoDownload = (files: Array<{ name: string; blob: Blob }>) => {
        files.forEach((f, idx) => {
            setTimeout(() => {
                const url = URL.createObjectURL(f.blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = f.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, idx * 250);
        });
    };

    // ==========================================
    // 6. Scan & Execute บน Server (กรณีเลือก path Server)
    // ==========================================
    const handleScan = async (pathOverride?: string) => {
        const target = pathOverride || selectedPath;
        if (!target.trim()) {
            setErrorMessage('กรุณาระบุที่อยู่โฟลเดอร์');
            return;
        }

        // หากมี client files โหลดไว้อยู่แล้ว
        if (loadedClientFiles.length > 0 && target.includes(scanResult?.folder_name || '')) {
            await processFoundClientFiles(loadedClientFiles, scanResult?.folder_name || 'แฟ้มบนเครื่อง', targetStatus);
            return;
        }

        setIsScanning(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        try {
            const res = await fetch(route('rcm.file-patch.scan'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    Accept: 'application/json',
                },
                body: JSON.stringify({ folder_path: target, target_value: targetStatus }),
            });

            const json = await res.json();
            if (json.success) {
                setScanResult({ ...json.data, source: 'server' });
                setClientDirHandle(null);
                setLoadedClientFiles([]);
                const targetLabel = targetStatus === '1' ? '1 (ใช้ครั้งเดียว)' : (targetStatus || 'ค่าว่าง');
                if (json.data.issues_count === 0) {
                    setSuccessMessage(`ตรวจสอบแล้ว: ไม่พบรายการที่ต้องแก้ไข (use_status เป็น ${targetLabel} เรียบร้อยแล้ว)`);
                }
            } else {
                setErrorMessage(json.message || 'เกิดข้อผิดพลาดในการตรวจสอบแฟ้ม');
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้');
        } finally {
            setIsScanning(false);
        }
    };

    const handleExecutePatch = async () => {
        setShowConfirmModal(false);
        if (!selectedPath.trim()) return;

        // หากเป็นไฟล์บนเครื่องผู้ใช้
        if (loadedClientFiles.length > 0) {
            await executeClientPatch();
            return;
        }

        setIsExecuting(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        try {
            const res = await fetch(route('rcm.file-patch.execute'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    Accept: 'application/json',
                },
                body: JSON.stringify({ folder_path: selectedPath, target_value: targetStatus }),
            });

            const json = await res.json();
            if (json.success) {
                const targetLabel = targetStatus === '1' ? '1 (ใช้ครั้งเดียว)' : (targetStatus || 'ค่าว่าง');
                setSuccessMessage(
                    `ปรับปรุงแฟ้มสำเร็จ! ปรับ use_status เป็น ${targetLabel} จำนวน ${json.data.total_records_modified} รายการ เรียบร้อยแล้ว`
                );
                setActiveBatchId(json.data.batch_id);

                if (scanResult) {
                    setScanResult({
                        ...scanResult,
                        issues_count: 0,
                        items: json.data.items.map((it: PatchItem) => ({
                            ...it,
                            new_use_status: targetStatus,
                        })),
                    });
                }

                fetchHistory();
            } else {
                setErrorMessage(json.message || 'เกิดข้อผิดพลาดในการปรับปรุงแฟ้ม');
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการส่งคำสั่ง');
        } finally {
            setIsExecuting(false);
        }
    };

    const handleViewBatch = async (batchId: number) => {
        try {
            setIsScanning(true);
            setErrorMessage(null);
            const res = await fetch(route('rcm.file-patch.batch-items', { batchId }));
            const json = await res.json();
            if (json.success) {
                setActiveBatchId(batchId);
                setClientDirHandle(null);
                setLoadedClientFiles([]);
                setDownloadableFiles([]);
                setScanResult({
                    folder_path: json.batch.folder_path,
                    folder_name: json.batch.batch_name,
                    files: [
                        {
                            file_name: 'ADP.txt / ADP.dbf',
                            file_path: json.batch.folder_path,
                            type: 'ALL',
                            total_records: json.batch.total_records_scanned,
                            non_empty_use_status: json.batch.total_records_modified,
                        },
                    ],
                    total_records: json.batch.total_records_scanned,
                    issues_count: json.batch.total_records_modified,
                    items: json.items,
                    source: 'server',
                });
                setSelectedPath(json.batch.folder_path);
            }
        } catch (err: any) {
            setErrorMessage('ไม่สามารถโหลดข้อมูลประวัติได้');
        } finally {
            setIsScanning(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await fetch(route('rcm.file-patch.index'), {
                headers: { Accept: 'application/json' },
            });
        } catch (e) {
            // silent
        }
    };

    const filteredItems = (scanResult?.items || []).filter((item) => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
            item.hn?.toLowerCase().includes(q) ||
            item.code?.toLowerCase().includes(q) ||
            item.seq?.toLowerCase().includes(q) ||
            item.file_name?.toLowerCase().includes(q)
        );
    });

    return (
        <RcmLayout title="ปรับปรุงแฟ้ม (New E-Claim)" active="file-patch">
            <div className="space-y-6">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-teal-700/40 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-6 -mr-6 w-56 h-56 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                        <div className="space-y-1">
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                                <FileEdit className="w-3.5 h-3.5" />
                                <span>New E-Claim ADP Auto-Patcher & Audit Log</span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                                ระบบปรับปรุงแฟ้มส่งออก (ADP - ปรับ use_status)
                            </h2>
                            <p className="text-sm text-teal-100/80 max-w-2xl">
                                ระบบตรวจสอบและปรับแก้ค่า{' '}
                                <code className="text-emerald-300 font-mono bg-slate-900/40 px-1 py-0.5 rounded">
                                    use_status
                                </code>{' '}
                                ในแฟ้ม ADP ให้เป็น 1 (ใช้ครั้งเดียว / Single-use) ตามระเบียบ e-Claim รองรับการทำงานจากทุกเครื่องคอมพิวเตอร์
                            </p>
                        </div>

                        {activeBatchId && (
                            <a
                                href={route('rcm.file-patch.export', { batchId: activeBatchId })}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-emerald-900 hover:bg-emerald-50 transition-all shadow-md hover:shadow-lg self-start md:self-auto cursor-pointer"
                            >
                                <Download className="w-4 h-4 text-emerald-700" />
                                <span>ดาวน์โหลดรายงาน (CSV)</span>
                            </a>
                        )}
                    </div>
                </div>

                {/* Notifications */}
                {successMessage && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 shadow-xs">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                        <div className="text-sm font-medium space-y-2">
                            <div>{successMessage}</div>
                            {downloadableFiles.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    {downloadableFiles.map((df, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => triggerAutoDownload([df])}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition cursor-pointer"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            <span>ดาวน์โหลด {df.name} ที่แก้ไขแล้ว</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {errorMessage && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 shadow-xs">
                        <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                        <div className="text-sm font-medium">{errorMessage}</div>
                    </div>
                )}

                {/* Section 1: Single Unified Search & Computer Browse Card with Drag & Drop */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`bg-white rounded-2xl border transition-all p-5 shadow-xs space-y-4 ${
                        isDragging ? 'border-emerald-500 ring-4 ring-emerald-500/10 bg-emerald-50/20' : 'border-slate-200/80'
                    }`}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                            <HardDrive className="w-4 h-4 text-emerald-600" />
                            <span>ค้นหาและเลือกแฟ้มข้อมูล New E-Claim</span>
                            {loadedClientFiles.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                    <Laptop className="w-3 h-3" />
                                    {loadedClientFiles.length} แฟ้มบนเครื่องของคุณ
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-slate-500">
                            ไดเรกทอรีบนเซิร์ฟเวอร์:{' '}
                            <code className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                                E:\ec\
                            </code>
                        </span>
                    </div>

                    {/* Hidden inputs */}
                    <input
                        type="file"
                        ref={folderInputRef}
                        onChange={handleFolderInputChange}
                        // @ts-ignore
                        webkitdirectory=""
                        directory=""
                        multiple
                        className="hidden"
                    />
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleDirectFilesChange}
                        accept=".txt,.dbf"
                        multiple
                        className="hidden"
                    />

                    {/* Controls Row */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
                        {/* ปุ่มเลือกโฟลเดอร์บนคอม */}
                        <button
                            type="button"
                            onClick={handleBrowseComputer}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 shadow-2xs transition cursor-pointer shrink-0"
                            title="เลือกโฟลเดอร์แฟ้ม e-Claim จากเครื่องคอมพิวเตอร์ของคุณ"
                        >
                            <FolderOpen className="w-4 h-4 text-emerald-600" />
                            <span>เลือกโฟลเดอร์บนคอม...</span>
                        </button>

                        {/* ปุ่มเลือกไฟล์ ADP โดยตรง */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs transition cursor-pointer shrink-0"
                            title="เลือกไฟล์ ADP.txt หรือ ADP.dbf โดยตรงจากเครื่อง"
                        >
                            <FileCheck2 className="w-3.5 h-3.5 text-slate-600" />
                            <span>เลือกไฟล์ตรง...</span>
                        </button>

                        {/* ช่องค้นหาช่องเดียว (Single Unified Search Input with Auto-complete Dropdown) */}
                        <div className="relative flex-1" ref={dropdownRef}>
                            <div className="relative flex items-center">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                                <input
                                    type="text"
                                    value={selectedPath}
                                    onChange={(e) => {
                                        setSelectedPath(e.target.value);
                                        setClientDirHandle(null);
                                        setLoadedClientFiles([]);
                                        setShowDropdown(true);
                                        setScanResult(null);
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    placeholder="พิมพ์ค้นหาชื่อแฟ้ม หรือระบุโฟลเดอร์ เช่น E:\ec\ECLAIM_14689_..."
                                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl pl-9.5 pr-16 py-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                                />

                                <div className="absolute right-2 flex items-center gap-1">
                                    {selectedPath && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedPath('');
                                                setClientDirHandle(null);
                                                setLoadedClientFiles([]);
                                                setScanResult(null);
                                            }}
                                            className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition cursor-pointer"
                                            title="ล้างข้อความ"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowDropdown(!showDropdown)}
                                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition cursor-pointer"
                                        title="แสดงรายชื่อโฟลเดอร์บนเซิร์ฟเวอร์"
                                    >
                                        <ChevronDown
                                            className={`w-3.5 h-3.5 transition-transform ${
                                                showDropdown ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Dropdown Suggestions List */}
                            {showDropdown && matchingFolders.length > 0 && (
                                <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 bg-slate-50/90 sticky top-0 flex justify-between">
                                        <span>โฟลเดอร์ที่พบบนเซิร์ฟเวอร์ E:\ec\ ({matchingFolders.length} โฟลเดอร์)</span>
                                        <span>คลิกเพื่อเลือก</span>
                                    </div>
                                    {matchingFolders.map((f) => (
                                        <div
                                            key={f.path}
                                            onClick={() => {
                                                setSelectedPath(f.path);
                                                setClientDirHandle(null);
                                                setLoadedClientFiles([]);
                                                setShowDropdown(false);
                                                handleScan(f.path);
                                            }}
                                            className={`px-3 py-2 text-xs flex items-center justify-between hover:bg-emerald-50/80 cursor-pointer transition ${
                                                selectedPath === f.path
                                                    ? 'bg-emerald-50 text-emerald-900 font-bold'
                                                    : 'text-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <HardDrive className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                <span className="font-mono truncate">{f.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                                    {f.adp_count} แฟ้ม ADP
                                                </span>
                                                <span className="text-[11px] text-slate-400">{f.last_modified}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ปุ่มตรวจสอบแฟ้ม */}
                        <button
                            type="button"
                            onClick={() => handleScan()}
                            disabled={isScanning || isExecuting || !selectedPath.trim()}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition disabled:opacity-50 cursor-pointer shrink-0"
                        >
                            <Search className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                            <span>{isScanning ? 'กำลังตรวจสอบ...' : 'ตรวจสอบแฟ้ม'}</span>
                        </button>

                        {/* ปุ่มปรับปรุงแฟ้ม & บันทึก */}
                        <button
                            type="button"
                            onClick={() => setShowConfirmModal(true)}
                            disabled={isScanning || isExecuting || !selectedPath.trim()}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition disabled:opacity-50 cursor-pointer shrink-0"
                        >
                            <Check className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
                            <span>{isExecuting ? 'กำลังปรับแก้...' : 'ปรับปรุงแฟ้ม & บันทึก'}</span>
                        </button>
                    </div>

                    {/* Target Status Selector Toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">กำหนดค่า use_status เป้าหมาย:</span>
                            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTargetStatus('1');
                                        if (scanResult) setScanResult(null);
                                    }}
                                    className={`px-3 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                                        targetStatus === '1'
                                            ? 'bg-emerald-600 text-white shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    1 (ใช้ครั้งเดียว - แนะนำ)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTargetStatus('');
                                        if (scanResult) setScanResult(null);
                                    }}
                                    className={`px-3 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                                        targetStatus === ''
                                            ? 'bg-emerald-600 text-white shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    (ค่าว่าง / ลบออก)
                                </button>
                            </div>
                        </div>
                        <span className="text-[11px] text-slate-400">
                            * มาตรฐาน New E-Claim กำหนดเวชภัณฑ์ใช้ครั้งเดียวเป็นรหัส 1
                        </span>
                    </div>

                    {/* Drag & Drop Visual Hint */}
                    <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 bg-slate-50/80 rounded-xl p-2.5 border border-dashed border-slate-300 gap-2">
                        <div className="flex items-center gap-2">
                            <UploadCloud className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                                <strong>ลากโฟลเดอร์หรือไฟล์ ADP มาวางที่นี่ได้ทันที</strong> (หรือกด <em>"เลือกโฟลเดอร์บนคอม..."</em>) ระบบจะค้นหาและดึงแฟ้ม ADP จากทุกโฟลเดอร์ย่อยให้อัตโนมัติ
                            </span>
                        </div>
                        {downloadableFiles.length > 0 && (
                            <button
                                type="button"
                                onClick={() => triggerAutoDownload(downloadableFiles)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 hover:bg-emerald-100 px-2 py-1 rounded-lg transition"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>ดาวน์โหลดไฟล์ที่แก้แล้ว</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Section 2: Summary KPIs */}
                {scanResult && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-medium">แฟ้ม ADP ในโฟลเดอร์</div>
                                <div className="text-lg font-black text-slate-900">
                                    {scanResult.files.length}{' '}
                                    <span className="text-xs font-normal text-slate-500">แฟ้ม</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                            <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
                                <Database className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-medium">จำนวนรายการทั้งหมด</div>
                                <div className="text-lg font-black text-slate-900">
                                    {scanResult.total_records.toLocaleString()}{' '}
                                    <span className="text-xs font-normal text-slate-500">แถว</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                            <div
                                className={`p-3 rounded-xl ${
                                    scanResult.issues_count > 0
                                        ? 'bg-amber-50 text-amber-600'
                                        : 'bg-emerald-50 text-emerald-600'
                                }`}
                            >
                                {scanResult.issues_count > 0 ? (
                                    <AlertTriangle className="w-5 h-5" />
                                ) : (
                                    <ShieldCheck className="w-5 h-5" />
                                )}
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-medium">
                                    use_status ที่ไม่ใช่ {targetStatus || 'ค่าว่าง'} (ต้องปรับ)
                                </div>
                                <div
                                    className={`text-lg font-black ${
                                        scanResult.issues_count > 0 ? 'text-amber-600' : 'text-emerald-600'
                                    }`}
                                >
                                    {scanResult.issues_count.toLocaleString()}{' '}
                                    <span className="text-xs font-normal text-slate-500">รายการ</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 font-medium">รูปแบบการปรับปรุง</div>
                                <div className="text-xs font-bold text-emerald-700">เขียนทับไฟล์โดยตรง</div>
                                <div className="text-[11px] text-slate-400">ไม่สร้างไฟล์สำรอง (No Backup)</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Section 3: Detailed Findings & Report Table */}
                {scanResult && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <FileEdit className="w-4 h-4 text-emerald-600" />
                                <h3 className="text-sm font-bold text-slate-900">
                                    รายงานรายการที่ตรวจพบ / ปรับปรุงค่า use_status
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                                    {filteredItems.length} รายการ
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="ค้นหา HN, SEQ, รหัส..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition w-48 sm:w-64"
                                    />
                                </div>

                                {activeBatchId && (
                                    <a
                                        href={route('rcm.file-patch.export', { batchId: activeBatchId })}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 transition"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Export CSV</span>
                                    </a>
                                )}
                            </div>
                        </div>

                        {filteredItems.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 space-y-2">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                                <div className="text-sm font-semibold text-slate-700">
                                    ไม่พบรายการที่ use_status มีค่าในแฟ้มนี้
                                </div>
                                <div className="text-xs text-slate-400">
                                    ข้อมูลในแฟ้มมีความถูกต้องและ use_status เป็นค่าว่างทั้งหมดแล้ว
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                                        <tr>
                                            <th className="py-3 px-3 w-12 text-center">#</th>
                                            <th className="py-3 px-3">แฟ้ม</th>
                                            <th className="py-3 px-3 text-center">บรรทัด</th>
                                            <th className="py-3 px-3 font-mono">HN</th>
                                            <th className="py-3 px-3">วันที่ (DATEOPD)</th>
                                            <th className="py-3 px-3">หมวด</th>
                                            <th className="py-3 px-3">รหัส (CODE)</th>
                                            <th className="py-3 px-3 text-right">จำนวน</th>
                                            <th className="py-3 px-3 text-right">ราคา</th>
                                            <th className="py-3 px-3 text-right">รวมเงิน</th>
                                            <th className="py-3 px-3 font-mono">SEQ</th>
                                            <th className="py-3 px-3 text-center">use_status เดิม</th>
                                            <th className="py-3 px-3 text-center">use_status ใหม่</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                        {filteredItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/80 transition">
                                                <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                                                    {item.file_name}
                                                </td>
                                                <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                                                    {item.line_number}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                                    {item.hn || '-'}
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-600">{item.dateopd || '-'}</td>
                                                <td className="py-2.5 px-3">
                                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                                        {item.type || '-'}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                                                    {item.code || '-'}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono">
                                                    {typeof item.qty === 'number'
                                                        ? item.qty.toLocaleString()
                                                        : item.qty || '-'}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono">
                                                    {typeof item.rate === 'number'
                                                        ? item.rate.toLocaleString(undefined, {
                                                              minimumFractionDigits: 2,
                                                          })
                                                        : item.rate || '-'}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                                    {typeof item.total === 'number'
                                                        ? item.total.toLocaleString(undefined, {
                                                              minimumFractionDigits: 2,
                                                          })
                                                        : item.total || '-'}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                                                    {item.seq || '-'}
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
                                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                        {item.old_use_status}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
                                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                        {item.new_use_status || '(ค่าว่าง)'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Section 4: History Table */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <History className="w-4 h-4 text-teal-600" />
                            <h3 className="text-sm font-bold text-slate-900">
                                ประวัติการปรับปรุงแฟ้มย้อนหลัง (Patch & Audit History)
                            </h3>
                        </div>
                    </div>

                    {recentBatches.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-xs">
                            ยังไม่มีประวัติการปรับปรุงแฟ้มในระบบ
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-3">ชื่อโฟลเดอร์</th>
                                        <th className="py-3 px-3">วันที่เวลา</th>
                                        <th className="py-3 px-3">ผู้ดำเนินการ</th>
                                        <th className="py-3 px-3 text-center">แฟ้มที่แก้</th>
                                        <th className="py-3 px-3 text-center">รายการที่แก้</th>
                                        <th className="py-3 px-3">สถานะ</th>
                                        <th className="py-3 px-3 text-center">การจัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                    {recentBatches.map((b) => (
                                        <tr key={b.id} className="hover:bg-slate-50/80 transition">
                                            <td className="py-2.5 px-3 font-bold font-mono text-slate-900">
                                                {b.batch_name}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-500">{b.created_at}</td>
                                            <td className="py-2.5 px-3">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                                    {b.creator_name}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                                                {b.total_files_modified}
                                            </td>
                                            <td className="py-2.5 px-3 text-center font-bold text-emerald-600">
                                                {b.total_records_modified}
                                            </td>
                                            <td className="py-2.5 px-3 text-emerald-700 font-semibold text-[11px]">
                                                {b.backup_path || 'เขียนทับโดยตรง'}
                                            </td>
                                            <td className="py-2.5 px-3 text-center space-x-1 whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => handleViewBatch(b.id)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                    <span>ดูรายงาน</span>
                                                </button>
                                                <a
                                                    href={route('rcm.file-patch.export', { batchId: b.id })}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    <span>CSV</span>
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3 text-amber-600">
                            <div className="p-3 bg-amber-50 rounded-xl">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">ยืนยันการปรับปรุงแฟ้ม ADP</h3>
                                <p className="text-xs text-slate-500">
                                    ระบบจะทำการปรับแก้ค่า use_status เป็น {targetStatus === '1' ? '1 (ใช้ครั้งเดียว)' : 'ค่าว่าง'}
                                </p>
                            </div>
                        </div>

                        <div className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2">
                            <div>
                                <span className="font-semibold text-slate-700">โฟลเดอร์/แฟ้มเป้าหมาย:</span>
                                <div className="font-mono text-[11px] text-slate-900 break-all">{selectedPath}</div>
                            </div>
                            <div className="text-slate-600 font-medium">
                                * ปรับค่า use_status เป็น <strong className="text-emerald-700 font-bold">{targetStatus === '1' ? '1 (ใช้ครั้งเดียว)' : 'ค่าว่าง'}</strong> โดยตรง (ไม่เก็บไฟล์สำรอง)
                            </div>
                            {loadedClientFiles.length > 0 && (
                                <div className="text-sky-700 font-medium">
                                    * ดำเนินการบนแฟ้มในเครื่องคอมพิวเตอร์ของคุณ (พร้อมดาวน์โหลดไฟล์ที่แก้ไขแล้วให้ทันที)
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleExecutePatch}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
                            >
                                <Check className="w-4 h-4" />
                                <span>ยืนยันและดำเนินการ</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </RcmLayout>
    );
}
