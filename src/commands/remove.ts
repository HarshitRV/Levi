import { SlashCommandBuilder } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import type { Command } from "../types.ts";
import { successEmbed, warnEmbed } from "../utils/embeds.ts";
import { truncate } from "../utils/format.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove a track from the upcoming queue.")
    .addIntegerOption((o) =>
      o
        .setName("position")
        .setDescription("1-based position in the upcoming queue")
        .setRequired(true)
        .setMinValue(1),
    ),
  async execute(interaction) {
    const queue = queueManager.get(interaction.guildId ?? "");
    if (!queue || queue.upcoming.length === 0) {
      await interaction.reply({
        embeds: [warnEmbed("Upcoming queue is empty.")],
        ephemeral: true,
      });
      return;
    }
    const position = interaction.options.getInteger("position", true);
    const removed = queue.removeAt(position - 1);
    if (!removed) {
      await interaction.reply({
        embeds: [warnEmbed(`No track at position ${position}.`)],
        ephemeral: true,
      });
      return;
    }
    await interaction.reply({
      embeds: [successEmbed(`Removed #${position}`, truncate(removed.title))],
    });
  },
};

export default command;
