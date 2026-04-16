import { useState, useCallback } from "react";

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  variant: "destructive" | "default";
  onConfirm: () => void;
}

const defaultState: ConfirmState = {
  open: false,
  title: "",
  description: "",
  confirmLabel: "Confirm",
  variant: "destructive",
  onConfirm: () => {},
};

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState>(defaultState);

  const confirm = useCallback(
    (opts: {
      title: string;
      description: string;
      confirmLabel?: string;
      variant?: "destructive" | "default";
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          open: true,
          title: opts.title,
          description: opts.description,
          confirmLabel: opts.confirmLabel ?? "Confirm",
          variant: opts.variant ?? "destructive",
          onConfirm: () => resolve(true),
        });
      });
    },
    []
  );

  const dialogProps = {
    open: state.open,
    onOpenChange: (open: boolean) => {
      if (!open) setState(defaultState);
    },
    title: state.title,
    description: state.description,
    confirmLabel: state.confirmLabel,
    variant: state.variant,
    onConfirm: state.onConfirm,
  };

  return { confirm, dialogProps };
}
