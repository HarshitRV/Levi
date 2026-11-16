import { SlashCommandBuilder } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import type { Command } from "../types.ts";
import { successEmbed, warnEmbed } from "../utils/embeds.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Set the playback volume (0-200%).")
    .addIntegerOption((o) =>
      o
        .setName("level")
        .setDescription("0 to 200")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(200),
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const queue = queueManager.get(interaction.guildId ?? "");
    if (!queue) {
      await interaction.editReply({
        embeds: [warnEmbed("Nothing is playing.")],
      });
      return;
    }
    const pct = interaction.options.getInteger("level", true);
    const newVol = queue.setVolume(pct / 100);
    await interaction.editReply({
      embeds: [successEmbed("Volume", `Set to ${Math.round(newVol * 100)}%`)],
    });
  },
};

export default command;
