import { SlashCommandBuilder } from "discord.js";

const data = new SlashCommandBuilder()
	.setName("echo")
	.setDescription("echoes back the input")
	.addStringOption((option) =>
		option
			.setName("input")
			.setDescription("echoes back the input")
			.setRequired(true)
	)
	.addBooleanOption((option) =>
		option.setName("ephemeral").setDescription("echo privately?")
	);

const execute = async (interaction: any) => {
	try {
		const input = interaction.options.getString("input");
		const ephemeral = interaction.options.getBoolean("ephemeral");
		await interaction.reply({ content: input, ephemeral });
	} catch (e) {
		console.error(e);
		await interaction.reply({
			content: "failed to execute command",
			ephemeral: true,
		});
	}
};

export = {
	data,
	execute,
};
