import { SlashCommandBuilder } from "discord.js";
import { Configuration, OpenAIApi } from "openai";
import { setTimeout } from "timers/promises";

const wait = setTimeout;

const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const chatGPT = async (input: string, instruction: string) => {
	try {
		const chatCompletion = await openai.createEdit({
			model: "text-davinci-edit-001",
			input,
			instruction,
			temperature: 0.3,
		});

		const response = chatCompletion.data.choices[0].text;
		console.log("RESPONSE", response, chatCompletion);
		return response;
	} catch (e) {
		console.error(e);
		return null;
	}
};

const data = new SlashCommandBuilder()
	.setName("instruct-gpt")
	.setDescription("instruct gpt for specific task")
	.addStringOption((option) =>
		option
			.setName("input")
			.setDescription("provide input for the task")
			.setRequired(true)
	)
	.addStringOption((option) =>
		option
			.setName("instruction")
			.setDescription("provide the instruction for the given input")
			.setRequired(true)
	)
	.addBooleanOption((option) =>
		option.setName("ephemeral").setDescription("set true for private reply")
	);

const execute = async (interaction: any) => {
	try {
		const input = interaction.options.getString("input");
		const instruction = interaction.options.getString("instruction");
		const ephemeral = interaction.options.getBoolean("ephemeral");

		if (interaction.user.id === process.env.OWNER_ID) {
			const reply = await chatGPT(input, instruction);
			if (reply === null)
				await interaction.reply({
					content: "Failed to process request",
					ephemeral: true,
				});
			else {
				await interaction.deferReply();
				await wait(4000);
				await interaction.editReply({ content: reply, ephemeral });
			}
		} else {
			await interaction.reply("You are not authorized to use this command!");
		}
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
