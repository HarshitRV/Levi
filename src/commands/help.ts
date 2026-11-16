import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { commands } from "./index.ts";
import type { Command } from "../types.ts";
import { infoEmbed } from "../utils/embeds.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("List every command this bot exposes."),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const entries = [...commands.values()]
      .map((c) => `\`/${c.data.name}\` — ${c.data.description}`)
      .sort();

    const embed = infoEmbed("Commands", entries.join("\n")).setFooter({
      text: `${entries.length} command(s) available`,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
