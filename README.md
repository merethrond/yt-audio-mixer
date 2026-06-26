# AudioSync Live: YouTube Tutorial Dual-Mixer

A serverless, lightweight web application built to stream, synchronize, and mix two YouTube videos (a tutorial video and a background music track) simultaneously directly in your browser. 

The project requires zero server downloads, zero local storage footprint, and zero rendering CPU. It is hosted entirely as a static web application on GitHub Pages.

🚀 **Live App URL:** [https://merethrond.github.io/yt-audio-mixer/](https://merethrond.github.io/yt-audio-mixer/)

---

## ✨ Features

*   **100% Serverless & Instant**: Side-steps the traditional slow process of downloading and re-encoding large media files. Streams directly using the YouTube IFrame API.
*   **Dual Player Synced Playback**: Play, pause, or buffer the primary tutorial video, and the background soundtrack player will automatically sync in state.
*   **Real-time Independent Volumizer**: Fine-tune the voice volume and the background music level using custom HSL sliders.
*   **Active Vocal Ducking Assistance**: 
    *   **Shift Key**: Hold the `Shift` key anywhere on the workspace to instantly drop the music volume to an ambient `15%` level when the tutor starts speaking. Release it to restore the soundtrack volume.
    *   **Interactive Duck Button**: Click and hold the `DUCK MUSIC` button for the same responsive audio reduction.
*   **Saved Sessions Templates**: Bookmark setups (both URLs and preferred volumes) to your browser's `localStorage` to reload them in one click.

---

## ⌨️ Workspace Hotkeys

When inside the active Sync Studio:
*   `Spacebar` — Sync Play / Sync Pause both players simultaneously (when inputs are not active).
*   `Shift Key (Hold)` — Ducks background music volume to `15%` of its original setting.

---

## 💾 How to Bookmark a Studio Session

You can save your custom setups (YouTube links and volume preferences) to reload them instantly later:
1. Paste the **Tutorial Video** link and the **Background Soundtrack** link in the input fields.
2. Adjust the sliders to set your preferred volume levels for both tracks.
3. Click the **Bookmark (Save)** icon button (located next to the "Initialize Live Studio" button).
4. Your setup will instantly appear in the **Saved Studio Sessions** section at the bottom of the page.
5. Click **Load Session** on any saved card to instantly reload that configuration and initialize the players!

---

## 🛠️ Local Development & Running

Since the application is 100% client-side:
1. Clone the repository:
   ```bash
   git clone https://github.com/merethrond/yt-audio-mixer.git
   ```
2. Open [index.html](index.html) directly in any modern web browser! No local servers, Python virtual environments, or Node.js packages needed.
