import type { GuildTextBasedChannel, VoiceBasedChannel } from "discord.js";
import { logger } from "../utils/logger.ts";
import { GuildQueue } from "./guild-queue.ts";

const log = logger.scope("queue-manager");

class QueueManager {
  private queues = new Map<string, GuildQueue>();

  get(guildId: string): GuildQueue | undefined {
    return this.queues.get(guildId);
  }

  getOrCreate(
    guildId: string,
    voiceChannel: VoiceBasedChannel,
    textChannel: GuildTextBasedChannel | null,
  ): GuildQueue {
    let queue = this.queues.get(guildId);
    if (queue) {
      if (textChannel) queue.textChannel = textChannel;
      return queue;
    }
    queue = new GuildQueue(guildId, voiceChannel, textChannel);
    this.queues.set(guildId, queue);
    log.debug("queue-created", { guildId });
    return queue;
  }

  destroy(guildId: string): boolean {
    const q = this.queues.get(guildId);
    if (!q) return false;
    q.destroy();
    this.queues.delete(guildId);
    log.debug("queue-destroyed", { guildId });
    return true;
  }
}

export const queueManager = new QueueManager();
