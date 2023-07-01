/**
 * Discord.js modules
 */
import { SlashCommandBuilder } from "discord.js";
import { Configuration, OpenAIApi } from "openai";

/**
 * Node modules
 */
import { setTimeout } from "timers/promises";

/**
 * Utils
 */
import { encrypt, decrypt } from "../../utils/crypt";

/**
 * Models
 */
import User from "../../models/user.model";

/**
 * Globals
 */
const wait = setTimeout;
const SECRET_KEY: string = process.env.SECRET_KEY || "";

const chatGPT = async (
	input: string,
	instruction: string,
	apiKey: string,
	temperature: number = 0.3
) => {
	try {
		const configuration = new Configuration({
			apiKey,
		});

		const openai = new OpenAIApi(configuration);
		const chatCompletion = await openai.createEdit({
			model: "text-davinci-edit-001",
			input,
			instruction,
			temperature,
		});

		const response = chatCompletion.data.choices[0].text;
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
	.addNumberOption((option) =>
		option
			.setName("temperature")
			.setDescription("set the accuracy of responses, ranges between 0 to 1")
	);

const execute = async (interaction: any) => {
	try {
		const input = interaction.options.getString("input");
		const instruction = interaction.options.getString("instruction");

		const existingUser = await User.findOne({
			id: interaction.user.id,
		});

		if (existingUser?.apiToken) {
			const encryptedKey = existingUser.apiToken;
			const apiKey = decrypt(encryptedKey, SECRET_KEY);
			const reply = await chatGPT(input, instruction, apiKey.toString());
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
				content: "Register your openai api token first using `/register-token`",
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
