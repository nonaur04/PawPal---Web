export const ADMIN_EMAILS = [
  "faiz.rahman@pawpal.my",
  // "liyanafiera@gmail.com",
];

export function isAdmin(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}