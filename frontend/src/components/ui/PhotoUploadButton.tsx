import { useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import { apiRequest } from "../../services/api";

interface PhotoUploadButtonProps {
  gameId?: string;
  athleteId?: string;
  onUploaded?: (url: string) => void;
  label?: string;
  compact?: boolean;
}

// Comprime imagem para max 800px e qualidade 0.75
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PhotoUploadButton({ gameId, athleteId, onUploaded, label = "Adicionar foto", compact = false }: PhotoUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setError("Apenas imagens."); return; }
    setLoading(true);
    setError(null);
    try {
      const dataUrl = await compressImage(file);
      const result = await apiRequest<{ url: string }>("/gallery/upload", {
        method: "POST",
        body: JSON.stringify({
          dataUrl,
          type: gameId ? "GAME" : athleteId ? "ATHLETE_PROFILE" : "GENERAL",
          gameId,
          athleteId,
          title: file.name.replace(/\.[^.]+$/, "")
        })
      });
      onUploaded?.(result.url);
    } catch {
      setError("Falha no upload. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
      />
      <button
        type="button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        className={compact
          ? "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          : "inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50"
        }
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : compact ? (
          <Camera size={13} />
        ) : (
          <Upload size={14} />
        )}
        {loading ? "Enviando..." : label}
      </button>
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
