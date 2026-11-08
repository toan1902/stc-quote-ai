"use client";
import { useEffect } from "react";
/** Báo "khách đã mở link" sau 3 giây trang hiển thị. */
export default function ViewPing({ id, p }: { id: string; p?: string }) {
  useEffect(() => {
    const t = setTimeout(() => { fetch(`/q/${id}/view${p ? `?p=${p}` : ""}`, { method: "POST", keepalive: true }).catch(() => {}); }, 3000);
    return () => clearTimeout(t);
  }, [id, p]);
  return null;
}
