import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { SignaturePad } from "./components/SignaturePad";
import { createDraftStore, shouldClearDraft } from "./lib/draftStorage";
import { formatKms, formatPatente, isValidPatente, parseKms } from "./lib/formatters";
import {
  PayloadTooLargeError,
  base64Length,
  checkPayloadBudget,
  compressImage,
  extensionFor,
  formatBytes,
  prepareImageAttachments,
} from "./lib/imageUtils";
import { isValidSignature } from "./lib/signature";
import { buildPayload, generateFolio, isDemoMode, submit } from "./lib/uploadClient";

const MAX_PHOTOS = 10;

/** Lo que se persiste como borrador. Las fotos NO (blobs grandes, cuota de localStorage). */
interface FormState {
  folio: string;
  descripcion: string;
  patente: string;
  kilometraje: number | undefined;
  firma: string | null;
}

type Status =
  | { phase: "idle" }
  | { phase: "sending" }
  | { phase: "success"; folio: string }
  | { phase: "demo"; folio: string }
  | { phase: "error"; message: string; retryable: boolean };

const draftStore = createDraftStore<FormState>();

function emptyForm(): FormState {
  return { folio: generateFolio(), descripcion: "", patente: "", kilometraje: undefined, firma: null };
}

/** Restaura el borrador validando tipos: un borrador corrupto nunca debe romper el render. */
function initialForm(): FormState {
  const base = emptyForm();
  const d = draftStore.load();
  if (!d || typeof d !== "object") return base;
  return {
    folio: typeof d.folio === "string" && d.folio ? d.folio : base.folio,
    descripcion: typeof d.descripcion === "string" ? d.descripcion : "",
    patente: typeof d.patente === "string" ? formatPatente(d.patente) : "",
    kilometraje: typeof d.kilometraje === "number" ? d.kilometraje : undefined,
    firma: isValidSignature(d.firma) ? d.firma : null,
  };
}

