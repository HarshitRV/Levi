import type { ButtonInteraction } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import type { GuildQueue } from "../music/guild-queue.ts";
import { errorEmbed } from "../utils/embeds.ts";
import {
  buildNothingPlayingPayload,
  buildNowPlayingPayload,
  buildQueueEndedPayload,
  parseControlAction,
} from "./_nowplaying.ts";

async function requireSameVoice(
  interaction: ButtonInteraction,
  botVoiceChannelId: string | null,
): Promise<boolean> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      embeds: [errorEmbed("This can only be used in a server.")],
      ephemeral: true,
    });
    return false;
  }

  const voiceChannel = interaction.member.voice.channel;
  if (!voiceChannel) {
    await interaction.reply({
      embeds: [errorEmbed("You need to be in a voice channel first.")],
      ephemeral: true,
    });
    return false;
  }

  if (!botVoiceChannelId || voiceChannel.id !== botVoiceChannelId) {
    await interaction.reply({
      embeds: [
        errorEmbed(
          "Wrong voice channel",
          "You must be in the same voice channel as the bot.",
        ),
      ],
      ephemeral: true,
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

  const guildId = interaction.guildId ?? "";
  const queue = queueManager.get(guildId);
  const ok = await requireSameVoice(interaction, queue?.voiceChannelId ?? null);
  if (!ok) return;

  if (!queue) {
    await interaction.update(buildNothingPlayingPayload());
    return;
  }

  switch (action) {
    case "stop": {
      queueManager.destroy(guildId);
      await interaction.update(buildQueueEndedPayload());
      return;
    }
    case "pause": {
      if (!queue.current) {
        await interaction.update(buildNothingPlayingPayload());
        return;
      }
      queue.pause();
      await interaction.update(buildNowPlayingPayload(queue));
      return;
    }
    case "resume": {
      if (!queue.current) {
        await interaction.update(buildNothingPlayingPayload());
        return;
      }
      queue.resume();
      await interaction.update(buildNowPlayingPayload(queue));
      return;
    }
    case "shuffle": {
      if (!queue.current) {
        await interaction.update(buildNothingPlayingPayload());
        return;
      }
      queue.shuffle();
      await interaction.update(buildNowPlayingPayload(queue));
      return;
    }
    case "skip": {
      if (!queue.current) {
        await interaction.update(buildNothingPlayingPayload());
        return;
      }
      const beforeUrl = queue.current.url;
      if (!queue.skip()) {
        await interaction.update(buildNothingPlayingPayload());
        return;
      }
      await waitForTrackTransition(queue, beforeUrl);
      if (!queue.current) {
        await interaction.update(buildNothingPlayingPayload());
        return;
      }
      await interaction.update(buildNowPlayingPayload(queue));
      return;
    }
    case "prev": {
      if (!queue.current) {
        await interaction.update(buildNothingPlayingPayload());
        return;
      }
      const beforeUrl = queue.current.url;
      if (!queue.previous()) {
        await interaction.update(buildNowPlayingPayload(queue));
        return;
      }
      await waitForTrackTransition(queue, beforeUrl);
      if (!queue.current) {
        await interaction.update(buildNothingPlayingPayload());
        return;
      }
      await interaction.update(buildNowPlayingPayload(queue));
      return;
    }
  }
}
