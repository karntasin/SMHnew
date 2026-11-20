import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ANATOMY_PRESETS, AnatomyPreset } from './AnatomySvgs';
import { 
  Pencil, 
  Eraser, 
  RotateCcw, 
  Check, 
  X, 
  Trash2, 
  Sparkles,
  Dot,
  Circle,
  Crosshair
} from 'lucide-react';

interface LesionCanvasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialImage?: string | null;
  onSave: (imageDataUrl: string | null, isNa: boolean) => void;
}

type DrawMode = 'pen' | 'eraser' | 'stamp_dot' | 'stamp_circle' | 'stamp_cross';

export default function LesionCanvasModal({
  open,
  onOpenChange,
  initialImage,
  onSave,
}: LesionCanvasModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('body_dual');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mode, setMode] = useState<DrawMode>('pen');
  const [color, setColor] = useState<string>('#dc2626'); // Red by default for clinical lesions
  const [lineWidth, setLineWidth] = useState<number>(3);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  const CANVAS_WIDTH = 500;
  const CANVAS_HEIGHT = 420;

  const categories = [
    { id: 'all', label: 'ทั้งหมด' },
    { id: 'head', label: 'ศีรษะ (Head)' },
    { id: 'torso', label: 'ลำตัว (Torso)' },
    { id: 'arms', label: 'แขน (Arms)' },
    { id: 'legs', label: 'ขา (Legs)' },
    { id: 'body', label: 'เต็มตัว (Body)' },
    { id: 'other', label: 'กระดานเปล่า' },
  ];

  const filteredPresets = selectedCategory === 'all' 
    ? ANATOMY_PRESETS 
    : ANATOMY_PRESETS.filter(p => p.category === selectedCategory);

  // Initialize canvas with SVG background
  useEffect(() => {
    if (!open) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (initialImage) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        saveHistoryState(ctx);
      };
      img.src = initialImage;
    } else {
      loadPresetToCanvas(selectedPreset);
    }
  }, [open]);

  const loadPresetToCanvas = (presetId: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const preset = ANATOMY_PRESETS.find((p) => p.id === presetId) || ANATOMY_PRESETS[0];
    const blob = new Blob([preset.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      URL.revokeObjectURL(url);
      setHistory([]);
      saveHistoryState(ctx);
    };
    img.src = url;
  };

  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    loadPresetToCanvas(presetId);
  };

  const saveHistoryState = (ctx: CanvasRenderingContext2D) => {
    const state = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    setHistory((prev) => [...prev.slice(-15), state]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...history];
    newHistory.pop(); // Pop current
    const prevState = newHistory[newHistory.length - 1];
    ctx.putImageData(prevState, 0, 0);
    setHistory(newHistory);
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);

    if (mode === 'stamp_dot') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, lineWidth * 2.5, 0, Math.PI * 2);
      ctx.fill();
      saveHistoryState(ctx);
      return;
    }

    if (mode === 'stamp_circle') {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.arc(x, y, lineWidth * 4, 0, Math.PI * 2);
      ctx.stroke();
      saveHistoryState(ctx);
      return;
    }

    if (mode === 'stamp_cross') {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      const size = lineWidth * 3.5;
      ctx.beginPath();
      ctx.moveTo(x - size, y - size);
      ctx.lineTo(x + size, y + size);
      ctx.moveTo(x + size, y - size);
      ctx.lineTo(x - size, y + size);
      ctx.stroke();
      saveHistoryState(ctx);
      return;
    }

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (mode === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = lineWidth * 3;
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.closePath();
      saveHistoryState(ctx);
    }
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl, false);
    onOpenChange(false);
  };

  const handleSetNa = () => {
    onSave(null, true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-5 bg-white text-slate-900 rounded-xl shadow-2xl">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  เครื่องมือเลือกอวัยวะและวาดตำแหน่งรอยโรค (Lesion & Wound Marker)
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  เลือกรูปโครงสร้างร่างกาย จากนั้นใช้ปากกา/ตราประทับวาดตำแหน่งรอยโรค บาดแผล หรือผื่น
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 py-2">
          {/* Left panel: Presets & Tools */}
          <div className="lg:col-span-4 space-y-4">
            {/* Presets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  1. เลือกรูปอวัยวะร่างกาย ({ANATOMY_PRESETS.length} แบบ)
                </label>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1 mb-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {filteredPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium border transition flex items-center justify-between ${
                      selectedPreset === preset.id
                        ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-[9.5pt] px-1 py-0.2 rounded font-bold shrink-0 ${
                          preset.viewType === 'front' ? 'bg-emerald-100 text-emerald-800' :
                          preset.viewType === 'back' ? 'bg-purple-100 text-purple-800' :
                          preset.viewType === 'side' ? 'bg-amber-100 text-amber-800' :
                          preset.viewType === 'dual' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {preset.viewType === 'front' ? 'หน้า' :
                           preset.viewType === 'back' ? 'หลัง' :
                           preset.viewType === 'side' ? 'ข้าง' :
                           preset.viewType === 'dual' ? 'หน้า-หลัง' : 'อิสระ'}
                        </span>
                        <span className="font-semibold truncate">{preset.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{preset.description}</div>
                    </div>
                    {selectedPreset === preset.id && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawing Tools */}
            <div className="border-t pt-3">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                2. เครื่องมือมาร์กตำแหน่ง (Marking Tools)
              </label>

              {/* Tool types */}
              <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                <button
                  type="button"
                  onClick={() => setMode('pen')}
                  className={`p-2 rounded flex flex-col items-center justify-center text-[10px] font-medium border transition ${
                    mode === 'pen' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="ปากกาวาดอิสระ"
                >
                  <Pencil className="w-4 h-4 mb-0.5" />
                  <span>ปากกา</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('stamp_dot')}
                  className={`p-2 rounded flex flex-col items-center justify-center text-[10px] font-medium border transition ${
                    mode === 'stamp_dot' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="จุดแต้มรอยโรค"
                >
                  <Dot className="w-5 h-5 -my-0.5" />
                  <span>จุดแต้ม</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('stamp_circle')}
                  className={`p-2 rounded flex flex-col items-center justify-center text-[10px] font-medium border transition ${
                    mode === 'stamp_circle' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="วงกลมรอบแผล"
                >
                  <Circle className="w-4 h-4 mb-0.5" />
                  <span>วงกลม</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('stamp_cross')}
                  className={`p-2 rounded flex flex-col items-center justify-center text-[10px] font-medium border transition ${
                    mode === 'stamp_cross' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="กากบาทตำแหน่ง / แผลผ่าตัด"
                >
                  <Crosshair className="w-4 h-4 mb-0.5" />
                  <span>กากบาท</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('eraser')}
                  className={`p-2 rounded flex flex-col items-center justify-center text-[10px] font-medium border transition ${
                    mode === 'eraser' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="ยางลบ"
                >
                  <Eraser className="w-4 h-4 mb-0.5" />
                  <span>ยางลบ</span>
                </button>
              </div>

              {/* Colors */}
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-xs text-slate-600 font-medium">สี:</span>
                {[
                  { color: '#dc2626', name: 'แดง (Lesion/Erythema)' },
                  { color: '#2563eb', name: 'น้ำเงิน (Bruise/Cyanosis)' },
                  { color: '#0f172a', name: 'ดำ (Necrosis/Normal)' },
                  { color: '#16a34a', name: 'เขียว' },
                  { color: '#d97706', name: 'ส้ม/น้ำตาล' },
                ].map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => setColor(c.color)}
                    style={{ backgroundColor: c.color }}
                    className={`w-6 h-6 rounded-full border-2 transition ${
                      color === c.color ? 'scale-110 border-slate-800 ring-2 ring-blue-300' : 'border-white'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>

              {/* Line width */}
              <div className="flex items-center space-x-3 text-xs mb-3">
                <span className="text-slate-600 font-medium">ขนาดเส้น:</span>
                {[2, 4, 7].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setLineWidth(w)}
                    className={`px-2.5 py-1 rounded border text-xs font-medium transition ${
                      lineWidth === w ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    {w === 2 ? 'บาง' : w === 4 ? 'กลาง' : 'หนา'}
                  </button>
                ))}
              </div>

              {/* Undo & Reset actions */}
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={history.length <= 1}
                  className="flex-1 text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  ย้อนกลับ (Undo)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => loadPresetToCanvas(selectedPreset)}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  ล้างรูป
                </Button>
              </div>
            </div>
          </div>

          {/* Right panel: Canvas */}
          <div className="lg:col-span-8 flex flex-col items-center justify-center bg-slate-100 p-3 rounded-xl border border-slate-200">
            <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center justify-between w-full px-1">
              <span>กระดานวาดรูป (Canvas): คลิกแล้วลากเพื่อวาด</span>
              <span className="text-slate-400 text-[11px] font-normal">ขนาดส่งออก: 500 x 400 px</span>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-slate-300 overflow-hidden cursor-crosshair">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="block max-w-full h-auto touch-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex flex-row items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleSetNa}
            className="text-slate-600 text-xs border-dashed"
          >
            ตรวจไม่พบรอยโรค (ตั้งเป็น NA)
          </Button>

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              <X className="w-4 h-4 mr-1" />
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              <Check className="w-4 h-4 mr-1.5" />
              นำรูปไปใส่ในฟอร์ม
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
