import { EmbedBuilder, type ColorResolvable } from "discord.js";
import type { Track } from "../types.ts";
import { formatDuration, truncate } from "./format.ts";

const COLOR_ACCENT: ColorResolvable = 0x5865f2;
const COLOR_SUCCESS: ColorResolvable = 0x57f287;
const COLOR_WARN: ColorResolvable = 0xfee75c;
const COLOR_ERROR: ColorResolvable = 0xed4245;
const COLOR_MUTED: ColorResolvable = 0x4f545c;

export function trackAddedEmbed(track: Track, position: number): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLOR_SUCCESS)
    .setTitle("Added to queue")
    .setDescription(`[${truncate(track.title)}](${track.url})`)
    .addFields(
      {
        name: "Duration",
        value: formatDuration(track.durationSec),
        inline: true,
      },
      {
        name: "Position",
        value: position === 0 ? "Now playing" : `#${position}`,
        inline: true,
      },
      { name: "Requested by", value: track.requestedByName, inline: true },
    );
  if (track.thumbnail) embed.setThumbnail(track.thumbnail);
  return embed;
}

export function trackEndedEmbed(track: Track): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLOR_MUTED)
    .setTitle("Track ended")
    .setDescription(`[${truncate(track.title)}](${track.url})`)
    .addFields(
      {
        name: "Duration",
        value: formatDuration(track.durationSec),
        inline: true,
      },
      { name: "Requested by", value: track.requestedByName, inline: true },
    );
}

export function nowPlayingEmbed(track: Track): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLOR_ACCENT)
    .setTitle("Now playing")
    .setDescription(`[${truncate(track.title)}](${track.url})`)
    .addFields(
      {
        name: "Duration",
        value: formatDuration(track.durationSec),
        inline: true,
      },
      { name: "Requested by", value: track.requestedByName, inline: true },
    );
  if (track.thumbnail) embed.setThumbnail(track.thumbnail);
  return embed;
}

export function infoEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(COLOR_ACCENT).setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

export function successEmbed(
  title: string,
  description?: string,
): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(COLOR_SUCCESS).setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

export function warnEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(COLOR_WARN).setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

export function errorEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(COLOR_ERROR).setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}
