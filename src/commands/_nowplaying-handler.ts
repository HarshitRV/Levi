import { MessageFlags, type ButtonInteraction } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import type { GuildQueue } from "../music/guild-queue.ts";
import { errorEmbed } from "../utils/embeds.ts";
import { logger } from "../utils/logger.ts";
import {
  buildNothingPlayingPayload,
  buildNowPlayingPayload,
  buildQueueEndedPayload,
  parseControlAction,
} from "./_nowplaying.ts";

const log = logger.scope("nowplaying");

/**
 * Pre-check used after `interaction.deferUpdate()` has already acked the
 * button click. Warnings are sent as ephemeral follow-ups so they're only
 * visible to the user who clicked — the original now-playing message stays
 * intact for everyone else.
 */
async function requireSameVoice(
  interaction: ButtonInteraction,
  botVoiceChannelId: string | null,
): Promise<boolean> {
  if (!interaction.inCachedGuild()) {
    await interaction.followUp({
      embeds: [errorEmbed("This can only be used in a server.")],
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }

  const voiceChannel = interaction.member.voice.channel;
  if (!voiceChannel) {
    await interaction.followUp({
      embeds: [errorEmbed("You need to be in a voice channel first.")],
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }

  if (!botVoiceChannelId || voiceChannel.id !== botVoiceChannelId) {
    log.warn("permission-rejected", {
      reason: "wrong-voice-channel",
      guildId: interaction.guildId,
      userId: interaction.user.id,
      userChannelId: voiceChannel.id,
      botChannelId: botVoiceChannelId,
    });
    await interaction.followUp({
      embeds: [
        errorEmbed(
          "Wrong voice channel",
          "You must be in the same voice channel as the bot.",
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }

  return true;
}

async function waitForTrackTransition(
  queue: GuildQueue,
  beforeUrl: string | null,
  maxMs = 5_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const current = queue.current;
    if (current === null) return;
    if (beforeUrl === null || current.url !== beforeUrl) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

export async function handleNowPlayingButton(
  interaction: ButtonInteraction,
): Promise<void> {
  const action = parseControlAction(interaction.customId);
  if (!action) return;

  // Defer the update first thing so the 3-second ack window is reserved
  // before any further work. After this, the original message stays as-is
  // until we call editReply(), and we can followUp() with ephemeral warnings
  // to the clicker without disturbing other viewers.
  await interaction.deferUpdate();

  const guildId = interaction.guildId ?? "";
  log.info("button-action", {
    action,
    guildId,
    userId: interaction.user.id,
  });

  const queue = queueManager.get(guildId);
  const ok = await requireSameVoice(interaction, queue?.voiceChannelId ?? null);
  if (!ok) return;

  if (!queue) {
    await interaction.editReply(buildNothingPlayingPayload());
    return;
  }

  switch (action) {
    case "stop": {
      queueManager.destroy(guildId);
      await interaction.editReply(buildQueueEndedPayload());
      return;
    }
    case "pause": {
      if (!queue.current) {
        await interaction.editReply(buildNothingPlayingPayload());
        return;
      }
      queue.pause();
      await interaction.editReply(buildNowPlayingPayload(queue));
      return;
    }
    case "resume": {
      if (!queue.current) {
        await interaction.editReply(buildNothingPlayingPayload());
        return;
      }
      queue.resume();
      await interaction.editReply(buildNowPlayingPayload(queue));
      return;
    }
    case "shuffle": {
      if (!queue.current) {
        await interaction.editReply(buildNothingPlayingPayload());
        return;
      }
      queue.shuffle();
      await interaction.editReply(buildNowPlayingPayload(queue));
      return;
    }
    case "skip": {
      if (!queue.current) {
        await interaction.editReply(buildNothingPlayingPayload());
        return;
      }
      const beforeUrl = queue.current.url;
      if (!queue.skip()) {
        await interaction.editReply(buildNothingPlayingPayload());
        return;
      }
      await waitForTrackTransition(queue, beforeUrl);
      if (!queue.current) {
        await interaction.editReply(buildNothingPlayingPayload());
        return;
      }
      await interaction.editReply(buildNowPlayingPayload(queue));
      return;
    }
    case "prev": {
      if (!queue.current) {
        await interaction.editReply(buildNothingPlayingPayload());
        return;
      }
      const beforeUrl = queue.current.url;
      if (!queue.previous()) {
        await interaction.editReply(buildNowPlayingPayload(queue));
        return;
      }
      await waitForTrackTransition(queue, beforeUrl);
      if (!queue.current) {
        await interaction.editReply(buildNothingPlayingPayload());
        return;
      }
      await interaction.editReply(buildNowPlayingPayload(queue));
      return;
    }
  }
}
