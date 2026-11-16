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
    await interaction.deferReply();

    const queue = queueManager.get(interaction.guildId ?? "");
    if (!queue || queue.upcoming.length === 0) {
      await interaction.editReply({
        embeds: [warnEmbed("Upcoming queue is empty.")],
      });
      return;
    }
    const position = interaction.options.getInteger("position", true);
    const removed = queue.removeAt(position - 1);
    if (!removed) {
      await interaction.editReply({
        embeds: [warnEmbed(`No track at position ${position}.`)],
      });
      return;
    }
    await interaction.editReply({
      embeds: [successEmbed(`Removed #${position}`, truncate(removed.title))],
    });
  },
};

export default command;
