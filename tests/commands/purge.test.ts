import { describe, expect, test } from "bun:test";
import { ChannelType } from "discord.js";
import { canBulkDelete, purgeResult } from "../../src/commands/_purge.ts";

describe("canBulkDelete", () => {
  test("permits text-y guild channels and threads", () => {
    expect(canBulkDelete(ChannelType.GuildText)).toBe(true);
    expect(canBulkDelete(ChannelType.GuildAnnouncement)).toBe(true);
    expect(canBulkDelete(ChannelType.PublicThread)).toBe(true);
    expect(canBulkDelete(ChannelType.PrivateThread)).toBe(true);
    expect(canBulkDelete(ChannelType.AnnouncementThread)).toBe(true);
  });

  test("rejects channel types that Discord's bulkDelete throws on", () => {
    expect(canBulkDelete(ChannelType.DM)).toBe(false);
    expect(canBulkDelete(ChannelType.GroupDM)).toBe(false);
    expect(canBulkDelete(ChannelType.GuildVoice)).toBe(false);
    expect(canBulkDelete(ChannelType.GuildStageVoice)).toBe(false);
    expect(canBulkDelete(ChannelType.GuildForum)).toBe(false);
    expect(canBulkDelete(ChannelType.GuildCategory)).toBe(false);
  });
});

describe("purgeResult", () => {
  test("returns a success outcome when every requested message was deleted", () => {
    const r = purgeResult(10, 10);
    expect(r.kind).toBe("success");
    expect(r.title).toBe("Purged");
    expect(r.description).toBe("Removed 10 message(s).");
    expect(r.description).not.toContain("skipped");
  });

  test("calls out skipped messages when fewer were deleted than requested", () => {
    const r = purgeResult(10, 7);
    expect(r.kind).toBe("success");
    expect(r.title).toBe("Purged");
    expect(r.description).toContain("Removed 7 of 10");
    expect(r.description).toContain("3 skipped");
  });

  test("returns a warn outcome when nothing was deleted", () => {
    const r = purgeResult(10, 0);
    expect(r.kind).toBe("warn");
    expect(r.title).toBe("Nothing to purge");
    expect(r.description).toContain("Skipped all 10");
  });

  test("handles the degenerate requested=0 case without producing nonsense like '-N skipped'", () => {
    const r = purgeResult(0, 0);
    expect(r.kind).toBe("warn");
    expect(r.description).not.toContain("-");
    expect(r.description).toBe("No messages were requested.");
  });
});
