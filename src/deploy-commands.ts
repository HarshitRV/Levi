import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.ts";
import { config } from "./config.ts";

async function main() {
  const body = [...commands.values()].map((c) => c.data.toJSON());
  const rest = new REST({ version: "10" }).setToken(config.discordToken);

  if (config.guildId) {
    console.log(
      `Registering ${body.length} commands to guild ${config.guildId}…`,
    );
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body },
    );
    console.log("Done. Guild commands are live immediately.");
  } else {
    console.log(`Registering ${body.length} commands globally…`);
    await rest.put(Routes.applicationCommands(config.clientId), { body });
    console.log("Done. Global commands can take up to 1 hour to propagate.");
  }
}

main().catch((err) => {
  console.error("Failed to register commands:", err);
  process.exit(1);
});
