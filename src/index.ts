import { Client, Events, GatewayIntentBits } from "discord.js";
import { handleNowPlayingButton } from "./commands/_nowplaying-handler.ts";
import { parseControlAction } from "./commands/_nowplaying.ts";
import { commands } from "./commands/index.ts";
import { config } from "./config.ts";
import { errorEmbed } from "./utils/embeds.ts";
import { logger } from "./utils/logger.ts";

const log = logger.scope("client");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.once(Events.ClientReady, (c) => {
  log.info("ready", {
    tag: c.user.tag,
    guildCount: c.guilds.cache.size,
  });
});

client.on(Events.GuildCreate, (guild) => {
  log.info("guild-joined", {
    guildId: guild.id,
    name: guild.name,
    memberCount: guild.memberCount,
  });
});

client.on(Events.GuildDelete, (guild) => {
  log.info("guild-left", {
    guildId: guild.id,
    name: guild.name,
    memberCount: guild.memberCount,
  });
});

client.on(Events.ShardReady, (shardId) => {
  log.info("shard-ready", { shardId });
});

client.on(Events.ShardDisconnect, (event, shardId) => {
  log.warn("shard-disconnect", {
    shardId,
    code: event.code,
    reason: event.reason,
  });
});

client.on(Events.ShardReconnecting, (shardId) => {
  log.info("shard-reconnecting", { shardId });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    log.debug("button-click", {
      customId: interaction.customId,
      guildId: interaction.guildId,
      userId: interaction.user.id,
    });

    if (parseControlAction(interaction.customId)) {
      try {
        await handleNowPlayingButton(interaction);
      } catch (err) {
        log.error("now-playing-button-failed", {
          customId: interaction.customId,
          guildId: interaction.guildId,
          userId: interaction.user.id,
          err,
        });
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
          log.error("error-reply-failed", { err: replyErr });
        }
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  log.debug("command-invoked", {
    name: interaction.commandName,
    guildId: interaction.guildId,
    userId: interaction.user.id,
  });

  const command = commands.get(interaction.commandName);
  if (!command) {
    log.warn("unknown-command", {
      name: interaction.commandName,
      guildId: interaction.guildId,
      userId: interaction.user.id,
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    log.error("command-failed", {
      name: interaction.commandName,
      guildId: interaction.guildId,
      userId: interaction.user.id,
      err,
    });
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
      log.error("error-reply-failed", { err: replyErr });
    }
  }
});

process.on("unhandledRejection", (err) => {
  log.error("unhandled-rejection", { err });
});

await client.login(config.discordToken);
