"use client";
import { useState } from "react";
export default function Login() {
  const [pw, setPw] = useState(""); const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    const r = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (r.ok) location.href = "/"; else setErr("Sai mật khẩu");
  };
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <form onSubmit={submit} className="card" style={{ width: 360, textAlign: "center" }}>
        <img src="/quote-assets/i-000.png" alt="STC CROP" style={{ height: 70 }} />
        <h2 style={{ marginTop: 14 }}>STC Quote AI</h2>
        <p className="note">Bóc BOQ từ bản vẽ điện & lập báo giá FPT Smart Home</p>
        <input type="password" placeholder="Mật khẩu nội bộ" value={pw} onChange={(e) => setPw(e.target.value)} style={{ width: "100%", margin: "10px 0" }} autoFocus />
        <button className="primary" style={{ width: "100%" }}>Đăng nhập</button>
        {err && <p className="err">{err}</p>}
      </form>
    </div>
  );
}
