import { SlashCommandBuilder } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import type { Command } from "../types.ts";
import { successEmbed } from "../utils/embeds.ts";
import { requireVoice } from "./_shared.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("join")
    .setDescription("Make the bot join your voice channel."),
  async execute(interaction) {
    const ctx = await requireVoice(interaction);
    if (!ctx) return;
    queueManager.getOrCreate(
      interaction.guildId!,
      ctx.voiceChannel,
      ctx.textChannel,
    );
    await interaction.reply({
      embeds: [successEmbed(`Joined ${ctx.voiceChannel.name}.`)],
    });
  },
};

export default command;
