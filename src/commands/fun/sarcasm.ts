import {
	SlashCommandBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	EmbedBuilder,
} from "discord.js";

const getSarcasticComment = async () => {
	try {
		const response = await fetch("https://sarcasmapi.onrender.com/");
		if (!response.ok) throw new Error("error fetching comment");
		const { sarcasm } = await response.json();
		return sarcasm;
	} catch (e) {
		console.error(e);
		return null;
	}
};

const data = new SlashCommandBuilder()
	.setName("sarcasm")
	.setDescription("get random Chandler Bing's sarcastic comment")
	.addBooleanOption((option) =>
		option
			.setName("ephemeral")
			.setDescription("if set true you can only see the comment")
	);

const execute = async (interaction: any) => {
	try {
		const ephemeral = interaction.options.getBoolean("ephemeral");
		const content = await getSarcasticComment();

		const embed = new EmbedBuilder()
			.setColor(0x0099ff)
			.setTitle(content)
			.setFooter({
				text: "Chandler Bing",
				iconURL: "https://imgur.com/NobKgPg.jpg",
			})
			.setTimestamp();

		const refresh = new ButtonBuilder()
			.setCustomId("refresh")
			.setLabel("Get Another")
			.setStyle(ButtonStyle.Primary);

		const retry = new ButtonBuilder()
			.setCustomId("retry")
			.setLabel("Retry")
			.setStyle(ButtonStyle.Secondary);

		const row_success = new ActionRowBuilder().addComponents(refresh);
		const row_retry = new ActionRowBuilder().addComponents(retry);

		let response;
		if (content === null)
			response = await interaction.reply({
				content: "Error fetching comment",
				ephemeral: true,
				components: [row_retry],
			});
		else
			response = await interaction.reply({
				embeds: [embed],
				ephemeral,
				components: [row_success],
			});

		const collectorFilter = (i: any) => i.user.id === interaction.user.id;

		try {
			const confirmation =
				await interaction.channel.createMessageComponentCollector({
					filter: collectorFilter,
					time: 60_000,
				});

			confirmation.on("collect", async (interaction: any) => {
				if (interaction.customId === "refresh") {
					const content = await getSarcasticComment();
					if (content) {
						embed.setTitle(content);
						await interaction.update({
							embeds: [embed],
							components: [row_success],
						});
					} else
						await interaction.update({
							content: "Error fetching comment",
							components: [row_retry],
						});
				}

				if (interaction.customId === "retry") {
					const content = await getSarcasticComment();
					if (content)
						await interaction.update({ content, components: [row_success] });
					else
						await interaction.update({
							content: "Error fetching comment",
							components: [row_retry],
						});
				}
			});
		} catch (e) {
			console.error(e);
			await interaction.editReply({
				components: [],
			});
			throw e;
		}
	} catch (e) {
		console.error(e);
	}
};

export = {
	data,
	execute,
};
