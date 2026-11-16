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
 * Common pre-check used by most music commands. **Assumes the interaction has
 * already been deferred** (every command must `deferReply` as its first line
 * so the 3-second ack window is reserved before any work). Edits the deferred
 * reply with an error embed and returns null if the user is not in a voice
 * channel the bot can join.
 */
export async function requireVoice(
  interaction: ChatInputCommandInteraction,
): Promise<VoiceContext | null> {
  if (!interaction.inCachedGuild()) {
    await interaction.editReply({
      embeds: [errorEmbed("This command can only be used in a server.")],
    });
    return null;
  }

  const member = interaction.member;
  const voiceChannel = member.voice.channel;
  if (!voiceChannel) {
    await interaction.editReply({
      embeds: [errorEmbed("You need to be in a voice channel first.")],
    });
    return null;
  }

  const me = interaction.guild.members.me;
  if (me) {
    const perms = voiceChannel.permissionsFor(me);
    if (!perms?.has("Connect") || !perms.has("Speak")) {
      await interaction.editReply({
        embeds: [
          errorEmbed(
            "Missing permissions",
            `I need **Connect** and **Speak** in ${voiceChannel}.`,
          ),
        ],
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
