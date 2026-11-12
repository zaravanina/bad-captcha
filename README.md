<div align="center">

# 🤖 Bad Captcha

**Prove you're human. Good luck.**

A deliberately terrible CAPTCHA. Built in two hours, for a demo.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)

</div>

---

## ✨ The idea

CAPTCHAs are supposed to keep bots out and let humans in.
This one does neither particularly well. That's the point.

## 🚀 Quick start

You need [Node.js](https://nodejs.org) 20+ and [Git](https://git-scm.com).

```bash
git clone https://github.com/zaravanina/bad-captcha.git
cd bad-captcha
npm install
npm run dev
```

Then open **http://localhost:3000**.

## 🧑‍💻 Working together in VS Code

1. Open **`bad-captcha.code-workspace`** (File → Open Workspace from File) and install the recommended extensions when prompted.
2. Run tasks from **Terminal → Run Task**:

   | Task | What it does |
   | --- | --- |
   | **Install** | `npm install` |
   | **Dev server** | Starts the app on localhost:3000 (also `Ctrl+Shift+B`) |
   | **Pull latest** | Gets everyone else's changes |
   | **Commit & push all** | Asks for a message, commits, pulls, then pushes |

3. Prefer clicking? Commit in the **Source Control** panel. It pushes automatically.

> 💡 **Avoid merge conflicts:** try to work in different files from each other, and pull often.

## 🧩 Steps (one per sense)

The captcha is a series of steps, one per human sense. **Each person owns one step file and only edits that file**, so nobody's code clashes.

| # | Sense | File | What it is |
| --- | --- | --- | --- |
| 1 | See | `src/steps/01-see.tsx` | Sort scrambled hue tiles into a gradient |
| 2 | Hear | `src/steps/02-hear.tsx` | Match a tone's pitch with an unlabeled slider |
| 3 | Touch | `src/steps/03-touch.tsx` | Jigsaw with face-down pieces that flip back |
| 4 | Smell | `src/steps/04-smell.tsx` | Placeholder, waiting for its owner |
| 5 | Emotion | `src/steps/05-emotion.tsx` | Placeholder, waiting for its owner |

**Switching steps while developing:** in `npm run dev` there's a **DEV bar** at the bottom of the page. Click a step (or **Final**) to jump to it, click ↻ to restart the current step, or press **Alt + ← / →**. The URL updates too, so `http://localhost:3000/?step=2` reloads straight into step 2. The bar is hidden in production builds unless you add `?dev` to the URL.

### How a step works

A step file default-exports `defineStep(...)`. Your component gets two functions and decides its own rules:

- `pass()`: call it when the user beats your step. The flow moves on to the next step.
- `fail("message")`: call it when they get it wrong. It counts a failed attempt and shows the message.

```tsx
export default defineStep({
  sense: "Smell",
  title: "Sniff the right one",
  instructions: "Pick the tile that smells like lavender.",
  Component: MyStep,
});

function MyStep({ pass, fail }: StepProps) {
  return <button onClick={pass}>I smelled it</button>;
}
```

Steps only render in the browser, so `window`, `Math.random()` and audio are safe to use directly.

### Add a new step

1. Copy `src/steps/_template.tsx` to `src/steps/06-your-sense.tsx` and build your step in it.
2. Add it to the list in `src/steps/index.ts` (one import line and one entry). This is the only shared file. If two people add a step at the same time, Git may ask you to keep both lines.

When the last step passes, the final screen (`src/captcha/FinalScreen.tsx`) shows the time taken and the number of failed attempts.

## 📁 Project structure

```
src/
├── app/
│   ├── layout.tsx         # Page shell, fonts, metadata
│   ├── page.tsx           # Renders the captcha flow
│   └── globals.css        # Tailwind + global styles
├── captcha/
│   ├── CaptchaFlow.tsx    # Runs the steps, progress bar, ?step=N
│   ├── FinalScreen.tsx    # Shown after the last step
│   └── types.ts           # defineStep, StepProps
└── steps/
    ├── index.ts           # Ordered list of steps
    ├── _template.tsx      # Copy this to start a new step
    └── 01-see.tsx …       # One file per step
```

## 🛠️ Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Run the production build |
| `npm run lint` | Lint the code |

---

<div align="center">
<sub>Made with questionable UX decisions 🙃</sub>
</div>
