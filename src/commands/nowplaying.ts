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
    const queue = queueManager.get(interaction.guildId ?? "");
    if (!queue || !queue.current) {
      await interaction.reply({
        embeds: [warnEmbed("Nothing is playing.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.reply(buildNowPlayingPayload(queue));
  },
};

export default command;
