import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { isValidSignature, signatureFromText } from "../lib/signature";

/**
 * Firma manuscrita con Pointer Events (skill §5).
 *
 *  - Pointer Events + setPointerCapture: unifica mouse/touch/lapiz y sigue
 *    dibujando aunque el dedo se salga del canvas.
 *  - touch-action: none, para que el navegador no interprete el gesto como scroll.
 *  - ResizeObserver que PRESERVA el dibujo: cambiar canvas.width borra el bitmap,
 *    asi que se toma un snapshot antes y se repinta despues.
 *  - Guard de StrictMode (initRef): en dev el efecto de montaje corre dos veces;
 *    sin guard, la segunda pasada borraria la firma restaurada del borrador.
 *  - Valida firma no vacia (> 200 chars de dataURL) y ademas exige haber dibujado.
 *  - NO usar dentro de <label>: en tactil el label absorbe el primer toque y
 *    rompe el trazo. El titulo va en un <div> hermano (ver App.tsx).
 *
 * Controlado "a medias": `value` sirve para restaurar (borrador) y para limpiar
 * desde afuera (value=null). `onChange` recibe el dataURL PNG o null al borrar.
 */
export interface SignaturePadProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  /** Alto CSS en px. El ancho es el del contenedor. */
  height?: number;
  disabled?: boolean;
}

export function SignaturePad({ value, onChange, height = 160, disabled = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const initRef = useRef(false);
  const hasInkRef = useRef(false);
  /** Se incrementa al borrar o empezar un trazo: una imagen que termina de cargar despues NO se pinta. */
  const paintSeqRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [typedName, setTypedName] = useState("");

  const applyStrokeStyle = (c: HTMLCanvasElement): CanvasRenderingContext2D | null => {
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.lineWidth = 2 * (window.devicePixelRatio || 1);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111";
    ctx.fillStyle = "#111";
    return ctx;
  };

  /** Dibuja un dataURL escalado al tamano actual del bitmap. */
  const paintDataUrl = useCallback((dataUrl: string) => {
    const c = canvasRef.current;
    if (!c) return;
    const seq = paintSeqRef.current;
    const img = new Image();
    img.onload = () => {
      if (drawingRef.current || paintSeqRef.current !== seq) return;
      const ctx = applyStrokeStyle(c);
      ctx?.drawImage(img, 0, 0, c.width, c.height);
    };
    img.src = dataUrl;
  }, []);

  /**
   * Ajusta el bitmap al tamano CSS x devicePixelRatio conservando lo dibujado.
   * Devuelve false si el canvas todavia no tiene layout (ancho 0).
   */
  const resync = useCallback((): boolean => {
    const c = canvasRef.current;
    if (!c) return false;
    const rect = c.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (c.width === w && c.height === h) return true;
    const snapshot = hasInkRef.current ? c.toDataURL("image/png") : null; // ANTES de redimensionar
    c.width = w; // esto borra el bitmap y resetea el estado del contexto
    c.height = h;
    applyStrokeStyle(c);
    if (snapshot) paintDataUrl(snapshot);
    return true;
  }, [paintDataUrl]);

  // Init (una sola vez, aunque StrictMode monte dos veces): restaura el valor guardado.
  useEffect(() => {
    if (initRef.current) return;
    if (!resync()) return;
    initRef.current = true;
    if (isValidSignature(value)) {
      hasInkRef.current = true;
      paintDataUrl(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo en el montaje
  }, []);

  // ResizeObserver: NO va bajo el guard (el cleanup lo desconecta en cada desmontaje simulado).
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (drawingRef.current) return; // nunca tocar a mitad de un trazo
      if (resync() && !initRef.current) {
        initRef.current = true;
        if (isValidSignature(value)) {
          hasInkRef.current = true;
          paintDataUrl(value);
        }
      }
    });
    ro.observe(c);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `value` solo se usa en el primer layout
  }, [resync, paintDataUrl]);

  const clearCanvas = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    paintSeqRef.current++;
    c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    hasInkRef.current = false;
  }, []);

  // Cambios externos de `value`: limpiar (ej. despues de enviar) o restaurar un borrador tardio.
  useEffect(() => {
    if (drawingRef.current) return;
    if (!value && hasInkRef.current) clearCanvas();
    else if (value && !hasInkRef.current && initRef.current && isValidSignature(value)) {
      hasInkRef.current = true;
      paintDataUrl(value);
    }
  }, [value, clearCanvas, paintDataUrl]);

  const point = (e: ReactPointerEvent<HTMLCanvasElement>, c: HTMLCanvasElement) => {
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * c.width) / rect.width,
      y: ((e.clientY - rect.top) * c.height) / rect.height,
    };
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const c = canvasRef.current;
    if (!c) return;
    e.preventDefault();
    paintSeqRef.current++; // un trazo nuevo invalida cualquier restauracion pendiente
    try {
      c.setPointerCapture(e.pointerId);
    } catch {
      /* algunos navegadores lanzan si el puntero ya no esta activo */
    }
    const ctx = applyStrokeStyle(c);
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = point(e, c);
    // Punto inicial visible: confirma que pointerdown llego aun sin movimiento.
    ctx.beginPath();
    ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);
    hasInkRef.current = true;
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    e.preventDefault();
    const { x, y } = point(e, c);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const finishStroke = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const c = canvasRef.current;
    if (!c) return;
    try {
      c.releasePointerCapture(e.pointerId);
    } catch {
      /* ya liberado */
    }
    const dataUrl = c.toDataURL("image/png");
    if (hasInkRef.current && isValidSignature(dataUrl)) onChangeRef.current(dataUrl);
  };

  const handleClear = () => {
    clearCanvas();
    onChangeRef.current(null);
  };

  return (
    <div className="signature-pad">
      <canvas
        ref={canvasRef}
        className="signature-canvas"
        style={{ touchAction: "none", height }}
        role="img"
        aria-label="Area de firma: dibuja con el dedo o el mouse. Si no puedes dibujar, usa el campo de nombre escrito que sigue"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
      />
      <button type="button" className="btn-secondary" onClick={handleClear} disabled={disabled}>
        Borrar firma
      </button>

      {/* Alternativa sin puntero (teclado, lector de pantalla, dificultad motriz): el nombre escrito. */}
      <div className="signature-typed">
        <label htmlFor="signature-typed-name">O escribe tu nombre completo como firma</label>
        <input
          id="signature-typed-name"
          type="text"
          value={typedName}
          maxLength={40}
          autoComplete="name"
          disabled={disabled}
          onChange={(e) => setTypedName(e.target.value)}
        />
        <button
          type="button"
          className="btn-secondary"
          disabled={disabled || typedName.trim().length < 2}
          onClick={() => {
            const url = signatureFromText(typedName);
            if (!url) return;
            clearCanvas();
            onChangeRef.current(url);
          }}
        >
          Usar nombre escrito como firma
        </button>
      </div>
    </div>
  );
}
