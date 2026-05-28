import { SlashCommandBuilder } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import type { Command } from "../types.ts";
import { successEmbed, warnEmbed } from "../utils/embeds.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Clear the upcoming queue (keeps the current track)."),
  async execute(interaction) {
    const queue = queueManager.get(interaction.guildId ?? "");
    if (!queue || queue.upcoming.length === 0) {
      await interaction.reply({
        embeds: [warnEmbed("Upcoming queue is already empty.")],
        ephemeral: true,
      });
      return;
    }
    const removed = queue.clearUpcoming();
    await interaction.reply({
      embeds: [successEmbed("Queue cleared", `Removed ${removed} track(s).`)],
    });
  },
};

export default command;
