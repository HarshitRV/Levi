import {
	SlashCommandBuilder,
	ButtonBuilder,
	EmbedBuilder,
	ButtonStyle,
	ActionRowBuilder,
} from "discord.js";

const data = new SlashCommandBuilder()
	.setName("help")
	.setDescription("lists all commands");

const embed = new EmbedBuilder()
	.setTitle("Levi Help")
	.setColor(0x0099ff)
	.addFields(
		{
			name: "/sarcasm",
			value: "Get random Chandler Bing's sarcastic comment",
		},
		{
			name: "/gpt",
			value: "Ask gpt anything, `(requires open-ai API Token)`",
		},
		{
			name: "/instruct-gpt",
			value:
				"Instruct gpt on specific tasks, `(requires open-ai API Token)`",
		},
		{
			name: "/echo",
			value: "Echoes back the message",
		},
		{
			name: "/ping",
			value: "Pings the bot",
		},
		{
			name: "/clear",
			value: "clears `n` number of messages",
		}
	)
	.setFooter({
		text: `© ${new Date().getFullYear()} HarshitRV`,
		iconURL:
			"https://pbs.twimg.com/profile_images/1540941901490057217/Y01UF2W3_400x400.jpg",
	});
const invite = new ButtonBuilder()
	.setLabel("Invite")
	.setURL(
		"https://discord.com/api/oauth2/authorize?client_id=1123810664100671578&permissions=2048&scope=applications.commands%20bot"
	)
	.setStyle(ButtonStyle.Link);

const donate = new ButtonBuilder()
	.setLabel("Donate")
	.setURL("https://www.buymeacoffee.com/harshitHRV")
	.setStyle(ButtonStyle.Link);

const support = new ButtonBuilder()
	.setLabel("Support")
	.setURL("https://discord.com/invite/9qtAg79ahW")
	.setStyle(ButtonStyle.Link);

const row = new ActionRowBuilder().addComponents(invite, donate, support);

const execute = async (interaction: any) => {
	try {
		await interaction.reply({
			embeds: [embed],
			components: [row],
		});
	} catch (e) {
		console.error(e);
	}
};

export = {
	data,
	execute,
};
