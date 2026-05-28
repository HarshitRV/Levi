import { SlashCommandBuilder } from "discord.js";
import { commands } from "./index.ts";
import type { Command } from "../types.ts";
import { infoEmbed } from "../utils/embeds.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("List every command this bot exposes."),
  async execute(interaction) {
    // commands is populated by index.ts; this read happens at execute time
    // so the circular import (help.ts <-> index.ts) resolves cleanly.
    const entries = [...commands.values()]
      .map((c) => `\`/${c.data.name}\` — ${c.data.description}`)
      .sort();

    const embed = infoEmbed("Commands", entries.join("\n")).setFooter({
      text: `${entries.length} command(s) available`,
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export default command;
