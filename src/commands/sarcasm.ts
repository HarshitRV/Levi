import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  SlashCommandBuilder,
  type ButtonInteraction,
} from "discord.js";
import type { Command } from "../types.ts";
import { infoEmbed } from "../utils/embeds.ts";
import { pickQuote } from "./_sarcasm.ts";

function buildRow(disabled: boolean): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("sarcasm:refresh")
      .setLabel("Get another")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
  );
}

const COLLECTOR_TIMEOUT_MS = 60_000;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("sarcasm")
    .setDescription("Drop a random sarcastic comment into chat.")
    .addBooleanOption((opt) =>
      opt
        .setName("ephemeral")
        .setDescription("Only show the comment to you (default: false)."),
    ),
  async execute(interaction) {
    const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;
    let current = pickQuote();

    const response = await interaction.reply({
      embeds: [infoEmbed("Sarcasm.exe", current)],
      components: [buildRow(false)],
      ephemeral,
      withResponse: true,
    });

    const message = response.resource?.message;
    if (!message) return;

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: COLLECTOR_TIMEOUT_MS,
      // Only the user who ran the command can refresh; everyone else gets
      // a polite no.
      filter: (i: ButtonInteraction) => i.user.id === interaction.user.id,
    });

    collector.on("collect", async (btn) => {
      current = pickQuote(current);
      await btn.update({
        embeds: [infoEmbed("Sarcasm.exe", current)],
        components: [buildRow(false)],
      });
    });

    collector.on("end", async () => {
      try {
        await interaction.editReply({ components: [buildRow(true)] });
      } catch {
        // Message may have been deleted; nothing useful we can do.
      }
    });
  },
};

export default command;
