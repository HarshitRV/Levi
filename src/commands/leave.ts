import { SlashCommandBuilder } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import type { Command } from "../types.ts";
import { successEmbed, warnEmbed } from "../utils/embeds.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Disconnect the bot from the voice channel."),
  async execute(interaction) {
    const ok = queueManager.destroy(interaction.guildId ?? "");
    if (!ok) {
      await interaction.reply({
        embeds: [warnEmbed("I'm not in a voice channel.")],
        ephemeral: true,
      });
      return;
    }
    await interaction.reply({ embeds: [successEmbed("Disconnected.")] });
  },
};

export default command;
