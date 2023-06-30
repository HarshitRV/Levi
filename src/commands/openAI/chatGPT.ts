import { SlashCommandBuilder } from "discord.js";
import { Configuration, OpenAIApi } from "openai";
import { setTimeout } from "timers/promises";

const wait = setTimeout;

const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const chatGPT = async (query: string) => {
	try {
		const chatCompletion = await openai.createChatCompletion({
			model: "gpt-3.5-turbo-0613",
			max_tokens: 256,
			messages: [
				{ role: "system", content: "You are a helpful assistant." },
				{ role: "user", content: query },
			],
		});
		const response = chatCompletion.data.choices[0].message?.content;
		console.log("RESPONSE", response, typeof response);
		return response;
	} catch (e) {
		console.error(e);
		return null;
	}
};

const data = new SlashCommandBuilder()
	.setName("gpt")
	.setDescription("ask chat gpt")
	.addStringOption((option) =>
		option.setName("query").setDescription("enter your query").setRequired(true)
	)
	.addBooleanOption((option) =>
		option.setName("ephemeral").setDescription("set true for private reply")
	);

const execute = async (interaction: any) => {
	try {
		const query = interaction.options.getString("query");
		const ephemeral = interaction.options.getBoolean("ephemeral");

		if (interaction.user.id === process.env.OWNER_ID) {
			const reply = await chatGPT(query);
			if (reply === null)
				await interaction.reply({
					content: "couldn't get response",
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
