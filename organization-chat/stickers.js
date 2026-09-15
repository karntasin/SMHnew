/** FSHH Chat custom sticker pack (PNG on Worker assets, not D1). */

export const STICKER_PACK = [
  { id: 'u1', file: 'u1.png' },
  { id: 'u2', file: 'u2.png' },
  { id: 'u3', file: 'u3.png' },
  { id: 'u4', file: 'u4.png' },
  { id: 'u5', file: 'u5.png' },
  { id: 'u6', file: 'u6.png' },
  { id: 'u7', file: 'u7.png' },
  { id: 'u9', file: 'u9.png' },
  { id: 'u10', file: 'u10.png' },
  { id: 'u11', file: 'u11.png' },
  { id: 'u12', file: 'u12.png' },
  { id: 'u13', file: 'u13.png' },
  { id: 'u14', file: 'u14.png' },
  { id: 'u15', file: 'u15.png' },
  { id: '16', file: '16.png' },
  { id: '17', file: '17.png' },
  { id: '18', file: '18.png' },
  { id: '19', file: '19.png' },
  { id: '20', file: '20.png' },
  { id: '21', file: '21.png' },
  { id: '22', file: '22.png' },
  { id: '23', file: '23.png' },
  { id: '24', file: '24.png' },
  { id: '25', file: '25.png' },
  { id: '26', file: '26.png' },
  { id: '27', file: '27.png' },
  { id: '28', file: '28.png' },
  { id: '29', file: '29.png' },
];

const STICKER_IDS = new Set(STICKER_PACK.map((s) => s.id));

export function isValidStickerId(id) {
  return STICKER_IDS.has(String(id || ''));
}

export function stickerPreviewText() {
  return 'สติกเกอร์';
}
