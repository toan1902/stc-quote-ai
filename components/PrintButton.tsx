"use client";
export default function PrintButton({ label = "Tải / In PDF" }: { label?: string }) {
  return <button onClick={() => window.print()}>{label}</button>;
}
