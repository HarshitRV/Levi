// Pure helpers for /purge so the handler can stay thin and the real
// decisions get tested without mocking discord.js.

import { ChannelType } from "discord.js";

/**
 * Channel types that support `Channel#bulkDelete`. DMs, voice channels,
 * forums, stages, etc. don't, and calling bulkDelete on them throws an
 * opaque error from discord.js.
 */
const BULK_DELETE_CHANNELS: ReadonlySet<ChannelType> = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.AnnouncementThread,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
]);

export function canBulkDelete(type: ChannelType): boolean {
  return BULK_DELETE_CHANNELS.has(type);
}

export type PurgeOutcome = {
  kind: "success" | "warn";
  title: string;
  description: string;
};

/**
 * Compute the user-facing result of a purge attempt. Pure so the
 * branching ("nothing happened" vs "some skipped" vs "all good") is
 * unit-testable without spinning up a Discord client.
 */
export function purgeResult(
  requested: number,
  deletedCount: number,
): PurgeOutcome {
  if (deletedCount === 0) {
    return {
      kind: "warn",
      title: "Nothing to purge",
      description:
        requested === 0
          ? "No messages were requested."
          : `Skipped all ${requested} (older than 14 days or already gone).`,
    };
  }

  const skipped = requested - deletedCount;
  if (skipped > 0) {
    return {
      kind: "success",
      title: "Purged",
      description: `Removed ${deletedCount} of ${requested}; ${skipped} skipped (older than 14 days or already gone).`,
    };
  }

  return {
    kind: "success",
    title: "Purged",
    description: `Removed ${deletedCount} message(s).`,
  };
}
