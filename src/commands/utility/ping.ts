import { SlashCommandBuilder } from "discord.js";

export = {
	data: new SlashCommandBuilder()
		.setName("ping")
		.setDescription("replies with pong!"),
	async execute(interaction: any) {
		const start = new Date().getTime();
		await interaction.reply(`Pong...`);
		const end = new Date().getTime();
		await interaction.editReply(`Pong ${end - start}ms !`);
	},
};
