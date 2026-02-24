import { supabase } from "@/integrations/supabase/client";

const BUCKET = "swi-documents";

/**
 * Get a signed URL for an SWI document stored in the storage bucket (private bucket)
 */
export async function getSWISignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 3600); // 1 hour expiry
  if (error || !data?.signedUrl) {
    // Fallback to constructing URL (will fail if bucket is private, but keeps backward compat)
    const { data: pubData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return pubData.publicUrl;
  }
  return data.signedUrl;
}

/**
 * Get the public URL for an SWI document (deprecated - use getSWISignedUrl)
 */
export function getSWIPublicUrl(filePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Upload an SWI PDF to storage, using the SWI ID as the path
 */
export async function uploadSWIDocument(
  swiId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() || "pdf";
  const path = `${swiId}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  return getSWISignedUrl(path);
}

/**
 * Delete an SWI document from storage
 */
export async function deleteSWIDocument(swiId: string): Promise<void> {
  // Try common extensions
  for (const ext of ["pdf", "PDF"]) {
    await supabase.storage.from(BUCKET).remove([`${swiId}.${ext}`]);
  }
}

/**
 * List all uploaded SWI documents
 */
export async function listSWIDocuments(): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list("", { limit: 500 });
  if (error) throw error;
  return (data || []).map((f) => f.name);
}
