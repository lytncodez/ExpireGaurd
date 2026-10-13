import * as Dialog from '@radix-ui/react-dialog';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
}: ConfirmDialogProps) {
  const confirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ui-dialog-overlay" />
        <Dialog.Content className="ui-dialog-content">
          <header className="ui-dialog-header">
            <Dialog.Title className="ui-dialog-title">{title}</Dialog.Title>
            <Dialog.Description className="ui-dialog-description">{description}</Dialog.Description>
          </header>
          <footer className="ui-dialog-footer">
            <Dialog.Close asChild><Button variant="outline">Cancel</Button></Dialog.Close>
            <Button variant="destructive" onClick={confirm}>{confirmLabel}</Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
