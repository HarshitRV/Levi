/**
 * Discord.js modules
 */
import { SlashCommandBuilder } from "discord.js";
import { instructionEmbed } from "./helper/instructionEmbed";

/**
 * Open ai modules
 */
import { Configuration, OpenAIApi } from "openai";

/**
 * Model
 */
import User from "../../models/user.model";

/**
 * Utils
 */
import { decrypt } from "../../utils/crypt";

const SECRET_KEY = process.env.SECRET_KEY || "";

const chatGPT = async (query: string, apiKey: string) => {
	try {
		const configuration = new Configuration({
			apiKey,
		});

		const openai = new OpenAIApi(configuration);

		const chatCompletion = await openai.createChatCompletion({
			model: "gpt-3.5-turbo-0613",
			max_tokens: 256,
			messages: [
				{ role: "system", content: "You are a helpful assistant." },
				{ role: "user", content: query },
			],
		});
		const response = chatCompletion.data.choices[0].message?.content;
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
	);

const execute = async (interaction: any) => {
	try {
		const query = interaction.options.getString("query");

		const existingUser = await User.findOne({
			id: interaction.user.id,
		});

		if (existingUser?.apiToken) {
			const encryptedKey = existingUser.apiToken;
			const apiKey = decrypt(encryptedKey, SECRET_KEY);
			const reply = await chatGPT(query, apiKey.toString());
			if (reply === null)
				await interaction.reply({
					content:
						"Couldn't get response at the moment please try again later, also ensure that the API token you provided is a valid one",
					ephemeral: true,
				});
			else {
				await interaction.reply({ content: "processing request..." });
				await interaction.editReply({ content: reply });
			}
		} else {
			return await interaction.reply({
				embeds: [instructionEmbed],
				ephemeral: true,
			});
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
