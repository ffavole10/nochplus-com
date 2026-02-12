import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, User } from "lucide-react";
import { toast } from "sonner";

interface AvatarUploadProps {
  userId: string;
  avatarUrl: string | null;
  displayName: string | null;
  size?: "sm" | "md" | "lg";
  onUploaded?: (url: string) => void;
}

const sizeClasses = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

export function AvatarUpload({ userId, avatarUrl, displayName, size = "md", onUploaded }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = displayName
    ? displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;

      // Remove old avatar files
      const { data: existing } = await supabase.storage.from("avatars").list(userId);
      if (existing?.length) {
        await supabase.storage.from("avatars").remove(existing.map((f) => `${userId}/${f.name}`));
      }

      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", userId);

      onUploaded?.(publicUrl);
      toast.success("Profile picture updated");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
      <Avatar className={`${sizeClasses[size]} ${uploading ? "opacity-50" : ""}`}>
        <AvatarImage src={avatarUrl || undefined} alt={displayName || "User"} />
        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
          {initials || <User className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>
      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Camera className="w-4 h-4 text-white" />
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
}
