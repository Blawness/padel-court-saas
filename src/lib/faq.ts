/**
 * Shared by the FAQ accordion and the FAQPage JSON-LD on the landing page. Kept in one place
 * so the structured data can never claim an answer the page doesn't actually show — Google
 * treats that as a mismatch and drops the rich result.
 */
export const faqItems = [
  {
    q: "Apakah bayar di awal saat daftar?",
    a: "Tidak. Kamu dapat trial 14 hari gratis. Bayar baru setelah trial habis & kamu puas.",
  },
  {
    q: "Metode pembayaran apa yang didukung?",
    a: "QRIS, GoPay, OVO, Dana, LinkAja, Virtual Account, dan kartu kredit via Midtrans.",
  },
  {
    q: "Bisa kelola lebih dari 1 venue?",
    a: "Bisa. Paket Pro mendukung hingga 5 venue, Enterprise unlimited.",
  },
  {
    q: "Bagaimana kalau ada double booking?",
    a: "Tidak akan terjadi. Slot terkunci real-time saat di-hold hingga pembayaran selesai, dan database menolak dua booking yang bertabrakan di court yang sama.",
  },
] as const;
