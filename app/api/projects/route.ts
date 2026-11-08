import { NextResponse } from "next/server";
import { storageReady } from "@/lib/server/shares";
import { listStored, readConfig, upsertConfig, upsertStored, validProjectId, type StoredConfig, type StoredProject } from "@/lib/server/projects";

export const runtime = "nodejs";
export const maxDuration = 60;

const notReady = () => NextResponse.json({ error: "Chưa bật kho lưu trữ (Vercel Blob)" }, { status: 503 });

/** Danh sách hồ sơ khách + bảng giá/cài đặt dùng chung (nhân viên – middleware bắt đăng nhập). */
export async function GET() {
  if (!storageReady()) return notReady();
  const [projects, config] = await Promise.all([listStored(), readConfig()]);
  return NextResponse.json({ projects, config }, { headers: { "cache-control": "no-store" } });
}

/** Gửi lên các hồ sơ đã sửa (bản mới hơn thắng; xoá = { id, deleted: true, updatedAt }). */
export async function POST(req: Request) {
  if (!storageReady()) return notReady();
  const body = (await req.json().catch(() => null)) as { projects?: StoredProject[]; config?: StoredConfig } | null;
  if (!body) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  const kept: StoredProject[] = []; const errors: string[] = [];
  for (const p of (body.projects ?? []).slice(0, 200)) {
    if (!p?.id || !validProjectId(p.id)) { errors.push(`id sai: ${String(p?.id)}`); continue; }
    if (JSON.stringify(p).length > 2_000_000) { errors.push(`${p.id}: hồ sơ quá lớn`); continue; }
    if (!p.updatedAt) p.updatedAt = new Date().toISOString();
    kept.push((await upsertStored(p)).kept);
  }
  const config = body.config?.updatedAt ? (await upsertConfig(body.config)).kept : undefined;
  return NextResponse.json({ projects: kept, config, errors });
}
