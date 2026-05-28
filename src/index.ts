import { Client, Events, GatewayIntentBits } from "discord.js";
import { handleNowPlayingButton } from "./commands/_nowplaying-handler.ts";
import { parseControlAction } from "./commands/_nowplaying.ts";
import { commands } from "./commands/index.ts";
import { config } from "./config.ts";
import { errorEmbed } from "./utils/embeds.ts";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.once(Events.ClientReady, (c) => {
  console.log(
    `Logged in as ${c.user.tag}. Serving ${c.guilds.cache.size} guild(s).`,
  );
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    if (parseControlAction(interaction.customId)) {
      try {
        await handleNowPlayingButton(interaction);
      } catch (err) {
        console.error("Error in now-playing button:", err);
        const payload = {
          embeds: [
            errorEmbed(
              "Something went wrong",
              "The control crashed. Check the bot logs.",
            ),
          ],
          ephemeral: true,
        };
        try {
          if (interaction.deferred || interaction.replied) {
            await interaction.followUp(payload);
          } else {
            await interaction.reply(payload);
          }
        } catch (replyErr) {
          console.error("Failed to send error reply:", replyErr);
        }
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error in /${interaction.commandName}:`, err);
    const payload = {
      embeds: [
        errorEmbed(
          "Something went wrong",
          "The command crashed. Check the bot logs.",
        ),
      ],
      ephemeral: true,
    };
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    } catch (replyErr) {
      console.error("Failed to send error reply:", replyErr);
    }
  }
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

await client.login(config.discordToken);
