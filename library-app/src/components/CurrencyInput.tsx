import { useState } from 'react';
import { formatGhc } from '../utils/currency';

interface CurrencyInputProps {
  id?: string;
  value: number | '';
  onChange: (value: number | '') => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
}

export default function CurrencyInput({ id, value, onChange, className, placeholder, required, min = 0 }: CurrencyInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const shownValue = value === '' ? '' : focused ? draft : formatGhc(value).slice(3);

  return (
    <span className="currency-input-shell">
      <span className="currency-input-prefix">GH₵</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={shownValue}
        placeholder={placeholder}
        required={required}
        className={className}
        onFocus={() => {
          setDraft(value === '' ? '' : String(value));
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        onChange={event => {
          const raw = event.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
          setDraft(raw);
          if (!raw) onChange('');
          else {
            const parsed = Number(raw);
            if (Number.isFinite(parsed) && parsed >= min) onChange(parsed);
          }
        }}
        aria-label="Amount in Ghana cedis"
      />
    </span>
  );
}
