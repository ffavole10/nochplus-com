import { Package } from "lucide-react";

const Parts = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Parts</h1>
        <p className="text-muted-foreground mt-1">
          Parts inventory and management — coming soon.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Package className="h-16 w-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Parts module under construction</p>
        <p className="text-sm mt-1">Content will be provided soon.</p>
      </div>
    </div>
  );
};

export default Parts;
