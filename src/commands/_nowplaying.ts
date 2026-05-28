import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type EmbedBuilder,
} from "discord.js";
import type { GuildQueue } from "../music/guild-queue.ts";
import { infoEmbed, warnEmbed } from "../utils/embeds.ts";
import { formatDuration, progressBar, truncate } from "../utils/format.ts";

export type ControlAction =
  | "prev"
  | "pause"
  | "resume"
  | "skip"
  | "stop"
  | "shuffle";

const CONTROL_ACTIONS: ReadonlySet<string> = new Set([
  "prev",
  "pause",
  "resume",
  "skip",
  "stop",
  "shuffle",
]);

export function parseControlAction(customId: string): ControlAction | null {
  if (!customId.startsWith("np:")) return null;
  const action = customId.slice(3);
  if (!CONTROL_ACTIONS.has(action)) return null;
  return action as ControlAction;
}

export interface ControlRowState {
  paused: boolean;
  canPrev: boolean;
  canSkip: boolean;
  canShuffle: boolean;
}

export function buildControlRow(
  state: ControlRowState,
): ActionRowBuilder<ButtonBuilder> {
  const pauseButton = new ButtonBuilder()
    .setCustomId(state.paused ? "np:resume" : "np:pause")
    .setLabel(state.paused ? "Resume" : "Pause")
    .setStyle(ButtonStyle.Primary);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("np:prev")
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!state.canPrev),
    pauseButton,
    new ButtonBuilder()
      .setCustomId("np:skip")
      .setLabel("Skip")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!state.canSkip),
    new ButtonBuilder()
      .setCustomId("np:stop")
      .setLabel("Stop")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("np:shuffle")
      .setLabel("Shuffle")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!state.canShuffle),
  );
}

export function controlStateFromQueue(queue: GuildQueue): ControlRowState {
  return {
    paused: queue.isPaused,
    canPrev: queue.canPrevious,
    canSkip: queue.canSkip,
    canShuffle: queue.canShuffle,
  };
}

export function buildNowPlayingEmbed(queue: GuildQueue): EmbedBuilder {
  const track = queue.current!;
  const pos = queue.playbackPositionSec();
  const embed = infoEmbed(
    "Now playing",
    `[${truncate(track.title)}](${track.url})`,
  ).addFields(
    {
      name: "Progress",
      value: `\`${formatDuration(pos)}\` ${progressBar(pos, track.durationSec)} \`${formatDuration(track.durationSec)}\``,
    },
    { name: "Requested by", value: track.requestedByName, inline: true },
    { name: "Loop", value: queue.loopMode, inline: true },
    {
      name: "Volume",
      value: `${Math.round(queue.volume * 100)}%`,
      inline: true,
    },
  );
  if (track.thumbnail) embed.setThumbnail(track.thumbnail);
  return embed;
}

export function buildNowPlayingPayload(queue: GuildQueue): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  return {
    embeds: [buildNowPlayingEmbed(queue)],
    components: [buildControlRow(controlStateFromQueue(queue))],
  };
}

export function buildQueueEndedPayload(): {
  embeds: EmbedBuilder[];
  components: [];
} {
  return {
    embeds: [infoEmbed("Queue ended")],
    components: [],
  };
}

export function buildNothingPlayingPayload(): {
  embeds: EmbedBuilder[];
  components: [];
} {
  return {
    embeds: [warnEmbed("Nothing is playing.")],
    components: [],
  };
}
