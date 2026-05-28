import { SlashCommandBuilder } from "discord.js";
import { queueManager } from "../music/queue-manager.ts";
import type { Command } from "../types.ts";
import { infoEmbed, warnEmbed } from "../utils/embeds.ts";
import { formatDuration, truncate } from "../utils/format.ts";

const PAGE_SIZE = 10;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the upcoming tracks.")
    .addIntegerOption((o) =>
      o
        .setName("page")
        .setDescription("Page number (10 tracks per page)")
        .setMinValue(1),
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const queue = queueManager.get(interaction.guildId ?? "");
    if (!queue || (!queue.current && queue.upcoming.length === 0)) {
      await interaction.editReply({
        embeds: [warnEmbed("Queue is empty.")],
      });
      return;
    }

    const page = interaction.options.getInteger("page") ?? 1;
    const totalPages = Math.max(
      1,
      Math.ceil(queue.upcoming.length / PAGE_SIZE),
    );
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    const slice = queue.upcoming.slice(start, start + PAGE_SIZE);

    const lines: string[] = [];
    if (queue.current) {
      lines.push(
        `**Now playing:** [${truncate(queue.current.title, 60)}](${queue.current.url}) — \`${formatDuration(queue.current.durationSec)}\``,
      );
      lines.push("");
    }

    if (slice.length === 0) {
      lines.push("_No upcoming tracks._");
    } else {
      lines.push("**Up next:**");
      slice.forEach((track, idx) => {
        const n = start + idx + 1;
        lines.push(
          `\`${n}.\` [${truncate(track.title, 60)}](${track.url}) — \`${formatDuration(track.durationSec)}\` · <@${track.requestedBy}>`,
        );
      });
    }

    const totalDuration = queue.upcoming.reduce(
      (sum, t) => sum + (t.durationSec || 0),
      0,
    );

    const embed = infoEmbed("Queue", lines.join("\n")).setFooter({
      text: `Page ${safePage}/${totalPages} · ${queue.upcoming.length} upcoming · ${formatDuration(totalDuration)} total · loop: ${queue.loopMode}`,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
