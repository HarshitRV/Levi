import { SlashCommandBuilder } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import type { Command } from "../types.ts";
import { successEmbed, warnEmbed } from "../utils/embeds.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription(
      "Stop playback, clear the queue, and leave the voice channel.",
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const ok = queueManager.destroy(interaction.guildId ?? "");
    if (!ok) {
      await interaction.editReply({
        embeds: [warnEmbed("I'm not playing anything.")],
      });
      return;
    }
    await interaction.editReply({ embeds: [successEmbed("Stopped. Bye.")] });
  },
};

export default command;
