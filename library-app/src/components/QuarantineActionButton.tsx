import { useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { WorkflowReason } from '../api/mockData';
import { useInventory } from '../api/useInventory';
import { Button } from './ui/Button';

const reasons: WorkflowReason[] = ['Expired', 'Damaged', 'Supplier Return', 'Other'];

export function QuarantineActionButton({ itemId, itemName }: { itemId: string; itemName: string }) {
  const { quarantineItem } = useInventory();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<WorkflowReason | ''>('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reason) return;
    quarantineItem(itemId, reason);
    setOpen(false);
    setReason('');
  };

  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><Button size="sm" variant="row-action">Quarantine / Remove</Button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="ui-dialog-overlay" />
      <Dialog.Content className="ui-dialog-content">
        <form onSubmit={submit}>
          <header className="ui-dialog-header">
            <Dialog.Title className="ui-dialog-title">Move {itemName} to quarantine?</Dialog.Title>
            <Dialog.Description className="ui-dialog-description">This batch will be removed from active circulation. Record a reason to keep the action available for reporting.</Dialog.Description>
          </header>
          <label className="workflow-field">
            <span>Reason <b aria-hidden="true">*</b></span>
            <select className="ui-select" value={reason} onChange={event => setReason(event.target.value as WorkflowReason | '')} required>
              <option value="" disabled>Select a reason</option>
              {reasons.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <footer className="ui-dialog-footer">
            <Dialog.Close asChild><Button variant="outline">Cancel</Button></Dialog.Close>
            <Button type="submit" variant="row-action">Move to quarantine</Button>
          </footer>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
