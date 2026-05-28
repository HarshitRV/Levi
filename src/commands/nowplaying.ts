import { SlashCommandBuilder } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import type { Command } from "../types.ts";
import { warnEmbed } from "../utils/embeds.ts";
import { buildNowPlayingPayload } from "./_nowplaying.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Show the currently playing track."),
  async execute(interaction) {
    await interaction.deferReply();

    const queue = queueManager.get(interaction.guildId ?? "");
    if (!queue || !queue.current) {
      await interaction.editReply({
        embeds: [warnEmbed("Nothing is playing.")],
      });
      return;
    }

    await interaction.editReply(buildNowPlayingPayload(queue));
  },
};

export default command;
