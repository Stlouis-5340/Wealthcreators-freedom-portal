import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCommunityUrl } from "../lib/community-link";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(parseCommunityUrl("") === null, "a blank address stays unset");
assert(parseCommunityUrl("   ") === null, "whitespace stays unset");
assert(parseCommunityUrl("mighty networks") === null, "a bare name is not a link");
assert(parseCommunityUrl("javascript:alert(1)") === null, "javascript URLs stay unset");
assert(parseCommunityUrl("ftp://files.example/community") === null, "only http and https");
assert(parseCommunityUrl("https://user:secret@example.com/c") === null, "credentials stay out of the link");
assert(
  parseCommunityUrl("https://example.com/community") === "https://example.com/community",
  "https community home is kept",
);
assert(
  parseCommunityUrl("  http://localhost:3000/c  ") === "http://localhost:3000/c",
  "a trimmed http address is kept",
);
assert(parseCommunityUrl(`https://example.com/${"a".repeat(2100)}`) === null, "over-long addresses stay unset");

const root = resolve(__dirname, "..");
function source(path: string): string {
  return readFileSync(resolve(root, path), "utf8");
}

const example = source(".env.example");
assert(example.includes("MIGHTY_NETWORKS_URL="), ".env.example documents the community URL");
assert(!example.includes("MIGHTY_NETWORKS_URL=http"), ".env.example does not ship a live community URL");

const readme = source("README.md");
assert(readme.includes("MIGHTY_NETWORKS_URL"), "the README documents the community URL");
assert(readme.includes("coming soon"), "the README describes the unset state");
assert(!readme.includes("No Mighty Networks"), "the README no longer says the link is absent");

const proxy = source("proxy.ts");
assert(proxy.includes('pathname === "/community"'), "members can open /community");

const shell = source("components/app-shell.tsx");
const memberNav = shell.slice(shell.indexOf("const memberNav"), shell.indexOf("const guideNav"));
const guideNav = shell.slice(shell.indexOf("const guideNav"), shell.indexOf("const adminNav"));
assert(memberNav.includes('href: "/community"') && memberNav.includes('label: "Community"'), "members have a Community entry");
assert(!guideNav.includes("/community") && !guideNav.includes("Community"), "the guide menu adds Community only when a URL is set");
assert(shell.includes("CommunityAnchor"), "the menu uses the shared new-tab link");
assert(shell.includes("if (!communityUrl) return guideNav"), "an unset URL leaves the guide menu unchanged");

const panel = source("components/mighty-networks-link.tsx");
assert(panel.includes('rel="noopener noreferrer"'), "the page link uses noopener noreferrer");
assert(panel.includes("Community coming soon"), "members see coming soon when the URL is unset");
assert(panel.includes("if (!url) return null"), "the guide line hides when the URL is unset");

const guidePage = source("app/(portal)/guide/page.tsx");
assert(guidePage.includes("GuideMightyNetworksLink"), "the guide command center can show the same link");

const analytics = source("app/(portal)/admin/analytics/page.tsx");
assert(!analytics.includes("Mighty") && !analytics.includes("MIGHTY_NETWORKS"), "Leadership analytics is unchanged");

const challenges = source("components/views/challenges-view.tsx");
assert(!challenges.includes("Mighty"), "Challenges behavior is unchanged");

console.log("community link checks passed");
