import { EmbedBuilder } from "discord.js";

export const instructionEmbed = new EmbedBuilder()
	.setColor(0x92eb34)
	.setTitle("Follow the instructions before using this command")
	.setDescription(
		"- Go to [OpenAI](https://beta.openai.com/overview) and create an account \n- Go to [this](https://beta.openai.com/account/api-keys) page and copy your api token \n- Use `/register-token` command to register your token with the bot."
	)
	.setFooter({
		text: "OpenAI",
		iconURL: "https://i.imgur.com/PlcZ5Kj.png",
	});