export default function App() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [photos, setPhotos] = useState<File[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [status, setStatus] = useState<Status>({ phase: "idle" });
  const inFlight = useRef(false); // guard de doble tap: un ref, no solo estado (skill §6)

  // Autoguardado del borrador (solo texto + firma).
  useEffect(() => {
    draftStore.save(form);
  }, [form]);

  // Miniaturas: useMemo + revokeObjectURL para no perder memoria (skill §3).
  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const photosBytes = photos.reduce((sum, f) => sum + base64Length(f.size), 0);
  const budget = checkPayloadBudget([photosBytes, form.firma?.length ?? 0]);

  // Panel de "pendientes": el boton nunca se deshabilita en silencio (skill §3).
  const pendientes = useMemo(() => {
    const p: string[] = [];
    if (!form.descripcion.trim()) p.push("Descripcion");
    if (!isValidPatente(form.patente)) p.push("Patente valida (ABC-123 o AB-123-CD)");
    if (form.kilometraje === undefined) p.push("Kilometraje");
    if (photos.length === 0) p.push("Al menos 1 foto");
    if (!budget.ok) p.push(`Reducir el peso de las fotos (max ${formatBytes(budget.maxBytes)})`);
    if (!isValidSignature(form.firma)) p.push("Firma");
    return p;
  }, [form, photos.length, budget.ok, budget.maxBytes]);

  const busy = status.phase === "sending";
  const canSubmit = pendientes.length === 0 && !busy && !compressing;

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const picked = Array.from(input.files ?? []);
    input.value = ""; // permite volver a elegir el mismo archivo
    if (picked.length === 0) return;
    setCompressing(true);
    try {
      // Capa 1: comprimir al elegir, asi el File en memoria ya es liviano (skill §5).
      const compressed = await Promise.all(picked.map((f) => compressImage(f)));
      setPhotos((prev) => [...prev, ...compressed].slice(0, MAX_PHOTOS));
    } finally {
      setCompressing(false);
    }
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (inFlight.current || !canSubmit) return;
    inFlight.current = true;
    setStatus({ phase: "sending" });
    try {
      // Capa 2 (red de seguridad): comprime de nuevo (no-op si ya estaba) y valida presupuesto.
      const photoAttachments = await prepareImageAttachments(
        photos,
        (i, f) => `foto-${i + 1}_${form.folio}.${extensionFor(f.type)}`,
        { reservedBytes: form.firma?.length ?? 0 },
      );
      const payload = buildPayload({
        folio: form.folio, // el MISMO folio en cada reintento (idempotencia, skill §22.4)
        descripcion: form.descripcion,
        patente: form.patente,
        kilometraje: form.kilometraje,
        signatureDataUrl: form.firma,
        photos: photoAttachments,
      });

      const result = await submit(payload);

      if (!result.ok) {
        // El borrador NO se toca: el usuario puede reintentar sin perder nada.
        setStatus({ phase: "error", message: result.error.message, retryable: result.error.retryable });
        return;
      }
      if (shouldClearDraft(result)) {
        draftStore.clear();
        setStatus({ phase: "success", folio: result.folio });
      } else {
        setStatus({ phase: "demo", folio: result.folio }); // demo: no se envio, se conserva todo
      }
    } catch (err) {
      const message =
        err instanceof PayloadTooLargeError ? err.message : "Ocurrio un error inesperado al preparar el envio.";
      setStatus({ phase: "error", message, retryable: !(err instanceof PayloadTooLargeError) });
    } finally {
      inFlight.current = false;
    }
  }

  function startOver() {
    setForm(() => emptyForm());
    setPhotos([]);
    setStatus({ phase: "idle" });
  }

  // Pantalla de exito: reemplaza el formulario y NO muestra datos internos (ids, URLs de SharePoint).
  if (status.phase === "success") {
    return (
      <main className="app">
        <div className="success-card" role="status">
          <div className="success-check" aria-hidden="true">
            ✓
          </div>
          <h1>Envio recibido</h1>
          <p>
            Folio: <strong>{status.folio}</strong>
          </p>
          <button type="button" className="btn-primary" onClick={startOver}>
            Cargar otro
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <h1>Formulario de ejemplo</h1>

      {isDemoMode() && (
        <div className="banner banner-demo" role="status">
          <strong>Modo demo.</strong> No hay <code>VITE_POWER_AUTOMATE_URL</code>: el formulario funciona pero
          no se envia nada.
        </div>
      )}

      {/* noValidate + sin `required`: toda la validacion es nuestra (skill §3). */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid">
          <label className="full">
            Descripcion
            <input
              type="text"
              value={form.descripcion}
              autoComplete="off"
              onChange={(e) => {
                const v = e.target.value;
                setForm((prev) => ({ ...prev, descripcion: v }));
              }}
            />
          </label>

          <label className={form.patente && !isValidPatente(form.patente) ? "label-error" : ""}>
            Patente
            <input
              type="text"
              value={form.patente}
              placeholder="ABC-123 o AB-123-CD"
              maxLength={9}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              onChange={(e) => {
                const v = formatPatente(e.target.value);
                setForm((prev) => ({ ...prev, patente: v }));
              }}
            />
            {form.patente && !isValidPatente(form.patente) && (
              <span className="field-error">Formato incompleto o invalido.</span>
            )}
          </label>

          <label>
            Kilometraje
            <input
              type="text"
              inputMode="numeric"
              value={formatKms(form.kilometraje)}
              placeholder="ej: 123.456"
              autoComplete="off"
              onChange={(e) => {
                const n = parseKms(e.target.value);
                setForm((prev) => ({ ...prev, kilometraje: n }));
              }}
            />
          </label>

          {/* Fotos: el input file va dentro de su label; nada de canvas dentro de labels. */}
          <div className="full">
            <div className="field-title">
              Fotos{" "}
              <span className="counter">
                ({photos.length}/{MAX_PHOTOS} · {formatBytes(photosBytes)})
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              disabled={busy || photos.length >= MAX_PHOTOS}
              aria-label="Adjuntar fotos"
            />
            {compressing && <p className="hint">Comprimiendo imagenes...</p>}
            {photos.length > 0 && (
              <ul className="thumbs">
                {photos.map((f, i) => (
                  <li key={`${f.name}-${f.lastModified}-${i}`}>
                    <img src={previews[i]} alt={`Foto ${i + 1}`} />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* La firma va en un <div>, NUNCA en un <label> (skill §5). */}
          <div className="full firma-section">
            <div className="field-title">Firma</div>
            <SignaturePad
              value={form.firma}
              disabled={busy}
              onChange={(d) => setForm((prev) => ({ ...prev, firma: d }))}
            />
          </div>
        </div>

        {pendientes.length > 0 && (
          <div className="banner banner-pending" role="status" aria-live="polite">
            <strong>Falta completar:</strong>
            <ul>
              {pendientes.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        {status.phase === "error" && (
          <div className="banner banner-error" role="alert">
            <p>{status.message}</p>
            {status.retryable && (
              <button type="button" className="btn-secondary" onClick={() => void handleSubmit()} disabled={!canSubmit}>
                Reintentar
              </button>
            )}
          </div>
        )}

        {status.phase === "demo" && (
          <div className="banner banner-demo" role="status">
            <strong>Modo demo: no se envio nada.</strong> Folio {status.folio}. El borrador se conserva.
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          {busy ? "Enviando..." : "Enviar"}
        </button>
      </form>
    </main>
  );
}
