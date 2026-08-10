"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { setCallStatus } from "@/app/actions/admin";
import type { CallStatus } from "@/lib/types";

const OPTIONS: CallStatus[] = ["not_booked", "booked", "completed"];

export function CallStatusSelect({ email, status }: { email: string; status: CallStatus }) {
  const [value, setValue] = useState(status);
  const [isPending, startTransition] = useTransition();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const previous = value;
    const next = event.target.value as CallStatus;
    setValue(next);
    startTransition(async () => {
      const result = await setCallStatus(email, next);
      if (!result.success) {
        alert(result.error);
        setValue(previous);
      }
    });
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={isPending}
      className="border border-border bg-background px-2 py-1 font-body text-base text-foreground focus:border-accent focus:outline-none disabled:opacity-50"
    >
      {OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
