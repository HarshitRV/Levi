import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export type LoopMode = "off" | "track" | "queue";

export interface Track {
  /** Canonical YouTube/source URL (used by yt-dlp to stream). */
  url: string;
  /** Display title. */
  title: string;
  /** Length in seconds (0 if unknown / live). */
  durationSec: number;
  /** Thumbnail URL (best effort). */
  thumbnail: string | null;
  /** Original requester user id. */
  requestedBy: string;
  /** Original requester display name. */
  requestedByName: string;
}

export type SlashBuilder =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;

export interface Command {
  data: SlashBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
