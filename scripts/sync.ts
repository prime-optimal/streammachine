import { cp, mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

type Interface = { displayName: string; shortDescription: string; longDescription: string; capabilities: string[]; defaultPrompt: string[] };
type PluginSpec = { name: string; description: string; keywords: string[]; servers: string[]; skills: string[]; onboardingSkill?: string; dist: string[]; category: string; interface: Interface };

const root = resolve(import.meta.dir, "..");
const source = resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("Usage: bun scripts/sync.ts <stream-machine-plugin>/artifacts/package/stream-machine");
const manifest = await Bun.file(join(source, "plugin.json")).json();
if (manifest.name !== "stream-machine") throw new Error(`Not a Stream Machine package: ${source}`);
const servers: Record<string, unknown> = (await Bun.file(join(source, "mcp.json")).json()).mcpServers;
const base = manifest.extensions["com.openai"].interface;

const plugins: PluginSpec[] = [
  {
    name: "stream-machine",
    description: "Hosted Twitch tools, clips, and the Stream Machine menu.",
    keywords: ["twitch", "streaming", "clips"],
    servers: ["stream-machine"],
    skills: ["onboarding", "preview-recipe"],
    onboardingSkill: "onboarding",
    dist: [],
    category: "Productivity",
    interface: {
      displayName: "Stream Machine",
      shortDescription: "Twitch, clips, and the menu",
      longDescription: "Connects the hosted stream-machine server on ChatGPT Sites. It connects your Twitch channel, reads channel and clip data, previews title changes for your approval, and opens the Stream Machine menu. Nothing runs on your computer.",
      capabilities: ["Interactive"],
      defaultPrompt: ["Connect Twitch through Stream Machine and show my channel."],
    },
  },
  {
    name: "stream-machine-obs",
    description: "Local OBS WebSocket tools for scenes, alerts, and browser sources.",
    keywords: ["obs", "streaming", "scenes"],
    servers: ["stream-machine-obs"],
    skills: [],
    dist: ["obs-server.js"],
    category: "Productivity",
    interface: {
      displayName: "Stream Machine OBS",
      shortDescription: "OBS scenes and alerts",
      longDescription: "Runs a local stdio server that talks to OBS WebSocket on this computer. It inspects scenes, shows a Stream Machine alert, and creates or removes scenes and browser sources. Requires Bun and OBS with WebSocket enabled. Desktop only.",
      capabilities: ["Interactive"],
      defaultPrompt: ["Check OBS and list my scenes."],
    },
  },
  {
    name: "stream-machine-streamdeck",
    description: "Local Stream Deck tools that lay out OBS buttons on a USB deck.",
    keywords: ["stream deck", "obs", "streaming"],
    servers: ["stream-machine-streamdeck"],
    skills: [],
    dist: ["server.js", "streamdeck-action.js"],
    category: "Productivity",
    interface: {
      displayName: "Stream Machine Stream Deck",
      shortDescription: "Stream Deck layouts for OBS",
      longDescription: "Runs a local stdio server that drives the original 15-key Stream Deck over USB. It previews and applies a layout of OBS scene, audio, record, and stream buttons. Requires Bun, and the Elgato Stream Deck app must be closed. Desktop only.",
      capabilities: ["Interactive"],
      defaultPrompt: ["Preview a Stream Deck layout from my OBS scenes."],
    },
  },
];

const write = (path: string, value: unknown) => Bun.write(path, `${JSON.stringify(value, null, 2)}\n`);
await rm(join(root, "plugins"), { recursive: true, force: true });
for (const plugin of plugins) {
  const dir = join(root, "plugins", plugin.name);
  if (plugin.interface.shortDescription.length > 30) throw new Error(`shortDescription too long: ${plugin.name}`);
  const mcpServers = Object.fromEntries(plugin.servers.map((id) => {
    if (!servers[id]) throw new Error(`Missing server ${id} in ${source}/mcp.json`);
    return [id, servers[id]];
  }));
  const openaiInterface = {
    ...plugin.interface,
    developerName: base.developerName,
    websiteURL: base.websiteURL,
    privacyPolicyURL: base.privacyPolicyURL,
    termsOfServiceURL: base.termsOfServiceURL,
    category: plugin.category,
  };
  const identity = { name: plugin.name, version: manifest.version, description: plugin.description, author: manifest.author, repository: manifest.repository, keywords: plugin.keywords };
  const onboarding = plugin.onboardingSkill ? { onboardingSkill: `./skills/${plugin.onboardingSkill}/SKILL.md` } : {};
  await mkdir(join(dir, ".codex-plugin"), { recursive: true });
  await write(join(dir, "plugin.json"), {
    $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    ...identity,
    extensions: { "com.openai": { ...onboarding, interface: openaiInterface } },
  });
  await write(join(dir, "mcp.json"), { $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json", mcpServers });
  await write(join(dir, ".codex-plugin/plugin.json"), {
    ...identity,
    interface: openaiInterface,
    extensions: { "com.openai": onboarding },
    ...(plugin.skills.length ? { skills: "./skills" } : {}),
    mcpServers: "./.mcp.json",
  });
  await write(join(dir, ".mcp.json"), { mcpServers });
  for (const skill of plugin.skills) await cp(join(source, "skills", skill), join(dir, "skills", skill), { recursive: true });
  for (const file of plugin.dist) await cp(join(source, "dist", file), join(dir, "dist", file));
  if (plugin.dist.length) await cp(join(source, "THIRD_PARTY_NOTICES.txt"), join(dir, "THIRD_PARTY_NOTICES.txt"));
}

await mkdir(join(root, ".agents/plugins"), { recursive: true });
await write(join(root, ".agents/plugins/marketplace.json"), {
  name: "stream-machine",
  interface: { displayName: "Stream Machine" },
  plugins: plugins.map((plugin) => ({
    name: plugin.name,
    source: { source: "local", path: `./plugins/${plugin.name}` },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
    category: plugin.category,
  })),
});
console.log(`Synced ${plugins.length} plugins from stream-machine ${manifest.version}.`);
