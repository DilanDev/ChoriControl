"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  onConfirm,
  variant = "destructive",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
  variant?: "default" | "destructive";
}) {
  const [working, setWorking] = useState(false);

  async function handleConfirm() {
    setWorking(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // El llamador muestra el error (toast) y el diálogo queda abierto.
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        if (!working) onOpenChange(abierto);
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={working}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant}
            disabled={working}
            onClick={handleConfirm}
          >
            {working ? "Procesando..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
