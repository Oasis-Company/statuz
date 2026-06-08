import { detectManual } from "../detector/manual.js";
import { detectAuto } from "../detector/auto.js";

interface DetectOptions {
  interactive?: boolean;
  auto?: boolean;
  confidenceThreshold: string;
}

export async function detectArrows(options: DetectOptions): Promise<void> {
  const threshold = parseFloat(options.confidenceThreshold);

  if (options.interactive) {
    await detectManual();
  } else if (options.auto) {
    await detectAuto(threshold);
  } else {
    console.log("🔍 Running auto-detection first...");
    await detectAuto(threshold);
    console.log("\n🤖 Now running interactive mode for refinement...");
    await detectManual();
  }
}
