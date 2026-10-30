# Plainwrite

A free AI text humanizer. Created by P. Rameswara Anand, Research Scholar, Anurag University, Hyderabad 500088.

The page has three engines. **Fast rules** is the default.

| Engine | Where text goes | Quality | Setup |
|---|---|---|---|
| Fast rules (default) | Stays in the browser | Modest, never changes meaning. Swaps stock phrases and wordy verbs, reorders clauses, merges or splits sentences, removes em dashes. Numbers, acronyms and terms are never touched. | None |
| Cloud AI | Your own server, then the AI provider you pick | Best. A real language model rewrites each passage. Results are checked for dropped numbers and terms, and rejected passages fall back to Fast rules. | Option B below |
| My computer (Ollama) | Only to Ollama on your own computer | Good for a 7B model, much better than the browser model. Slow without a graphics card. Same safety checks as Cloud AI. | Option C below |
| Browser model (experimental) | Stays in the browser | Poor. A 0.5B model downloaded into the browser can change meaning. Check every sentence. | None |

## Files
- `index.html`: the whole site
- `config.js`: where you put your Cloud AI server address (empty = Cloud AI off)
- `worker.js`: the small server for Cloud AI (Cloudflare Worker)
- `app.js`: loader for the experimental local model

## Option A: Fast rules only (GitHub Pages)
1. Upload `index.html`, `config.js`, `app.js` and `README.md` to your repository root.
2. Settings, Pages, Deploy from a branch, `main`, `/ (root)`.
3. The site is at `https://dr-pr-anand25.github.io/plainwrite/`.

## Option B: add Cloud AI
You need an account with an AI provider that has an OpenAI-compatible API (for example Google AI Studio for Gemini, Groq, OpenRouter or OpenAI). Check the provider's current free-tier limits and pick a current model name from its documentation.

1. Get an API key from the provider. Note its base URL, for example:
   - Google Gemini: `https://generativelanguage.googleapis.com/v1beta/openai`
   - Groq: `https://api.groq.com/openai/v1`
   - OpenRouter: `https://openrouter.ai/api/v1`
2. Create a free Cloudflare account. Go to Workers and Pages, Create, Create Worker. Paste in the contents of `worker.js` and Deploy.
3. Open the Worker, Settings, Variables and Secrets. Add:
   - `BASE_URL`: the base URL from step 1
   - `MODEL`: a current model name from the provider
   - `ALLOWED_ORIGIN`: `https://dr-pr-anand25.github.io`
   - `API_KEY`: your key, added as a **Secret**
4. Copy the Worker address (it looks like `https://something.your-name.workers.dev`).
5. Edit `config.js` in your repository and put that address in `cloudUrl`. Commit.
6. Open the site, choose **Cloud AI**, and press Humanize it.

### Things to know about Cloud AI
- Your text is sent to your Worker and then to the AI provider. Check the provider's data policy before using unpublished work.
- `ALLOWED_ORIGIN` stops other websites from using your Worker in a browser, but it does not stop a determined person who knows the address. Do not share the Worker address, and set a spending limit with your provider.
- Each request is limited to 300 words. The page sends text in passages of up to 110 words.
- If the Worker is down or the key is wrong, the page shows the error and falls back to Fast rules.

## Option C: My computer (Ollama), free and fully private
Works only on the computer where Ollama is installed. Your text never leaves it.

1. Install Ollama for Windows from https://ollama.com and let it start.
2. Open PowerShell and download a model (one time):
   - `ollama pull qwen2.5:7b` (about 4.7 GB, best quality, needs roughly 6 GB of free memory)
   - or `ollama pull qwen2.5:3b` (about 2 GB, faster, weaker)
3. Allow the website to talk to Ollama. In PowerShell run:
   `setx OLLAMA_ORIGINS "https://dr-pr-anand25.github.io"`
   Then quit Ollama from the system tray and start it again.
4. Close heavy browser tabs before running the 7B model.
5. Open the site, choose **My computer**, type the model name (for example `qwen2.5:7b`) and press **Test connection**. It tells you what is missing. If Chrome asks to allow access to devices on your network, choose Allow.
6. Press Humanize it. Without a graphics card expect a minute or more per short passage.

## Test locally
Run `python3 -m http.server 8000` in this folder and open http://localhost:8000.
