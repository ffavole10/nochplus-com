import { useState } from "react";
import { cn } from "@/lib/utils";

interface CustomerLogoProps {
  logoUrl?: string | null;
  companyName: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

export function CustomerLogo({ logoUrl, companyName, size = "sm", className }: CustomerLogoProps) {
  const [imgError, setImgError] = useState(false);

  const initials = companyName
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={companyName}
        className={cn(sizeMap[size], "rounded-md object-contain bg-background border border-border", className)}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeMap[size],
        "rounded-md bg-primary/10 text-primary font-bold flex items-center justify-center border border-primary/20 shrink-0",
        className
      )}
    >
      {initials || "?"}
    </div>
  );
}
