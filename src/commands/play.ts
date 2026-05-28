import { SlashCommandBuilder } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import { resolveTracks } from "../music/ytdlp.ts";
import type { Command } from "../types.ts";
import { errorEmbed, infoEmbed, trackAddedEmbed } from "../utils/embeds.ts";
import { buildNowPlayingPayload } from "./_nowplaying.ts";
import { requireVoice } from "./_shared.ts";

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
      await interaction.editReply({
        embeds: [errorEmbed("Could not load that track", message)],
      });
      return;
    }

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
