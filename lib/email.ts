import { getCategoryIcon } from "./categories";

interface DigestItem {
  title: string;
  summary: string;
  url: string | null;
  category: string;
}

interface DigestData {
  userName: string;
  weekLabel: string;
  newCount: number;
  unreadCount: number;
  totalCount: number;
  staleCount: number;
  newItemsByCategory: Record<string, DigestItem[]>;
  appUrl: string;
}

export function buildDigestEmail(data: DigestData): { subject: string; html: string } {
  const { userName, weekLabel, newCount, unreadCount, totalCount, staleCount, newItemsByCategory, appUrl } = data;

  const hasNew = newCount > 0;
  const categoryEntries = Object.entries(newItemsByCategory);

  const newItemsHtml = hasNew ? `
    <tr>
      <td style="padding:0 32px 8px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;border-bottom:1px solid #f1f5f9;padding-bottom:10px;margin-bottom:20px">
          ✨ Added This Week
        </div>
        ${categoryEntries.map(([cat, items]) => `
          <div style="margin-bottom:24px">
            <div style="font-size:13px;font-weight:600;color:#374151;margin-bottom:10px">
              ${getCategoryIcon(cat)} ${cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, " ")}
            </div>
            ${items.slice(0, 5).map((item) => `
              <div style="border-left:3px solid #e0e7ff;padding:10px 14px;margin-bottom:8px;border-radius:0 6px 6px 0;background:#fafafa">
                <div style="font-size:14px;font-weight:600;color:#111827;line-height:1.3">${escHtml(item.title)}</div>
                <div style="font-size:13px;color:#6b7280;margin-top:5px;line-height:1.5">${escHtml(item.summary)}</div>
                ${item.url ? `<a href="${item.url}" style="display:inline-block;margin-top:8px;font-size:12px;color:#4f46e5;text-decoration:none;font-weight:500">Open link →</a>` : ""}
              </div>
            `).join("")}
            ${items.length > 5 ? `<div style="font-size:12px;color:#9ca3af;padding-left:14px">+${items.length - 5} more in ${cat}</div>` : ""}
          </div>
        `).join("")}
      </td>
    </tr>
  ` : "";

  const staleHtml = staleCount > 0 ? `
    <tr>
      <td style="padding:0 32px 24px">
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;display:flex;align-items:flex-start;gap:12px">
          <div style="font-size:20px;line-height:1">📌</div>
          <div>
            <div style="font-size:14px;font-weight:600;color:#92400e">Reading backlog</div>
            <div style="font-size:13px;color:#78350f;margin-top:3px;line-height:1.5">
              ${staleCount} item${staleCount > 1 ? "s have" : " has"} been sitting unread for 30+ days. Worth a revisit!
            </div>
          </div>
        </div>
      </td>
    </tr>
  ` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Weekly Digest — Personal Stash</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;-webkit-font-smoothing:antialiased">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9">
    <tr>
      <td align="center" style="padding:40px 16px 60px">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4f46e5 100%);padding:44px 32px 40px;text-align:center">
              <div style="font-size:32px;margin-bottom:6px">📚</div>
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">Personal Stash</div>
              <div style="font-size:13px;color:#a5b4fc;margin-top:8px;font-weight:500">Weekly Digest · ${escHtml(weekLabel)}</div>
              <div style="font-size:15px;color:#e0e7ff;margin-top:12px">Hey ${escHtml(userName)} 👋</div>
            </td>
          </tr>

          <!-- Stats row -->
          <tr>
            <td style="padding:32px 32px 28px">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="31%" style="background:#f8fafc;border-radius:12px;padding:18px 12px;text-align:center;border:1px solid #f1f5f9">
                    <div style="font-size:34px;font-weight:800;color:#4f46e5;line-height:1">${newCount}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:6px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">New this week</div>
                  </td>
                  <td width="3%"></td>
                  <td width="31%" style="background:#f8fafc;border-radius:12px;padding:18px 12px;text-align:center;border:1px solid #f1f5f9">
                    <div style="font-size:34px;font-weight:800;color:#f59e0b;line-height:1">${unreadCount}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:6px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Unread</div>
                  </td>
                  <td width="3%"></td>
                  <td width="32%" style="background:#f8fafc;border-radius:12px;padding:18px 12px;text-align:center;border:1px solid #f1f5f9">
                    <div style="font-size:34px;font-weight:800;color:#10b981;line-height:1">${totalCount}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:6px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Total saved</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${newItemsHtml}
          ${staleHtml}

          <!-- CTA -->
          <tr>
            <td style="padding:8px 32px 40px;text-align:center">
              <a href="${appUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-weight:600;font-size:15px;letter-spacing:0.01em;box-shadow:0 2px 8px rgba(79,70,229,0.35)">
                Open Personal Stash →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #f1f5f9;padding:20px 32px;text-align:center">
              <div style="font-size:12px;color:#9ca3af;line-height:1.6">
                You're receiving this weekly digest because you use Personal Stash.<br>
                <a href="${appUrl}" style="color:#9ca3af;text-decoration:underline">Manage preferences</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const subject = newCount > 0
    ? `📚 Your weekly digest — ${newCount} new item${newCount > 1 ? "s" : ""} saved`
    : `📚 Your weekly digest — ${unreadCount} item${unreadCount > 1 ? "s" : ""} waiting to be read`;

  return { subject, html };
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
