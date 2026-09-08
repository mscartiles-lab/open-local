const blockedUserIds = new Set(
  (process.env.BLOCKED_USER_IDS ?? "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0),
);

export function isBlockedUserId(userId: number): boolean {
  return blockedUserIds.has(userId);
}