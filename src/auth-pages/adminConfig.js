export const ADMIN_EMAILS = [
  "liyanafiera@gmail.com"
];

export function isAdmin(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}