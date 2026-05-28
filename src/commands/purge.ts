import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.ts";
import { errorEmbed, successEmbed, warnEmbed } from "../utils/embeds.ts";
import { canBulkDelete, purgeResult } from "./_purge.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription(
      "Bulk-delete the last N messages in this channel (1-100, <14 days old).",
    )
    .addIntegerOption((opt) =>
      opt
        .setName("count")
        .setDescription("How many messages to delete.")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        embeds: [errorEmbed("This command can only be used in a server.")],
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.channel;
    if (!channel || !canBulkDelete(channel.type)) {
      await interaction.reply({
        embeds: [errorEmbed("This channel doesn't support bulk-delete.")],
        ephemeral: true,
      });
      return;
    }

    const me = interaction.guild.members.me;
    if (!me || !channel.permissionsFor(me)?.has("ManageMessages")) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            "Missing permissions",
            "I need **Manage Messages** in this channel.",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const count = interaction.options.getInteger("count", true);

    await interaction.deferReply({ ephemeral: true });

    // `true` filters out messages >14 days old instead of throwing — Discord
    // refuses to bulk-delete those, but the user usually still wants the
    // newer ones gone.
    const deleted = await channel.bulkDelete(count, true);
    const outcome = purgeResult(count, deleted.size);

    const embed =
      outcome.kind === "warn"
        ? warnEmbed(outcome.title, outcome.description)
        : successEmbed(outcome.title, outcome.description);

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
