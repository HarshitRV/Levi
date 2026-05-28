import { SlashCommandBuilder } from "discord.js";
import type { Command } from "../types.ts";
import { infoEmbed } from "../utils/embeds.ts";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription(
      "Show the bot's WebSocket heartbeat and roundtrip latency.",
    ),
  async execute(interaction) {
    const sent = Date.now();
    // Defer first so we can measure the full ack roundtrip.
    await interaction.deferReply({ ephemeral: true });
    const roundtrip = Date.now() - sent;

    // ws.ping is -1 until the first heartbeat lands; show "—" in that window
    // so we don't lie to the user.
    const heartbeat = interaction.client.ws.ping;
    const heartbeatStr = heartbeat < 0 ? "—" : `${Math.round(heartbeat)}ms`;

    await interaction.editReply({
      embeds: [
        infoEmbed(
          "Pong",
          `**Roundtrip:** ${roundtrip}ms\n**WebSocket heartbeat:** ${heartbeatStr}`,
        ),
      ],
    });
  },
};

export default command;
