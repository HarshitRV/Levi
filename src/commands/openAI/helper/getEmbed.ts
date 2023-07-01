import { ColorResolvable, EmbedBuilder } from "discord.js";

/**
 * @description Creates an embed with given title, description and color
 * @returns EmbedBuilder object
 */
export const getEmbed = (
	title: string,
	description: string,
	color: ColorResolvable = 0x92eb34
): EmbedBuilder => {
	return new EmbedBuilder()
		.setColor(color)
		.setTitle(title)
		.setDescription(description)
		.setTimestamp();
};
