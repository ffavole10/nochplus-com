import { supabase } from "@/integrations/supabase/client";

const BUCKET = "swi-documents";

/**
 * Get the public URL for an SWI document stored in the storage bucket
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

  return getSWIPublicUrl(path);
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
