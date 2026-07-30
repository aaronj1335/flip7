import React, { useState } from 'react';

interface PointsInputProps {
  value: number;
  label: string;
  disabled?: boolean;
  onChange: (points: number) => void;
}

export const PointsInput: React.FC<PointsInputProps> = ({
  value,
  label,
  disabled = false,
  onChange,
}) => {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <input
      className="hand-points"
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={label}
      disabled={disabled}
      value={editing ?? String(value)}
      onFocus={(event) => {
        setEditing(String(value));
        event.currentTarget.select();
      }}
      onBlur={() => setEditing(null)}
      onChange={(event) => {
        const raw = event.target.value.trim();
        if (!/^\d{0,4}$/.test(raw)) {
          return;
        }
        setEditing(raw);
        onChange(raw === '' ? 0 : Number.parseInt(raw, 10));
      }}
    />
  );
};
