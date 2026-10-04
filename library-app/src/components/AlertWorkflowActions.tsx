import { useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { useInventory } from '../api/useInventory';
import type { WorkflowReason } from '../api/mockData';
import { Button } from './ui/Button';

type WorkflowAction = 'flag' | 'note' | 'quarantine' | 'dispose' | null;
const reasons: WorkflowReason[] = ['Expired', 'Damaged', 'Supplier Return', 'Other'];

export function AlertWorkflowActions({ itemId, itemName, returnRequested = false }: { itemId: string; itemName: string; returnRequested?: boolean }) {
  const { flagItemForReview, quarantineItem, addItemNote, requestSupplierReturn, disposeItem } = useInventory();
  const [action, setAction] = useState<WorkflowAction>(null);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState<WorkflowReason | ''>('');

  const open = (nextAction: Exclude<WorkflowAction, null>) => {
    setNote('');
    setReason('');
    setAction(nextAction);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!action) return;
    if (action === 'flag') flagItemForReview(itemId, note.trim());
    if (action === 'note') addItemNote(itemId, note.trim());
    if (action === 'quarantine' && reason) quarantineItem(itemId, reason);
    if (action === 'dispose' && reason) disposeItem(itemId, reason, note.trim());
    setAction(null);
  };

  const title = action === 'flag' ? 'Flag for Admin Review' : action === 'note' ? 'Add batch note' : action === 'quarantine' ? 'Move to Quarantine' : 'Confirm Disposal';
  const description = action === 'flag'
    ? `Send ${itemName} to the Admin flagged items inbox. Add a note if it helps explain the issue.`
    : action === 'note'
      ? `Add a note to the activity history for ${itemName}.`
      : action === 'quarantine'
        ? `Choose a reason before removing ${itemName} from active circulation.`
        : `Record physical removal of ${itemName} for compliance. Choose the reason and confirm the quantity is no longer in stock.`;

  return <>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" size="icon" aria-label={`More actions for ${itemName}`} title="More actions"><MoreHorizontal size={17} /></Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="workflow-menu" align="end" sideOffset={6}>
          <DropdownMenu.Item className="workflow-menu-item" onSelect={() => open('flag')}>Flag for Admin Review</DropdownMenu.Item>
          <DropdownMenu.Item className="workflow-menu-item" onSelect={() => open('quarantine')}>Move to Quarantine</DropdownMenu.Item>
          <DropdownMenu.Item className="workflow-menu-item" onSelect={() => open('note')}>Add Note</DropdownMenu.Item>
          <DropdownMenu.Item className="workflow-menu-item" disabled={returnRequested} onSelect={() => { requestSupplierReturn(itemId); }}>{returnRequested ? 'Supplier Return Requested' : 'Request Supplier Return'}</DropdownMenu.Item>
          <DropdownMenu.Separator className="workflow-menu-separator" />
          <DropdownMenu.Item className="workflow-menu-item workflow-menu-item--destructive" onSelect={() => open('dispose')}>Confirm Disposed</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>

    <Dialog.Root open={action !== null} onOpenChange={isOpen => { if (!isOpen) setAction(null); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="ui-dialog-overlay" />
        <Dialog.Content className="ui-dialog-content">
          <form onSubmit={submit}>
            <header className="ui-dialog-header">
              <Dialog.Title className="ui-dialog-title">{title}</Dialog.Title>
              <Dialog.Description className="ui-dialog-description">{description}</Dialog.Description>
            </header>

            {(action === 'quarantine' || action === 'dispose') && <label className="workflow-field">
              <span>Reason <b aria-hidden="true">*</b></span>
              <select className="ui-select" value={reason} onChange={event => setReason(event.target.value as WorkflowReason | '')} required>
                <option value="" disabled>Select a reason</option>
                {reasons.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>}

            {(action === 'flag' || action === 'note' || action === 'dispose') && <label className="workflow-field">
              <span>{action === 'flag' ? 'Note (optional)' : action === 'dispose' ? 'Additional details (optional)' : 'Note'}</span>
              <textarea className="ui-textarea" value={note} onChange={event => setNote(event.target.value)} rows={3} maxLength={500} placeholder={action === 'flag' ? 'Describe what Admin should review…' : action === 'dispose' ? 'Add any compliance details…' : 'Write a note for this batch…'} required={action === 'note'} />
            </label>}

            <footer className="ui-dialog-footer">
              <Dialog.Close asChild><Button variant="outline">Cancel</Button></Dialog.Close>
              <Button variant={action === 'dispose' ? 'destructive' : 'default'} type="submit">
                {action === 'flag' ? 'Send for review' : action === 'note' ? 'Save note' : action === 'quarantine' ? 'Move to quarantine' : 'Confirm disposed'}
              </Button>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
}
