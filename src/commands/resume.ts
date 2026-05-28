import { SlashCommandBuilder } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import type { Command } from "../types.ts";
import { successEmbed, warnEmbed } from "../utils/embeds.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume the paused track."),
  async execute(interaction) {
    await interaction.deferReply();

    const queue = queueManager.get(interaction.guildId ?? "");
    if (!queue || !queue.current) {
      await interaction.editReply({
        embeds: [warnEmbed("Nothing is playing.")],
      });
      return;
    }
    if (!queue.resume()) {
      await interaction.editReply({
        embeds: [warnEmbed("Not paused.")],
      });
      return;
    }
    await interaction.editReply({ embeds: [successEmbed("Resumed.")] });
  },
};

export default command;
