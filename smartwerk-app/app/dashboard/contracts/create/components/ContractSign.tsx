"use client";

import { useEffect, useRef } from "react";

export type ContractSignI18n = {
  date?: string;
  clear?: string;
};

type Props = {
  label: string;
  value?: string;
  date?: string;
  disabled?: boolean;

  dateLabel?: string;
  clearLabel?: string;

  onChange: (dataUrl: string) => void;
  onDateChange: (date: string) => void;

  t?: ContractSignI18n;
};

export default function ContractSign({
  label,
  value,
  date,
  disabled = false,
  dateLabel,
  clearLabel,
  onChange,
  onDateChange,
  t,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const hasStroke = useRef(false);

  const labels = {
    date: dateLabel ?? t?.date ?? "Date",
    clear: clearLabel ?? t?.clear ?? "Clear",
  };

  /* ================= RESIZE + REDRAW ================= */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;

      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(ratio, ratio);

      ctx.clearRect(0, 0, rect.width, rect.height);

      if (value) {
        const img = new Image();
        img.src = value;
        img.onload = () => {
          ctx.clearRect(0, 0, rect.width, rect.height);
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [value]);

  /* ================= HELPERS ================= */

  function getPoint(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const p = "touches" in e ? e.touches[0] : e;
    return {
      x: p.clientX - rect.left,
      y: p.clientY - rect.top,
    };
  }

  /* ================= DRAW ================= */

  function start(
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (disabled) return;
    if ("touches" in e) e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getPoint(e);

    drawing.current = true;
    hasStroke.current = false;

    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (!drawing.current || disabled) return;
    if ("touches" in e) e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getPoint(e);

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";

    ctx.lineTo(x, y);
    ctx.stroke();

    hasStroke.current = true;
  }

  function end() {
    if (!drawing.current || disabled) return;

    drawing.current = false;

    if (!hasStroke.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    onChange(canvas.toDataURL());
    onDateChange(new Date().toISOString().split("T")[0]);
  }

  function cancel() {
    drawing.current = false;
  }

  /* ================= CLEAR ================= */

  function clear() {
    if (disabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    drawing.current = false;
    hasStroke.current = false;

    onChange("");
    onDateChange("");
  }

  /* ================= RENDER ================= */

  return (
    <div className={`space-y-2 ${disabled ? "opacity-60" : ""}`}>
      <label className="text-sm font-medium">{label}</label>

      <canvas
        ref={canvasRef}
        style={{ touchAction: "none" }}
        className="h-32 w-full rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={cancel}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        onTouchCancel={cancel}
      />

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          {labels.date}: {date || "—"}
        </span>

        {!disabled && (
          <button
            type="button"
            onClick={clear}
            className="text-blue-600 hover:underline"
          >
            {labels.clear}
          </button>
        )}
      </div>
    </div>
  );
}