import { TilItem } from "@/components/til/TilFeedItem";

/**
 * Generates clean, publication-ready markdown for PRESS roundups.
 * Output pastes cleanly into GitHub comments, Substack drafts, and Discord/Slack.
 */
export function generatePressMarkdown(
  entries: TilItem[],
  monthLabel: string
): string {
  if (entries.length === 0) {
    return `# HOARD TIL ROUNDUP — ${monthLabel}\n\n*No TIL entries recorded for this month.*`;
  }

  // Count unique tags
  const tagSet = new Set<string>();
  entries.forEach((e) => e.tags?.forEach((t) => tagSet.add(t.toLowerCase())));

  const lines: string[] = [];

  lines.push(`# HOARD TIL ROUNDUP — ${monthLabel.toUpperCase()}`);
  lines.push(`*Generated from HOARD TIL Archive • ${entries.length} entries across ${tagSet.size} topics*\n`);
  lines.push("---\n");

  entries.forEach((item, index) => {
    const num = index + 1;
    const dateStr = item.loggedFor || item.createdAt.split("T")[0];
    const typeLabel = `[${item.type}]`;
    const hashLabel = `(#${item.shortHash})`;

    lines.push(`### ${num}. ${typeLabel} ${dateStr} ${hashLabel}`);

    // Clean body: strip HTML tags if any, ensure inline <code> becomes backticks
    if (item.body) {
      let cleanBody = item.body.replace(/<[^>]*>/g, ""); // strip HTML tags
      cleanBody = cleanBody.replace(/<code>(.*?)<\/code>/gi, "`$1`"); // convert HTML code to markdown
      lines.push(cleanBody);
    }

    // Code snippet fence
    if (item.code) {
      const lang = item.codeLang || "";
      lines.push(`\n\`\`\`${lang}\n${item.code}\n\`\`\``);
    }

    // Link URL
    if (item.linkUrl && (!item.body || !item.body.includes(item.linkUrl))) {
      lines.push(`\n**Source Link:** [${item.linkPreview?.title || item.linkUrl}](${item.linkUrl})`);
    }

    // Tags italicized
    if (item.tags && item.tags.length > 0) {
      const formattedTags = item.tags.map((t) => `*#${t}*`).join(" ");
      lines.push(`\n${formattedTags}`);
    }

    lines.push("\n---\n");
  });

  return lines.join("\n").trim();
}
