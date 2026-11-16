import { SlashCommandBuilder } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import type { Command, LoopMode } from "../types.ts";
import { successEmbed, warnEmbed } from "../utils/embeds.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Change the loop mode.")
    .addStringOption((o) =>
      o
        .setName("mode")
        .setDescription("How to repeat")
        .setRequired(true)
        .addChoices(
          { name: "off — play queue normally", value: "off" },
          { name: "track — repeat current song", value: "track" },
          { name: "queue — loop the whole queue", value: "queue" },
        ),
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
    const mode = interaction.options.getString("mode", true) as LoopMode;
    queue.setLoop(mode);
    const label =
      mode === "off"
        ? "Loop disabled"
        : mode === "track"
          ? "Looping current track"
          : "Looping queue";
    await interaction.editReply({ embeds: [successEmbed(label)] });
  },
};

export default command;
