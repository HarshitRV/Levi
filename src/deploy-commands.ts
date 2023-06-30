/**
 * Node js modules
 */
import fs from "fs";
import path from "path";

/**
 * Discord js modules
 */
import { REST, Routes } from "discord.js";

/**
 * Globals
 */
const TOKEN: string = process.env.TOKEN || "";
const CLIENT_ID: string = process.env.CLIENT_ID || "";

const commands = [];
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
			commands.push(command.data.toJSON());
		} else {
			console.log(
				`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
			);
		}
	}
}

const rest = new REST().setToken(TOKEN);

(async () => {
	try {
		console.log(
			`Started refreshing ${commands.length} application (/) commands.`
		);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data: any = await rest.put(
			Routes.applicationCommands(CLIENT_ID),
			{ body: commands }
		);
		console.log(
			`Successfully reloaded ${data.length} application (/) commands.`
		);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();
