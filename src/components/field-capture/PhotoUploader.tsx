import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, randomSuffix } from "@/lib/imageCompress";
import type { FieldPhotoType, WorkOrderPhoto } from "@/types/fieldCapture";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  workOrderId: string;
  chargerId?: string | null;
  photoType: FieldPhotoType;
  minRequired?: number;
  maxAllowed?: number;
  /** Notifies parent of current count (for enabling Continue) */
  onCountChange?: (n: number) => void;
}

const BUCKET = "field-capture-photos";

export default function PhotoUploader({
  workOrderId,
  chargerId,
  photoType,
  minRequired = 0,
  maxAllowed = 12,
  onCountChange,
}: Props) {
  const [photos, setPhotos] = useState<WorkOrderPhoto[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch existing photos for this slot
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let query = supabase
        .from("work_order_photos")
        .select("*")
        .eq("work_order_id", workOrderId)
        .eq("photo_type", photoType)
        .order("uploaded_at", { ascending: true });
      if (chargerId) query = query.eq("charger_id", chargerId);
      else query = query.is("charger_id", null);
      const { data } = await query;
      if (cancelled) return;
      const list = (data || []) as WorkOrderPhoto[];
      setPhotos(list);
      onCountChange?.(list.length);
      // Resolve signed URLs
      const urls: Record<string, string> = {};
      await Promise.all(
        list.map(async (p) => {
          if (!p.storage_path) return;
          const { data: s } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(p.storage_path, 3600);
          if (s?.signedUrl) urls[p.id] = s.signedUrl;
        }),
      );
      if (!cancelled) setSignedUrls(urls);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderId, chargerId, photoType]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (photos.length + files.length > maxAllowed) {
      toast.error(`Max ${maxAllowed} photos for this section`);
      return;
    }
    setUploading(true);
    const added: WorkOrderPhoto[] = [];
    const newUrls: Record<string, string> = {};
    try {
      for (const file of Array.from(files)) {
        const blob = await compressImage(file);
        const ts = Date.now();
        const path = `${workOrderId}/${chargerId || "job"}/${photoType}/${ts}-${randomSuffix()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, {
            contentType: "image/jpeg",
            upsert: false,
          });
        if (upErr) throw upErr;

        const { data: row, error: dbErr } = await supabase
          .from("work_order_photos")
          .insert({
            work_order_id: workOrderId,
            charger_id: chargerId || null,
            photo_type: photoType,
            photo_url: path,
            storage_path: path,
            file_size_bytes: blob.size,
          })
          .select("*")
          .single();
        if (dbErr) throw dbErr;

        const { data: s } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(path, 3600);
        added.push(row as WorkOrderPhoto);
        if (s?.signedUrl) newUrls[(row as WorkOrderPhoto).id] = s.signedUrl;
      }
      const next = [...photos, ...added];
      setPhotos(next);
      setSignedUrls((u) => ({ ...u, ...newUrls }));
      onCountChange?.(next.length);
    } catch (e: any) {
      toast.error(e?.message || "Photo upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function deletePhoto(p: WorkOrderPhoto) {
    if (p.storage_path) {
      await supabase.storage.from(BUCKET).remove([p.storage_path]);
    }
    await supabase.from("work_order_photos").delete().eq("id", p.id);
    const next = photos.filter((x) => x.id !== p.id);
    setPhotos(next);
    onCountChange?.(next.length);
  }

  const meetsMin = photos.length >= minRequired;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {photos.map((p) => (
          <div
            key={p.id}
            className="relative aspect-square rounded-xl overflow-hidden bg-fc-border/40 border border-fc-border"
          >
            {signedUrls[p.id] ? (
              <button
                type="button"
                onClick={() => setPreview(signedUrls[p.id])}
                className="block w-full h-full"
              >
                <img
                  src={signedUrls[p.id]}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              </button>
            ) : (
              <div className="flex items-center justify-center h-full text-fc-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
            <button
              type="button"
              onClick={() => deletePhoto(p)}
              className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
              aria-label="Delete photo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.setAttribute("capture", "environment");
              inputRef.current.click();
            }
          }}
          disabled={uploading || photos.length >= maxAllowed}
          className="flex-1 h-12 rounded-xl border border-fc-primary/40 text-fc-primary bg-fc-primary/5 active:bg-fc-primary/10 disabled:opacity-50 flex items-center justify-center gap-1.5 font-medium text-sm"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          Take Photo
        </button>
        <button
          type="button"
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.removeAttribute("capture");
              inputRef.current.click();
            }
          }}
          disabled={uploading || photos.length >= maxAllowed}
          className="flex-1 h-12 rounded-xl border border-fc-border text-fc-text bg-white active:bg-fc-border/30 disabled:opacity-50 flex items-center justify-center gap-1.5 font-medium text-sm"
        >
          <ImagePlus className="h-4 w-4" />
          Library
        </button>
      </div>

      {minRequired > 0 && (
        <p
          className={cn(
            "text-xs",
            meetsMin ? "text-fc-success" : "text-fc-warning",
          )}
        >
          {photos.length} / {minRequired} required
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {preview && (
        <div
          className="fixed inset-0 z-[3000] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <img
            src={preview}
            alt="Preview"
            className="max-w-full max-h-full rounded-xl"
          />
          <button
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/15 text-white flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              setPreview(null);
            }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
