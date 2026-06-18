import { LlmConfigManager, createLlmClient } from "@statuz/sdk-ts";

console.log("1. Getting config manager...");
const mgr = LlmConfigManager.getInstance();
console.log("2. Loading from env...");
mgr.loadFromEnvironment();
console.log("  Provider:", (mgr.getConfig() as any).provider);
console.log("  Enabled:", (mgr.getConfig() as any).enabled);
console.log("  Has API key:", !!(mgr.getConfig() as any).apiKey);
console.log("3. Validation errors:", JSON.stringify(mgr.validate()));
console.log("4. Creating client...");
const client = createLlmClient();
console.log("5. Client isEnabled:", client.isEnabled());
console.log("6. Calling chat...");
client.chat([{ role: "user", content: "Say 'LLM WORKS' and nothing else." }], { maxTokens: 50, temperature: 0.3 })
  .then((resp) => {
    console.log("✅ LLM Response:", resp.content);
    console.log("   Tokens:", resp.tokenUsage?.total || "unknown");
  })
  .catch((err) => {
    console.log("❌ Error:", err.message);
  });
