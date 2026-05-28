import { SlashCommandBuilder } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import type { Command } from "../types.ts";
import { successEmbed, warnEmbed } from "../utils/embeds.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume the paused track."),
  async execute(interaction) {
    const queue = queueManager.get(interaction.guildId ?? "");
    if (!queue || !queue.current) {
      await interaction.reply({
        embeds: [warnEmbed("Nothing is playing.")],
        ephemeral: true,
      });
      return;
    }
    if (!queue.resume()) {
      await interaction.reply({
        embeds: [warnEmbed("Not paused.")],
        ephemeral: true,
      });
      return;
    }
    await interaction.reply({ embeds: [successEmbed("Resumed.")] });
  },
};

export default command;
