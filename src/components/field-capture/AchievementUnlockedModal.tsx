import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import maxThumbsUp from "@/assets/max-thumbsup.png";
import { ACHIEVEMENT_META, type AchievementType } from "@/lib/nochProStats";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  achievements: AchievementType[];
  open: boolean;
  onClose: () => void;
}

export function AchievementUnlockedModal({ achievements, open, onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();
  if (!achievements.length) return null;
  const current = ACHIEVEMENT_META[achievements[idx]];

  const next = () => {
    if (idx + 1 < achievements.length) setIdx(idx + 1);
    else onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden border-0">
        <div
          className="px-6 pt-8 pb-6 text-center"
          style={{
            background:
              "linear-gradient(180deg, hsl(var(--fc-primary) / 0.18) 0%, hsl(var(--fc-bg)) 100%)",
          }}
        >
          <img
            src={maxThumbsUp}
            alt=""
            className="w-32 h-auto mx-auto animate-[fc-celebrate_500ms_ease-out]"
          />
          <div className="mt-4 text-[11px] uppercase tracking-widest font-semibold text-fc-primary-dark">
            Achievement Unlocked
          </div>
          <div className="mt-2 text-5xl">{current.emoji}</div>
          <h2 className="mt-2 text-xl font-bold text-fc-text">{current.name}</h2>
          <p className="mt-1 text-sm text-fc-muted">{current.description}</p>
          {achievements.length > 1 && (
            <div className="mt-3 text-[11px] text-fc-muted">
              {idx + 1} of {achievements.length}
            </div>
          )}
        </div>
        <div className="px-5 pb-5 space-y-2 bg-fc-bg">
          <Button
            className="w-full h-12 rounded-xl bg-fc-primary hover:bg-fc-primary-dark text-white font-bold"
            onClick={next}
          >
            {idx + 1 < achievements.length ? "Next" : "Awesome"}
          </Button>
          <Button
            variant="ghost"
            className="w-full h-10 rounded-xl text-fc-muted"
            onClick={() => {
              onClose();
              navigate("/field-capture/profile");
            }}
          >
            See all achievements
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
