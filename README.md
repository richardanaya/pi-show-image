# pi-show-image

A pi extension to display images in the terminal using the kitty image protocol.

## Installation

Install via npm:

```bash
$ pi install npm:pi-show-image
```

Or install from git:

```bash
$ pi install git:github.com/richardanaya/pi-show-image
```

## Requirements

- A terminal that supports the kitty graphics protocol:
  - [kitty](https://sw.kovidgoyal.net/kitty/)
  - [wezterm](https://wezfurlong.org/wezterm/)
  - [ghostty](https://ghostty.org/)
  - [iTerm2](https://iterm2.com/) (with inline images support)

## Usage

This extension provides a `show_image` tool that displays images inline in the terminal after the assistant finishes its message.

### Parameters

- **path** (optional): Absolute or relative path to a local image file
- **url** (optional): URL of an image to download and display

*Note: Either `path` or `url` must be provided, but not both.*

### Examples

Show a local image:
```
show_image({
  path: "screenshot.png"
})
```

Show an image from a URL:
```
show_image({
  url: "https://example.com/image.png"
})
```

## Features

- **Deferred display**: Images are queued and displayed after the assistant finishes its current message
- **Full width**: Images use the full terminal width
- **Centered**: Images are centered in the terminal
- **Black background**: All rows have a black background for a clean presentation
- **URL support**: Can download and display images from URLs
- **Silent operation**: No text output from the tool (just displays the image)

## How it works

The extension uses the [`terminal-image`](https://github.com/sindresorhus/terminal-image) package to encode and display images using the kitty graphics protocol. Images are temporarily downloaded to a temp directory when using URLs, and cleaned up automatically after display.