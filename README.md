# Plainwrite

A free AI text humanizer that runs entirely in the browser. Created by P. Rameswara Anand, Research Scholar, Anurag University, Hyderabad 500088.

## How it works
- The page loads [Transformers.js](https://github.com/huggingface/transformers.js) from a CDN and downloads a small open model (Qwen2.5, ONNX build) from Hugging Face the first time someone presses "Humanize it". The browser caches it afterwards.
- Text is split into passages of up to 80 words. Each passage is rewritten by the model on the user's own device (WebGPU if available, otherwise CPU/WASM).
- Safety checks reject any rewrite that drops a number, an acronym, a camelCase name or a "Keep as written" term, or that is far too long or short. Those passages fall back to the built-in rules engine.
- "Fast rules" mode skips the model and uses the rules engine only.
- No text is sent to any server.

## Deploy on GitHub Pages
1. Create a new public repository, for example `plainwrite`.
2. Upload `index.html`, `app.js` and `README.md` to the repository root (Add file, then Upload files).
3. Open Settings, then Pages. Under "Build and deployment" choose "Deploy from a branch", branch `main`, folder `/ (root)`, and save.
4. After a minute the site is live at `https://<your-username>.github.io/plainwrite/`. Share that link.

## Test locally
Run `python3 -m http.server 8000` in this folder and open http://localhost:8000.

## Changing the model
Edit the `MODELS` list at the top of `app.js`. Any `onnx-community` text-generation model that has `q4f16` (GPU) and `q8` or `q4` (CPU) files will work. The Transformers.js version is pinned in the `CDN` line.

## Limits to know
- First use downloads about 0.5 GB (the 0.5B model) or about 1 GB (the 1.5B model).
- Small models are weaker than hosted ones. Always read the result against the original before using it, especially for papers.
- The 1.5B model needs a browser with WebGPU (recent Chrome or Edge).
