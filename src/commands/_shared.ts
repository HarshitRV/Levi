import type {
  ChatInputCommandInteraction,
  GuildMember,
  GuildTextBasedChannel,
  VoiceBasedChannel,
} from "discord.js";
import { errorEmbed } from "../utils/embeds.ts";

export interface VoiceContext {
  voiceChannel: VoiceBasedChannel;
  textChannel: GuildTextBasedChannel | null;
  member: GuildMember;
}

/**
 * Common pre-check used by most music commands. Replies with an error embed
 * and returns null if the user is not in a voice channel the bot can join.
 */
export async function requireVoice(
  interaction: ChatInputCommandInteraction,
): Promise<VoiceContext | null> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      embeds: [errorEmbed("This command can only be used in a server.")],
      ephemeral: true,
    });
    return null;
  }

  const member = interaction.member;
  const voiceChannel = member.voice.channel;
  if (!voiceChannel) {
    await interaction.reply({
      embeds: [errorEmbed("You need to be in a voice channel first.")],
      ephemeral: true,
    });
    return null;
  }

  const me = interaction.guild.members.me;
  if (me) {
    const perms = voiceChannel.permissionsFor(me);
    if (!perms?.has("Connect") || !perms.has("Speak")) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            "Missing permissions",
            `I need **Connect** and **Speak** in ${voiceChannel}.`,
          ),
        ],
        ephemeral: true,
      });
      return null;
    }
  }

  const textChannel =
    interaction.channel && "guild" in interaction.channel
      ? (interaction.channel as GuildTextBasedChannel)
      : null;

  return { voiceChannel, textChannel, member };
}
