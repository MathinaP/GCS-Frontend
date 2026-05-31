import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
}

interface Props {
  value: string;
  onChange: (data: string) => void;
}

export default forwardRef<SignaturePadHandle, Props>(function SignaturePad({ value, onChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useImperativeHandle(ref, () => ({
    clear() {
      const c = canvasRef.current;
      if (!c) return;
      c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
      onChange('');
    },
    isEmpty() {
      const c = canvasRef.current;
      if (!c) return true;
      return !c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data.some(v => v !== 0);
    },
  }));

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => canvasRef.current?.getContext('2d')!.drawImage(img, 0, 0);
    img.src = value;
  }, []); // only on mount

  function pt(e: MouseEvent | TouchEvent, c: HTMLCanvasElement) {
    const r = c.getBoundingClientRect();
    const sx = c.width / r.width, sy = c.height / r.height;
    const src = 'touches' in e ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * sx, y: (src.clientY - r.top) * sy };
  }

  function down(e: React.MouseEvent | React.TouchEvent) {
    drawing.current = true;
    last.current = pt(e.nativeEvent as MouseEvent | TouchEvent, canvasRef.current!);
  }

  function move(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current || !canvasRef.current) return;
    e.preventDefault();
    const c = canvasRef.current;
    const ctx = c.getContext('2d')!;
    const p = pt(e.nativeEvent as MouseEvent | TouchEvent, c);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    last.current = p;
  }

  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvasRef.current?.toDataURL('image/png') ?? '');
  }

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={150}
      className="w-full border border-gray-300 rounded-lg bg-white cursor-crosshair touch-none"
      style={{ height: '150px' }}
      onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up}
      onTouchStart={down} onTouchMove={move} onTouchEnd={up}
    />
  );
});
