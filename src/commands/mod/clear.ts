import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

const data = new SlashCommandBuilder()
	.setName("clear")
	.setDescription("clears n number of messages")
	.addIntegerOption((option) =>
		option
			.setName("number")
			.setDescription("number of messages you want to delete")
			.setRequired(true)
	)
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

const execute = async (interaction: any) => {
	try {
		const number = interaction.options.getInteger("number");

		if (number < 1 || number > 100) {
			return await interaction.reply({
				content: "Please provide a number between 1 and 100.",
				ephemeral: true,
			});
		}

		const messages = await interaction.channel.messages.fetch({
			limit: number,
		});

		await interaction.channel.bulkDelete(messages);

		await interaction.reply({
			content: `Successfully deleted ${number} messages.`,
			ephemeral: true,
		});
	} catch (e) {
		console.error(e);
	}
};

export = {
	data,
	execute,
};
