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
    const queue = queueManager.get(interaction.guildId ?? "");
    if (!queue || !queue.current) {
      await interaction.reply({
        embeds: [warnEmbed("Nothing is playing.")],
        ephemeral: true,
      });
      return;
    }
    const skipped = queue.skip();
    if (!skipped) {
      await interaction.reply({
        embeds: [warnEmbed("Nothing to skip.")],
        ephemeral: true,
      });
      return;
    }
    await interaction.reply({
      embeds: [successEmbed("Skipped", truncate(skipped.title))],
    });
  },
};

export default command;
