import * as React from "react";
import { createPortal } from "react-dom";
import { EMAIL } from "@/config";

interface Props {
  /** text: ナビ用のテキストトリガー / icon: メールアイコンのトリガー */
  variant?: "text" | "icon";
  label?: string;
}

function MailIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function ContactDialog({ variant = "text", label = "Contact" }: Props) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard 不可の環境では無視 */
    }
  };

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        aria-label="メールで連絡"
        onClick={() => setOpen(true)}
        className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
      >
        <MailIcon />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        {label}
      </button>
    );

  const overlay =
    open && mounted ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="メールで連絡"
      >
        <div
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
        <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 text-card-foreground shadow-xl">
          <p className="text-xs font-medium text-muted-foreground">
            Contact
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">メールで連絡する</h2>
          <p className="mt-3 select-all break-all rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            {EMAIL}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <a
              href={`mailto:${EMAIL}`}
              onClick={() => setOpen(false)}
              className="inline-flex flex-1 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              メールを送る
            </a>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              {copied ? "コピー済み" : "コピー"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="閉じる"
            className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
    ) : null;

  return (
    <>
      {trigger}
      {overlay ? createPortal(overlay, document.body) : null}
    </>
  );
}
