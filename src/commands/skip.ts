import { SlashCommandBuilder } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import type { Command } from "../types.ts";
import { successEmbed, warnEmbed } from "../utils/embeds.ts";
import { truncate } from "../utils/format.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip to the next track."),
  async execute(interaction) {
    await interaction.deferReply();

    const queue = queueManager.get(interaction.guildId ?? "");
    if (!queue || !queue.current) {
      await interaction.editReply({
        embeds: [warnEmbed("Nothing is playing.")],
      });
      return;
    }
    const skipped = queue.skip();
    if (!skipped) {
      await interaction.editReply({
        embeds: [warnEmbed("Nothing to skip.")],
      });
      return;
    }
    await interaction.editReply({
      embeds: [successEmbed("Skipped", truncate(skipped.title))],
    });
  },
};

export default command;
