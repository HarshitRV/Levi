import { SlashCommandBuilder } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import type { Command } from "../types.ts";
import { successEmbed, warnEmbed } from "../utils/embeds.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("previous")
    .setDescription("Go back to the previous track."),
  async execute(interaction) {
    await interaction.deferReply();

    const queue = queueManager.get(interaction.guildId ?? "");
    if (!queue) {
      await interaction.editReply({
        embeds: [warnEmbed("Nothing is playing.")],
      });
      return;
    }
    if (!queue.previous()) {
      await interaction.editReply({
        embeds: [warnEmbed("No previous track in history.")],
      });
      return;
    }
    await interaction.editReply({
      embeds: [successEmbed("Rewinding to previous track.")],
    });
  },
};

export default command;
