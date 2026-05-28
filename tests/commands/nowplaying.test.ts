import { describe, expect, test } from "bun:test";
import { ComponentType, type APIButtonComponentWithCustomId } from "discord.js";
import {
  buildControlRow,
  parseControlAction,
} from "../../src/commands/_nowplaying.ts";

function buttonData(
  row: ReturnType<typeof buildControlRow>,
): APIButtonComponentWithCustomId[] {
  return row.components.map((button) => {
    const data = button.data;
    if (data.type !== ComponentType.Button || !("custom_id" in data)) {
      throw new Error("expected button component with custom_id");
    }
    return data as APIButtonComponentWithCustomId;
  });
}

describe("parseControlAction", () => {
  test("recognises all six actions", () => {
    expect(parseControlAction("np:prev")).toBe("prev");
    expect(parseControlAction("np:pause")).toBe("pause");
    expect(parseControlAction("np:resume")).toBe("resume");
    expect(parseControlAction("np:skip")).toBe("skip");
    expect(parseControlAction("np:stop")).toBe("stop");
    expect(parseControlAction("np:shuffle")).toBe("shuffle");
  });

  test("returns null for unrelated customIds", () => {
    expect(parseControlAction("np:")).toBeNull();
    expect(parseControlAction("")).toBeNull();
    expect(parseControlAction("sarcasm:refresh")).toBeNull();
    expect(parseControlAction("np:unknown")).toBeNull();
  });
});

describe("buildControlRow", () => {
  const allEnabled = {
    paused: false,
    canPrev: true,
    canSkip: true,
    canShuffle: true,
  };

  test("returns a row with exactly 5 buttons", () => {
    const row = buildControlRow(allEnabled);
    expect(row.components).toHaveLength(5);
  });

  test("pause/resume label and customId flip with paused state", () => {
    const playing = buttonData(buildControlRow(allEnabled));
    const paused = buttonData(buildControlRow({ ...allEnabled, paused: true }));

    expect(playing[1]?.label).toBe("Pause");
    expect(playing[1]?.custom_id).toBe("np:pause");
    expect(paused[1]?.label).toBe("Resume");
    expect(paused[1]?.custom_id).toBe("np:resume");
  });

  test("disables Previous, Skip, and Shuffle when flags are false", () => {
    const row = buttonData(
      buildControlRow({
        paused: false,
        canPrev: false,
        canSkip: false,
        canShuffle: false,
      }),
    );

    expect(row[0]?.custom_id).toBe("np:prev");
    expect(row[0]?.disabled).toBe(true);
    expect(row[2]?.custom_id).toBe("np:skip");
    expect(row[2]?.disabled).toBe(true);
    expect(row[4]?.custom_id).toBe("np:shuffle");
    expect(row[4]?.disabled).toBe(true);
  });

  test("button customIds match what parseControlAction expects", () => {
    const ids = buttonData(buildControlRow(allEnabled)).map((b) => b.custom_id);
    expect(ids).toEqual([
      "np:prev",
      "np:pause",
      "np:skip",
      "np:stop",
      "np:shuffle",
    ]);
    for (const id of ids) {
      expect(parseControlAction(id!)).not.toBeNull();
    }

    const resumeId = buttonData(
      buildControlRow({ ...allEnabled, paused: true }),
    )[1]?.custom_id;
    expect(resumeId).toBe("np:resume");
    expect(parseControlAction(resumeId!)).toBe("resume");
  });
});
