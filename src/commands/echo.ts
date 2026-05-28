import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("echo")
    .setDescription("Echo back the input.")
    .addStringOption((opt) =>
      opt
        .setName("input")
        .setDescription("What should I echo?")
        .setRequired(true)
        .setMaxLength(2000),
    )
    .addBooleanOption((opt) =>
      opt
        .setName("ephemeral")
        .setDescription("Only show the echo to you (default: false)."),
    ),
  async execute(interaction) {
    const input = interaction.options.getString("input", true);
    const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;

    await interaction.reply({
      content: input,
      ephemeral,
      // Prevent /echo @everyone style abuse — the text renders, but Discord
      // won't actually ping anyone.
      allowedMentions: { parse: [] },
    });
  },
};

export default command;
