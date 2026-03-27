import { Type } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import terminalImage from "terminal-image";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// Store pending images to display after the next assistant message completes
const pendingImages: string[] = [];

// ANSI escape codes
const BG_BLACK = "\x1b[40m";
const RESET = "\x1b[0m";

// Get terminal width
function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

// Strip ANSI codes to get visible length
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

// Center an image output with black background
async function displayCenteredWithBackground(imagePath: string): Promise<void> {
  const termWidth = getTerminalWidth();

  // Generate image at full terminal width
  const imageBuffer = await readFile(imagePath);
  const imageOutput = await terminalImage.buffer(imageBuffer, {
    width: termWidth,
    height: "100%",
    preserveAspectRatio: true,
  });

  // Split into lines
  const lines = imageOutput.split("\n");

  // Process each line: center it and apply black background to full width
  for (const line of lines) {
    if (!line.trim()) {
      // Empty line - just print black background for full width
      console.log(BG_BLACK + " ".repeat(termWidth) + RESET);
      continue;
    }

    const visibleLength = stripAnsi(line).length;
    const padding = Math.max(0, Math.floor((termWidth - visibleLength) / 2));
    const leftPad = " ".repeat(padding);
    const rightPad = " ".repeat(Math.max(0, termWidth - visibleLength - padding));

    // Full width with black background: left padding + image line + right padding
    console.log(BG_BLACK + leftPad + line + rightPad + RESET);
  }
}

export default function (pi: ExtensionAPI) {
  // Display images when any assistant message ends
  pi.on("message_end", async (event) => {
    if (event.message.role !== "assistant") return;
    if (pendingImages.length === 0) return;

    // Small delay to ensure TUI has finished rendering
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Display all queued images centered with black background
    for (const imagePath of pendingImages) {
      try {
        await displayCenteredWithBackground(imagePath);
      } catch (error) {
        console.error(`Failed to display image ${imagePath}:`, error);
      }
    }

    // Clear the queue
    pendingImages.length = 0;
  });

  pi.registerTool({
    name: "show_image",
    label: "Show Image",
    description: "Queue an image to be displayed in the terminal after the assistant finishes its current message. Image will be centered with a black background filling the full terminal width. Uses kitty image protocol (works in kitty, wezterm, ghostty, etc.)",
    parameters: Type.Object({
      path: Type.String({
        description: "Absolute or relative path to the image file to display",
      }),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const { path: imagePath } = params as { path: string };
      const absolutePath = resolve(ctx.cwd, imagePath);

      // Validate the file exists
      try {
        await readFile(absolutePath);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Cannot read image at ${absolutePath}: ${errorMessage}`);
      }

      // Queue for display at the end of the current assistant message
      pendingImages.push(absolutePath);

      return {
        content: [],
        details: {
          path: absolutePath,
          queued: true,
        },
      };
    },
  });
}