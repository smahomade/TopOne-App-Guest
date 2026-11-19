// Emails people about messages they haven't read.
//
// The email-unread-messages cron job (scripts/message_notifications.sql)
// calls this once a minute whenever something is due. The database decides
// what is due and who it goes to; this function writes and sends the emails
// through Resend, then tells the database which ones went out.
//
//   customer message nobody at the salon has opened -> the salon location's email
//   salon reply the customer hasn't opened          -> the customer's sign-in email
//
// Secrets (Supabase dashboard -> Edge Functions -> Secrets):
//   RESEND_API_KEY      Resend API key with sending access.
//   NOTIFY_FROM         Sender on a domain verified in Resend,
//                       e.g. "TopOne <bookings@topone.co.uk>".
//   SALON_NOTIFY_EMAIL  Optional. Where salon emails go when the salon
//                       location has no valid email address.
//
// Deploy with JWT checking off. The cron job proves itself with the
// x-notify-token header instead, which the database checks:
//   supabase functions deploy notify-unread-messages --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';

type PendingMessage = {
  content: string;
  created_at: string;
  id: string;
};

type EmailGroup = {
  conversation_id: string;
  customer_name: string | null;
  is_booking: boolean;
  location_email: string | null;
  location_name: string | null;
  messages: PendingMessage[];
  to_email: string | null;
  to_salon: boolean;
};

type Email = {
  html: string;
  subject: string;
  text: string;
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const NOTIFY_FROM = Deno.env.get('NOTIFY_FROM') ?? '';
const SALON_NOTIFY_EMAIL = Deno.env.get('SALON_NOTIFY_EMAIL') ?? '';

// Resend's default limit is a few requests a second.
const PAUSE_BETWEEN_EMAILS_MS = 600;

const BOOKING_REQUEST_PATTERN = /^\s*(\[LOC:[^\]]+\]\s*)?(\[CONVO:[^\]]+\]\s*)?\[?BOOKING_REQUEST\]?/;

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  month: 'short',
  timeZone: 'Europe/London',
  weekday: 'short',
});

// Projects on the new API keys get SUPABASE_SECRET_KEYS; older ones only
// have the legacy service role key.
function secretKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');

    if (typeof keys.default === 'string' && keys.default.length > 0) {
      return keys.default;
    }
  } catch {
    // Fall back to the legacy key below.
  }

  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', secretKey(), {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const token = request.headers.get('x-notify-token');

  if (!token) {
    return new Response('Not authorised', { status: 401 });
  }

  // Checked before claiming anything, so a missing secret doesn't use up
  // the retries.
  if (!RESEND_API_KEY || !NOTIFY_FROM) {
    console.error('Set RESEND_API_KEY and NOTIFY_FROM in Edge Functions -> Secrets.');
    return new Response('Not configured', { status: 500 });
  }

  const { data, error } = await supabase.rpc('claim_message_emails', { token });

  if (error) {
    if (error.code === '42501') {
      return new Response('Not authorised', { status: 401 });
    }

    console.error('claim_message_emails failed:', error.message);
    return new Response('Could not read messages', { status: 500 });
  }

  const groups = (data ?? []) as EmailGroup[];
  let sent = 0;
  let failed = 0;

  for (const [index, group] of groups.entries()) {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_EMAILS_MS));
    }

    const failure = await sendEmail(group);
    const { error: recordError } = await supabase.rpc('record_message_emails', {
      failure,
      message_ids: group.messages.map((message) => message.id),
    });

    if (recordError) {
      console.error('record_message_emails failed:', recordError.message);
    }

    if (failure) {
      failed += 1;
      console.error(`Email for conversation ${group.conversation_id} not sent: ${failure}`);
    } else {
      sent += 1;
    }
  }

  return Response.json({ failed, sent });
});

/** Sends one email. Returns null when it was sent, or why it wasn't. */
async function sendEmail(group: EmailGroup): Promise<string | null> {
  const to = group.to_salon
    ? validEmail(group.to_email) ?? validEmail(SALON_NOTIFY_EMAIL)
    : validEmail(group.to_email);

  if (!to) {
    return group.to_salon
      ? 'The salon location has no valid email address and SALON_NOTIFY_EMAIL is not set.'
      : 'The customer has no email address.';
  }

  const email = group.to_salon ? salonEmail(group) : customerEmail(group);
  // So a customer who replies to the email reaches a real inbox.
  const replyTo = group.to_salon ? null : validEmail(group.location_email) ?? validEmail(SALON_NOTIFY_EMAIL);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      body: JSON.stringify({
        from: NOTIFY_FROM,
        html: email.html,
        subject: email.subject,
        text: email.text,
        to: [to],
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        // A retry of the same messages after a timeout isn't sent twice.
        'Idempotency-Key': await idempotencyKey(group),
      },
      method: 'POST',
    });

    if (response.ok) {
      return null;
    }

    return `Resend ${response.status}: ${(await response.text()).slice(0, 300)}`;
  } catch (sendError) {
    return sendError instanceof Error ? sendError.message : String(sendError);
  }
}

