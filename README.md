# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.



# Logo → Emoji Converter

Logo → Emoji Converter is a web app that lets you turn any logo screenshot into a custom emoji-ready image.

Upload or capture a logo, crop and clean it up, apply basic edits, then export a transparent PNG emoji you can use in chats, Slack, Discord, or as custom stickers.

## Features

- **Multiple input options**
  - Upload PNG / JPG logo images
  - Drag & drop support
  - Camera capture on mobile devices (where supported)

- **Image editing**
  - Canvas-based preview
  - Crop and zoom around the logo
  - Simple background removal (auto keying based on background color)
  - Brightness and contrast controls
  - Optional filters (none, grayscale, sepia)
  - Overlay short text (e.g. initials, "VIP")

- **Emoji creation**
  - Generate emoji in common square sizes (64×64, 128×128, 256×256, 512×512)
  - Preview inside a “text message bubble” to see how it feels in real usage

- **Export & sharing**
  - Download as PNG with transparent background
  - Copy emoji image (or data URL) to clipboard
  - Generate a shareable link (URL with embedded image data)
  - Local emoji gallery stored in `localStorage`

- **UX & UI**
  - Step-by-step flow: **Upload → Edit → Preview → Export**
  - Clean, modern layout
  - Mobile responsive
  - Dark / light mode toggle

## Tech Stack

- **Frontend:** React + Vite
- **Image processing:** HTML5 Canvas APIs
- **State management:** React hooks
- **Storage:** `localStorage` for emoji gallery

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/logo-emoji-converter.git
cd logo-emoji-converter

# 2. Install dependencies
npm install

# 3. Run the dev server
npm run dev
