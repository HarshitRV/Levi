/**
 * Discord.js modules
 */
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { ChatInputCommandInteraction } from "discord.js";

/**
 * AI Art imports
 */
import textToImageSD from "./stable-diffusion/textToImageSD";

const data = new SlashCommandBuilder()
	.setName("imagine")
	.setDescription("generates AI images based your description")
	.addStringOption((option) =>
		option
			.setName("description")
			.setDescription("describe your imagination")
			.setRequired(true)
	);

const execute = async (interaction: ChatInputCommandInteraction) => {
	try {
		const description = interaction.options.getString("description")!;

		await interaction.deferReply();

		const {
			output,
			meta: { prompt },
		} = await textToImageSD(description);

		console.log(output, prompt);

		const embed = new EmbedBuilder()
			.setColor(0x0099ff)
			.setDescription(description)
			.setTimestamp()
			.setImage(output[0]);

		await interaction.editReply({ embeds: [embed] });
		await interaction.followUp({ content: `<@${interaction.user.id}>` });
	} catch (e) {
		console.log("Error in imagine command ", e);
		await interaction.reply("Failed to process request at the moment");
	}
};

export = {
	data,
	execute,
};