function salonEmail(group: EmailGroup): Email {
  const name = group.customer_name ?? 'A customer';
  const salon = salonName(group);
  const hasRequest = group.messages.some((message) => BOOKING_REQUEST_PATTERN.test(message.content));
  const count = group.messages.length;
  const what = hasRequest ? 'a booking request' : count === 1 ? 'a message' : `${count} messages`;
  const subject = hasRequest
    ? `New booking request from ${name}`
    : count === 1
      ? `New message from ${name}`
      : `${count} new messages from ${name}`;
  const intro = `${name} sent ${what} to ${salon}, and nobody has opened ${count === 1 ? 'it' : 'them'} in the app yet.`;
  const outro = 'Reply in the TopOne Admin app, under Messages, so the customer sees it in their app.';

  return {
    html: layout(intro, group.messages, outro),
    subject,
    text: plainText(intro, group.messages, outro),
  };
}

function customerEmail(group: EmailGroup): Email {
  const firstName = group.customer_name?.split(' ')[0];
  const salon = salonName(group);
  const about = group.is_booking ? 'your booking request' : 'your message';
  const greeting = firstName ? `Hi ${firstName},` : 'Hello,';
  const intro = `${greeting} ${salon} has replied to ${about}:`;
  const outro = 'Open the TopOne app and go to Messages to see the whole conversation and reply.';

  return {
    html: layout(intro, group.messages, outro),
    subject: `${salon} replied to ${about}`,
    text: plainText(intro, group.messages, outro),
  };
}

function salonName(group: EmailGroup): string {
  return group.location_name ? `TopOne ${group.location_name}` : 'TopOne';
}

/** The message as the app shows it, without the tags the apps add. */
function readableContent(content: string): string {
  const isRequest = BOOKING_REQUEST_PATTERN.test(content);
  let text = content
    .replace(/^\s*\[LOC:[^\]]+\]\s*/, '')
    .replace(/^\s*\[CONVO:[^\]]+\]\s*/, '')
    .replace(/^\s*\[?BOOKING_REQUEST\]?\s*/, '');

  if (isRequest) {
    // Booking requests end with a note to the customer, "(Please ... wait
    // for an admin to respond)", which the salon doesn't need.
    text = text
      .split('\n\n')
      .filter((part) => !part.trim().startsWith('(Please'))
      .join('\n\n');
  }

  return text.trim();
}

function layout(intro: string, messages: PendingMessage[], outro: string): string {
  const blocks = messages
    .map(
      (message) => `
      <div style="margin:16px 0;padding:12px 16px;border-left:3px solid #8ED1FC;background:#f5f7fa;border-radius:4px">
        <div style="font-size:12px;color:#6b7280;margin-bottom:6px">${escapeHtml(formatTime(message.created_at))}</div>
        <div style="white-space:pre-line;font-size:15px;line-height:1.5;color:#111827">${escapeHtml(readableContent(message.content))}</div>
      </div>`
    )
    .join('');

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827">
    <div style="max-width:560px;margin:0 auto">
      <p style="font-size:15px;line-height:1.5">${escapeHtml(intro)}</p>
      ${blocks}
      <p style="font-size:15px;line-height:1.5">${escapeHtml(outro)}</p>
    </div>
  </body>
</html>`;
}

function plainText(intro: string, messages: PendingMessage[], outro: string): string {
  const blocks = messages.map((message) => `${formatTime(message.created_at)}\n${readableContent(message.content)}`);

  return [intro, ...blocks, outro].join('\n\n');
}

function formatTime(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? '' : timeFormat.format(date);
}

function validEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';

  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed) ? trimmed : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function idempotencyKey(group: EmailGroup): Promise<string> {
  const ids = group.messages.map((message) => message.id).sort().join(',');
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${group.conversation_id}:${group.to_salon}:${ids}`)
  );
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

  return `unread-messages-${hex}`;
}
