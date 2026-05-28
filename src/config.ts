function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and fill it in.`,
    );
  }
  return value;
}

export const config = {
  discordToken: required("DISCORD_TOKEN"),
  clientId: required("DISCORD_CLIENT_ID"),
  guildId: process.env.DISCORD_GUILD_ID?.trim() || null,
  ytdlpPath: process.env.YTDLP_PATH?.trim() || "yt-dlp",
  ffmpegPath: process.env.FFMPEG_PATH?.trim() || "ffmpeg",
} as const;

export type AppConfig = typeof config;
