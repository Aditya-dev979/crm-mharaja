import { useRef } from "react";

export default function OtpInput({
  value,
  onChange,
  length = 6,
  invalid = false,
}: {
  value: string[];
  onChange: (digits: string[]) => void;
  length?: number;
  invalid?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setDigit = (index: number, digit: string) => {
    const next = [...value];
    next[index] = digit;
    onChange(next);
  };

  return (
    <div className={invalid ? "otp-row invalid" : "otp-row"} role="group" aria-label="One-time passcode">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={el => {
            refs.current[i] = el;
          }}
          value={value[i] ?? ""}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          onChange={e => {
            const digit = e.target.value.replace(/\D/g, "").slice(-1);
            setDigit(i, digit);
            if (digit && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={e => {
            if (e.key === "Backspace" && !value[i] && i > 0) {
              refs.current[i - 1]?.focus();
            }
            if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onPaste={e => {
            e.preventDefault();
            const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length).split("");
            if (!digits.length) return;
            onChange(Array.from({ length }, (_, idx) => digits[idx] ?? ""));
            refs.current[Math.min(digits.length, length - 1)]?.focus();
          }}
        />
      ))}
    </div>
  );
}
