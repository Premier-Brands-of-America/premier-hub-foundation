import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Lightbulb,
  Code2,
  Minus,
  Link2,
  LayoutList,
  Video,
} from "lucide-react";

export type SlashGroup = "Basic" | "Insert" | "Hub";

export interface SlashCommand {
  id: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
  group: SlashGroup;
}

/** Block embeds + meeting notes are fenced blocks rendered by custom components. */
export const VIEW_BLOCK_TEMPLATE =
  '```view\n{"source":"tasks","filter":"open","title":"Open tasks"}\n```\n';

export const MEET_BLOCK_TEMPLATE =
  '```meet\n{"subject":"Meeting notes","status":"pending","summary":null,"actionItems":[],"segments":[]}\n```\n';

export const SLASH_COMMANDS: SlashCommand[] = [
  { id: "h1", label: "Heading 1", hint: "Large section heading", icon: Heading1, keywords: ["title", "h1"], group: "Basic" },
  { id: "h2", label: "Heading 2", hint: "Medium section heading", icon: Heading2, keywords: ["h2"], group: "Basic" },
  { id: "h3", label: "Heading 3", hint: "Small section heading", icon: Heading3, keywords: ["h3"], group: "Basic" },
  { id: "bullet", label: "Bulleted list", hint: "Simple bullet list", icon: List, keywords: ["ul", "unordered"], group: "Basic" },
  { id: "todo", label: "To-do list", hint: "Track tasks with checkboxes", icon: ListChecks, keywords: ["checkbox", "task"], group: "Basic" },
  { id: "numbered", label: "Numbered list", hint: "Ordered list", icon: ListOrdered, keywords: ["ol", "ordered"], group: "Basic" },
  { id: "quote", label: "Quote", hint: "Capture a quotation", icon: Quote, keywords: ["blockquote"], group: "Basic" },
  { id: "divider", label: "Divider", hint: "Horizontal rule", icon: Minus, keywords: ["hr", "separator", "rule"], group: "Basic" },
  { id: "callout", label: "Callout", hint: "Make text stand out", icon: Lightbulb, keywords: ["info", "note", "tip"], group: "Insert" },
  { id: "code", label: "Code block", hint: "Fenced code snippet", icon: Code2, keywords: ["snippet", "pre"], group: "Insert" },
  { id: "link", label: "Link to…", hint: "Mention a page, task, project, request", icon: Link2, keywords: ["mention", "wikilink", "reference"], group: "Hub" },
  { id: "embed", label: "Embed view", hint: "Live filtered tasks or projects", icon: LayoutList, keywords: ["view", "database", "linked", "list"], group: "Hub" },
  { id: "meet", label: "Meeting notes", hint: "Transcript, summary & action items", icon: Video, keywords: ["teams", "transcript", "summary", "meet"], group: "Hub" },
];

/** Display order for grouped rendering in the slash menu. */
export const SLASH_GROUP_ORDER: SlashGroup[] = ["Basic", "Insert", "Hub"];

export type SlashInsertion =
  | "link"
  | { text: string; /** caret offset from the start of inserted text */ caret?: number; block?: boolean };

/** What a slash command inserts into the editor. */
export function slashInsertion(id: string): SlashInsertion {
  switch (id) {
    case "h1":
      return { text: "# " };
    case "h2":
      return { text: "## " };
    case "h3":
      return { text: "### " };
    case "bullet":
      return { text: "- " };
    case "todo":
      return { text: "- [ ] " };
    case "numbered":
      return { text: "1. " };
    case "quote":
      return { text: "> " };
    case "callout":
      return { text: "> 💡 " };
    case "code":
      return { text: "```\n\n```\n", caret: 4, block: true }; // caret on the empty middle line
    case "divider":
      return { text: "---\n", block: true };
    case "embed":
      return { text: VIEW_BLOCK_TEMPLATE, block: true };
    case "meet":
      return { text: MEET_BLOCK_TEMPLATE, block: true };
    case "link":
      return "link";
    default:
      return { text: "" };
  }
}
