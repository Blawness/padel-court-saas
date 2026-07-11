import { Resend } from "resend";
import { isResendConfigured } from "@/lib/env";
import { formatIDR, formatSlot } from "@/lib/format";

type BookingEmail = {
  to: string;
  playerName: string;
  venueName: string;
  courtName: string;
  start: Date;
  end: Date;
  amount: number;
};

/** Booking confirmation + receipt. Logs to the console when Resend isn't configured. */
export async function sendBookingConfirmation(data: BookingEmail): Promise<void> {
  const subject = `Booking terkonfirmasi — ${data.venueName}`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px">
      <h2 style="color:#16a34a">Booking kamu terkonfirmasi 🎾</h2>
      <p>Halo ${data.playerName}, pembayaranmu sudah kami terima.</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="padding:6px 0;color:#64748b">Venue</td><td><b>${data.venueName}</b></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Court</td><td><b>${data.courtName}</b></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Waktu</td><td><b>${formatSlot(data.start, data.end)}</b></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Total dibayar</td><td><b>${formatIDR(data.amount)}</b></td></tr>
      </table>
      <p style="color:#64748b;font-size:12px">Batalkan gratis paling lambat 2 jam sebelum jadwal main.</p>
    </div>`;

  if (!isResendConfigured) {
    console.info(`[email:mock] to=${data.to} subject="${subject}"`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM ?? "Padel Booking <onboarding@resend.dev>";
  try {
    await resend.emails.send({ from, to: data.to, subject, html });
  } catch (err) {
    // Email must never fail the payment webhook.
    console.error("[email] gagal mengirim konfirmasi booking:", err);
  }
}
