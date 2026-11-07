"use client";
import { useEffect, useState } from "react";
import type { PrintPayload } from "@/components/QuoteEditor";
import QuoteDoc from "@/components/QuoteDoc";

export default function PrintQuote() {
  const [d, setD] = useState<PrintPayload | null>(null);
  useEffect(() => {
    // full payload (with drawing images) is handed over by the opener window; localStorage keeps a light copy for reloads
    try {
      const fromOpener = (window.opener as (Window & { stcPrint?: PrintPayload }) | null)?.stcPrint;
      setD(fromOpener ?? JSON.parse(localStorage.getItem("stc_print") || "null"));
    } catch { try { setD(JSON.parse(localStorage.getItem("stc_print") || "null")); } catch { setD(null); } }
  }, []);
  if (!d) return <p style={{ padding: 40 }}>Không có dữ liệu báo giá – quay lại app và bấm “In / Lưu PDF”.</p>;
  return <QuoteDoc d={d} />;
}
