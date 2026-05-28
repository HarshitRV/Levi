import { SlashCommandBuilder } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import { resolveTracks } from "../music/ytdlp.ts";
import type { Command } from "../types.ts";
import { errorEmbed, infoEmbed, trackAddedEmbed } from "../utils/embeds.ts";
import { truncate } from "../utils/format.ts";
import { logger } from "../utils/logger.ts";
import { buildNowPlayingPayload } from "./_nowplaying.ts";
import { requireVoice } from "./_shared.ts";

const log = logger.scope("play");

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song or playlist (URL or search query).")
    .addStringOption((o) =>
      o
        .setName("query")
        .setDescription("YouTube URL, playlist URL, or search text.")
        .setRequired(true),
    ),
  async execute(interaction) {
    const ctx = await requireVoice(interaction);
    if (!ctx) return;

    const query = interaction.options.getString("query", true);
    log.info("play-requested", {
      query: truncate(query, 120),
      guildId: interaction.guildId,
      userId: interaction.user.id,
      voiceChannelId: ctx.voiceChannel.id,
    });

    await interaction.deferReply();

    let tracks;
    try {
      tracks = await resolveTracks(
        query,
        interaction.user.id,
        ctx.member.displayName,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.warn("play-resolution-failed", {
        query: truncate(query, 120),
        guildId: interaction.guildId,
        userId: interaction.user.id,
        reason: message,
      });
      await interaction.editReply({
        embeds: [errorEmbed("Could not load that track", message)],
      });
      return;
    }

    log.info("play-resolved", {
      trackCount: tracks.length,
      firstTitle: tracks[0]?.title ?? null,
      guildId: interaction.guildId,
    });

    const queue = queueManager.getOrCreate(
      interaction.guildId!,
      ctx.voiceChannel,
      ctx.textChannel,
    );

    if (tracks.length === 1) {
      const track = tracks[0]!;
      const position = queue.enqueue(track);
      await queue.ensurePlaying();
      if (position === 0) {
        await interaction.editReply(buildNowPlayingPayload(queue));
      } else {
        await interaction.editReply({
          embeds: [trackAddedEmbed(track, position)],
        });
      }
      return;
    }

    queue.enqueueMany(tracks);
    await queue.ensurePlaying();
    await interaction.editReply({
      embeds: [
        infoEmbed("Added playlist", `Queued **${tracks.length}** tracks.`),
      ],
    });
  },
};

export default command;
