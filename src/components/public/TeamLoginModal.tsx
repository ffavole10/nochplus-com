import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Monitor, Wrench } from "lucide-react";

interface TeamLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamLoginModal({ open, onOpenChange }: TeamLoginModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader className="text-center space-y-1">
          <DialogTitle className="text-2xl">Who are you?</DialogTitle>
          <DialogDescription>
            Choose how you'd like to sign in.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            size="lg"
            variant="outline"
            className="h-14 justify-start gap-3 rounded-xl text-base"
            onClick={() => {
              onOpenChange(false);
              navigate("/login");
            }}
          >
            <Monitor className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Admin / Ops Access</div>
              <div className="text-xs text-muted-foreground font-normal">
                NOCH+ platform sign in
              </div>
            </div>
          </Button>

          <Button
            size="lg"
            className="h-14 justify-start gap-3 rounded-xl text-base bg-[#25b3a5] hover:bg-[#1a8a7f] text-white"
            onClick={() => {
              onOpenChange(false);
              navigate("/field");
            }}
          >
            <Wrench className="h-5 w-5" />
            <div className="text-left">
              <div className="font-semibold">Technician Access</div>
              <div className="text-xs text-white/80 font-normal">
                NOCH+ Field mobile app
              </div>
            </div>
          </Button>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-sm text-muted-foreground hover:text-foreground mt-2 mx-auto"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
