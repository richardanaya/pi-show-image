# pi-show-image

A pi extension to display images in the terminal using the kitty image protocol.

## Installation

Install via npm:

```bash
$ pi install npm:pi-show-image
```

Or install from git:

```bash
$ pi install git:github.com/yourusername/pi-show-image
```

## Requirements

- A terminal that supports the kitty graphics protocol:
  - [kitty](https://sw.kovidgoyal.net/kitty/)
  - [wezterm](https://wezfurlong.org/wezterm/)
  - [ghostty](https://ghostty.org/)
  - [iTerm2](https://iterm2.com/) (with inline images support)

## Usage

This extension provides a `show_image` tool that displays images inline in the terminal.

### Parameters

- **path** (required): Absolute or relative path to the image file to display

### Example

```
show_image({
  path: "screenshot.png"
})
```

## How it works

The extension uses the [`terminal-image`](https://github.com/sindresorhus/terminal-image) package to encode and display images using the kitty graphics protocol. Images are sized to 80% of the terminal width/height while preserving their aspect ratio.