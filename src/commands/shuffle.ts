import { SlashCommandBuilder } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import type { Command } from "../types.ts";
import { successEmbed, warnEmbed } from "../utils/embeds.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("Shuffle the upcoming tracks in the queue."),
  async execute(interaction) {
    await interaction.deferReply();

    const queue = queueManager.get(interaction.guildId ?? "");
    if (!queue || queue.upcoming.length < 2) {
      await interaction.editReply({
        embeds: [warnEmbed("Need at least 2 upcoming tracks to shuffle.")],
      });
      return;
    }
    queue.shuffle();
    await interaction.editReply({
      embeds: [
        successEmbed("Shuffled", `${queue.upcoming.length} tracks reordered.`),
      ],
    });
  },
};

export default command;
