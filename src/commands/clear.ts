import { SlashCommandBuilder } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import type { Command } from "../types.ts";
import { successEmbed, warnEmbed } from "../utils/embeds.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Clear the upcoming queue (keeps the current track)."),
  async execute(interaction) {
    await interaction.deferReply();

    const queue = queueManager.get(interaction.guildId ?? "");
    if (!queue || queue.upcoming.length === 0) {
      await interaction.editReply({
        embeds: [warnEmbed("Upcoming queue is already empty.")],
      });
      return;
    }
    const removed = queue.clearUpcoming();
    await interaction.editReply({
      embeds: [successEmbed("Queue cleared", `Removed ${removed} track(s).`)],
    });
  },
};

export default command;
