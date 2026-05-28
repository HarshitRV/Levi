import { SlashCommandBuilder } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import type { Command } from "../types.ts";
import { successEmbed, warnEmbed } from "../utils/embeds.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the current track."),
  async execute(interaction) {
    const queue = queueManager.get(interaction.guildId ?? "");
    if (!queue || !queue.current) {
      await interaction.reply({
        embeds: [warnEmbed("Nothing is playing.")],
        ephemeral: true,
      });
      return;
    }
    if (!queue.pause()) {
      await interaction.reply({
        embeds: [warnEmbed("Already paused.")],
        ephemeral: true,
      });
      return;
    }
    await interaction.reply({ embeds: [successEmbed("Paused.")] });
  },
};

export default command;
