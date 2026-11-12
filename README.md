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

## 📁 Project structure

```
src/
└── app/
    ├── layout.tsx    # Page shell, fonts, metadata
    ├── page.tsx      # The home page, start here
    └── globals.css   # Tailwind + global styles
public/               # Images and static files
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
