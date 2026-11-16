import type { Command } from "../types.ts";
import clear from "./clear.ts";
import echo from "./echo.ts";
import help from "./help.ts";
import join from "./join.ts";
import leave from "./leave.ts";
import loop from "./loop.ts";
import nowplaying from "./nowplaying.ts";
import pause from "./pause.ts";
import ping from "./ping.ts";
import play from "./play.ts";
import previous from "./previous.ts";
import purge from "./purge.ts";
import queue from "./queue.ts";
import remove from "./remove.ts";
import resume from "./resume.ts";
import sarcasm from "./sarcasm.ts";
import shuffle from "./shuffle.ts";
import skip from "./skip.ts";
import stop from "./stop.ts";
import volume from "./volume.ts";

const list: Command[] = [
  play,
  pause,
  resume,
  skip,
  previous,
  loop,
  queue,
  nowplaying,
  stop,
  shuffle,
  remove,
  clear,
  volume,
  join,
  leave,
  help,
  ping,
  echo,
  purge,
  sarcasm,
];

export const commands: ReadonlyMap<string, Command> = new Map(
  list.map((c) => [c.data.name, c]),
);
