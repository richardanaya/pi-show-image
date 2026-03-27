import { Type } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import terminalImage from "terminal-image";
import { readFile, writeFile, mkdtemp, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";

// Store pending images to display after the next assistant message completes
const pendingImages: string[] = [];
const tempFilesToCleanup: string[] = [];

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

// Download image from URL to temp file
async function downloadImage(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.startsWith("image/")) {
    throw new Error(`URL does not point to an image (content-type: ${contentType})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  // Create temp file
  const tempDir = await mkdtemp(join(tmpdir(), "pi-show-image-"));
  const ext = contentType.split("/")[1] || "png";
  const tempPath = join(tempDir, `image.${ext}`);

  await writeFile(tempPath, buffer);
  tempFilesToCleanup.push(tempPath);

  return tempPath;
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

    // Cleanup temp files
    for (const tempPath of tempFilesToCleanup) {
      try {
        await unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }
    tempFilesToCleanup.length = 0;

    // Clear the queue
    pendingImages.length = 0;
  });

  pi.registerTool({
    name: "show_image",
    label: "Show Image",
    description: "Queue an image to be displayed in the terminal after the assistant finishes its current message. Accepts either a local file path or a URL. Image will be centered with a black background filling the full terminal width. Uses kitty image protocol (works in kitty, wezterm, ghostty, etc.)",
    parameters: Type.Object({
      path: Type.Optional(Type.String({
        description: "Absolute or relative path to a local image file to display",
      })),
      url: Type.Optional(Type.String({
        description: "URL of an image to download and display",
      })),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const { path: imagePath, url: imageUrl } = params as { path?: string; url?: string };

      if (!imagePath && !imageUrl) {
        throw new Error("Either 'path' or 'url' must be provided");
      }

      let absolutePath: string;

      if (imageUrl) {
        // Download from URL
        try {
          absolutePath = await downloadImage(imageUrl);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to download image from URL: ${errorMessage}`);
        }
      } else if (imagePath) {
        // Use local file
        absolutePath = resolve(ctx.cwd, imagePath);

        // Validate the file exists
        try {
          await readFile(absolutePath);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Cannot read image at ${absolutePath}: ${errorMessage}`);
        }
      } else {
        throw new Error("Either 'path' or 'url' must be provided");
      }

      // Queue for display at the end of the current assistant message
      pendingImages.push(absolutePath);

      return {
        content: [],
        details: {
          source: imageUrl || absolutePath,
          queued: true,
        },
      };
    },
  });
}