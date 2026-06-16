export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function emailFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || "BuzzDrop <orders@buzzdrop.co.uk>";
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFromAddress(),
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: body.slice(0, 200) };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Send failed" };
  }
}

export function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#18181b;border:1px solid #3f3f46;border-radius:16px;padding:32px;">
          <tr>
            <td style="color:#fafafa;">
              <p style="margin:0 0 24px;font-size:20px;font-weight:700;">
                Buzz<span style="color:#fbbf24;">Drop</span>
              </p>
              ${content}
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;color:#71717a;font-size:12px;">
          BuzzDrop · UK delivery · <a href="https://www.buzzdrop.co.uk" style="color:#a78bfa;">buzzdrop.co.uk</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
