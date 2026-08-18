import { describe, expect, it } from "vitest";
import {
  applyPaletteSelection,
  commandPrefix,
  displayPills,
  filterPalette,
  findEntry,
  parseSlash,
  slashPaletteState,
} from "./slashCommands";

describe("findEntry", () => {
  it("resolves canonical names and aliases", () => {
    expect(findEntry("bookmark")?.commandId).toBe("bookmark");
    expect(findEntry("bm")?.commandId).toBe("bookmark");
    expect(findEntry("url")?.commandId).toBe("bookmark");
    expect(findEntry("link")?.tilType).toBe("LINK");
    expect(findEntry("learn")?.commandId).toBe("til");
    expect(findEntry("quote")?.tilType).toBe("QUOTE");
    expect(findEntry("task")?.commandId).toBe("todo");
    expect(findEntry("nope")).toBeNull();
  });
});

describe("filterPalette", () => {
  it("shows the three capture commands for an empty query", () => {
    expect(filterPalette("").map((entry) => entry.name)).toEqual([
      "bookmark",
      "til",
      "todo",
    ]);
  });

  it("ranks shorter prefix matches first", () => {
    expect(filterPalette("t").map((entry) => entry.name)).toEqual(["til", "todo"]);
  });

  it("surfaces type aliases when they match", () => {
    expect(filterPalette("q").map((entry) => entry.name)).toEqual(["bookmark", "quote"]);
    expect(filterPalette("quo").map((entry) => entry.name)).toEqual(["quote"]);
  });
});

describe("parseSlash", () => {
  it("ignores non-slash input", () => {
    expect(parseSlash("til redis")).toEqual({ kind: "none" });
    expect(parseSlash("https://example.com")).toEqual({ kind: "none" });
  });

  it("stays in palette until a trailing space locks the token", () => {
    expect(parseSlash("/")).toEqual({ kind: "palette", query: "" });
    expect(parseSlash("/to")).toEqual({ kind: "palette", query: "to" });
    expect(parseSlash("/todo")).toEqual({ kind: "palette", query: "todo" });
  });

  it("locks a command on trailing space", () => {
    const parsed = parseSlash("/todo call the vet");
    expect(parsed.kind).toBe("command");
    if (parsed.kind !== "command") return;
    expect(parsed.entry.commandId).toBe("todo");
    expect(parsed.rest).toBe("call the vet");
  });

  it("maps aliases onto the same command", () => {
    const parsed = parseSlash("/bm example.com");
    expect(parsed.kind).toBe("command");
    if (parsed.kind !== "command") return;
    expect(parsed.entry.commandId).toBe("bookmark");
    expect(parsed.rest).toBe("example.com");
  });

  it("strips a leading TIL type from /til payloads", () => {
    const parsed = parseSlash("/til quote clocks drift");
    expect(parsed.kind).toBe("command");
    if (parsed.kind !== "command") return;
    expect(parsed.tilType).toBe("QUOTE");
    expect(parsed.rest).toBe("clocks drift");
    expect(parsed.rawRest).toBe("quote clocks drift");
  });

  it("treats /quote as a typed record command", () => {
    const parsed = parseSlash("/quote clocks drift");
    expect(parsed.kind).toBe("command");
    if (parsed.kind !== "command") return;
    expect(parsed.entry.commandId).toBe("til");
    expect(parsed.tilType).toBe("QUOTE");
    expect(parsed.rest).toBe("clocks drift");
  });

  it("defaults /til body to FACT when the first word is not a type", () => {
    const parsed = parseSlash("/til redis is single-threaded");
    expect(parsed.kind).toBe("command");
    if (parsed.kind !== "command") return;
    expect(parsed.tilType).toBe("FACT");
    expect(parsed.rest).toBe("redis is single-threaded");
  });

  it("marks unknown tokens after a space", () => {
    expect(parseSlash("/nope hello")).toEqual({
      kind: "unknown",
      token: "nope",
      rest: "hello",
    });
  });
});

describe("slashPaletteState", () => {
  it("stays closed when unfocused or not a slash", () => {
    expect(slashPaletteState("/todo", false).open).toBe(false);
    expect(slashPaletteState("hello", true).open).toBe(false);
  });

  it("opens the command list while typing a token", () => {
    const state = slashPaletteState("/t", true);
    expect(state.open).toBe(true);
    expect(state.mode).toBe("command");
    expect(state.matches.map((entry) => entry.name)).toEqual(["til", "todo"]);
  });

  it("opens TIL types after /til ", () => {
    const state = slashPaletteState("/til ", true);
    expect(state.open).toBe(true);
    expect(state.mode).toBe("type");
    expect(state.matches.map((entry) => entry.name)).toContain("quote");
  });

  it("filters types while the first word is still a prefix", () => {
    const state = slashPaletteState("/til qu", true);
    expect(state.open).toBe(true);
    expect(state.mode).toBe("type");
    expect(state.matches.map((entry) => entry.name)).toEqual(["quote"]);
  });

  it("closes once the TIL body starts", () => {
    expect(slashPaletteState("/til redis is", true).open).toBe(false);
    expect(slashPaletteState("/todo call the vet", true).open).toBe(false);
  });
});

describe("commandPrefix + displayPills", () => {
  it("keeps the type token in the prefix once the body starts", () => {
    expect(commandPrefix("/til quote clocks")).toBe("/til quote ");
    expect(displayPills("/til quote clocks")).toEqual(["/TIL", "/QUOTE"]);
  });

  it("does not swallow a type word still being chosen", () => {
    expect(commandPrefix("/til quote")).toBe("/til ");
    expect(displayPills("/til quote")).toEqual(["/TIL"]);
  });
});

describe("applyPaletteSelection", () => {
  it("inserts a trailing space so the command locks", () => {
    const bookmark = findEntry("bookmark");
    expect(bookmark).toBeTruthy();
    expect(applyPaletteSelection("/b", bookmark!, "command")).toBe("/bookmark ");
  });

  it("keeps the original token when completing a type", () => {
    const quote = findEntry("quote");
    expect(quote).toBeTruthy();
    expect(applyPaletteSelection("/til qu", quote!, "type")).toBe("/til quote ");
  });
});
