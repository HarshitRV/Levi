/**
 * Node js modules
 */
import fs from "fs";
import path from "path";
import { keepAlive } from "./server.js";

/**
 * Discord.js modules
 */
import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import "./deploy-commands.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const commandFoldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(commandFoldersPath);

for (const commandFolder of commandFolders) {
	const commandPath = path.join(commandFoldersPath, commandFolder);
	const commandFiles = fs
		.readdirSync(commandPath)
		.filter((file) => file.endsWith(".js"));

	for (const files of commandFiles) {
		const filePath = path.join(commandPath, files);
		const command = require(filePath);
		if ("data" in command && "execute" in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(
				`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
			);
		}
	}
}

client.once(Events.ClientReady, (c) => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
	try {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);
			if (!command) {
				console.error(
					`No command matching ${interaction.commandName} was found.`
				);
				return;
			}
			try {
				await command.execute(interaction);
			} catch (e) {
				console.error(`Error executing ${interaction.commandName}`);
				console.error(e);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({
						content: "There was an error while executing this command!",
						ephemeral: true,
					});
				} else {
					await interaction.reply({
						content: "There was an error while executing this command!",
						ephemeral: true,
					});
				}
			}
		}

		// console.log(interaction);
	} catch (e) {
		console.log("Error in index.ts");
		console.error(e);
	}
});

keepAlive();
client.login(process.env.TOKEN).then(() => {
	setInterval(() => {
		const serverCount = client.guilds.cache.size;
		client.user?.setActivity(`/help on ${serverCount} servers`);
	}, 10000);
});
