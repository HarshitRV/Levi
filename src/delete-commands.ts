import { REST, Routes } from "discord.js";

const CLIENT_ID: string = process.env.CLIENT_ID || "";
const TOKEN: string = process.env.TOKEN || "";

const rest = new REST().setToken(TOKEN);

rest
	.put(Routes.applicationCommands(CLIENT_ID), { body: [] })
	.then(() => console.log("successfully deleted all commands"))
    .catch(console.error)