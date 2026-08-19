import type { CaptureDestination } from "./routeCapture";
import { formatMinutes } from "./format";

export type ReceiptInput = {
  destination: CaptureDestination;
  addedMinutes: number;
  freeMinutes: number;
  unfittedCount: number;
  owedMinutes: number;
  streak: number | null;
};

export type CaptureReceipt = {
  destination: CaptureDestination;
  line: string;
  href: string;
  cta: string;
};

export function captureReceipt(input: ReceiptInput): CaptureReceipt {
  const added = Math.max(0, input.addedMinutes);

  if (input.destination === "queue") {
    return {
      destination: "queue",
      line: `+${formatMinutes(added)} of unread. ${formatMinutes(input.owedMinutes + added)} owed. Read now, or this is furniture.`,
      href: "/session",
      cta: "START SESSION →",
    };
  }

  if (input.destination === "agenda") {
    const over = added > input.freeMinutes || input.unfittedCount > 0;
    return {
      destination: "agenda",
      line: over
        ? `+${formatMinutes(added)}. It does not fit today. Push something, or this becomes midnight debt.`
        : `+${formatMinutes(added)} on the agenda. ${formatMinutes(Math.max(0, input.freeMinutes - added))} still free.`,
      href: "/todos",
      cta: "OPEN TODOS →",
    };
  }

  const streak =
    input.streak === null || input.streak === undefined
      ? "UNKNOWN"
      : String(input.streak);
  return {
    destination: "record",
    line: `Filed to the record. Streak ${streak}.`,
    href: "/til",
    cta: "OPEN RECORD →",
  };
}
