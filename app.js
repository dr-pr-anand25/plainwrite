// Loads a small open language model in the browser with Transformers.js and exposes
// window.PW_LLM to the page. Nothing is sent to any server except the one-time
// model download from Hugging Face; your text stays on your device.
const CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1";

const MODELS = [
  { id: "onnx-community/Qwen2.5-0.5B-Instruct", label: "Qwen2.5 0.5B: faster, about 0.5 GB", gpu: "q4f16", cpu: "q8", needsGPU: false },
  { id: "onnx-community/Qwen2.5-1.5B-Instruct", label: "Qwen2.5 1.5B: needs a lot of memory, may fail to load", gpu: "q4f16", cpu: "q4", needsGPU: true }
];

let tf = null;
try {
  tf = await import(CDN);
} catch (e) {
  console.error("Could not load Transformers.js", e);
  window.dispatchEvent(new Event("pw-llm-fail"));
}

if (tf) {
  const { pipeline, env } = tf;
  env.allowLocalModels = false;
  const hasGPU = !!navigator.gpu;
  let gen = null;
  let current = null;

  window.PW_LLM = {
    models: MODELS,
    hasGPU,
    isLoaded: () => !!gen,
    currentId: () => (current ? current.id : null),
    async unload() {
      if (gen && gen.dispose) { try { await gen.dispose(); } catch (_) {} }
      gen = null; current = null;
    },
    async load(id, onProgress) {
      const m = MODELS.find((x) => x.id === id) || MODELS[0];
      await this.unload();
      const files = {};
      const cb = (e) => {
        if (e && e.status === "progress" && e.total) {
          files[e.file] = { l: e.loaded, t: e.total };
          let l = 0, t = 0;
          for (const k in files) { l += files[k].l; t += files[k].t; }
          onProgress(t ? l / t : 0, "Downloading model: " + Math.round(l / 1048576) + " of " + Math.round(t / 1048576) + " MB");
        }
      };
      const devices = hasGPU ? ["webgpu", "wasm"] : ["wasm"];
      let lastErr = null;
      for (const dev of devices) {
        try {
          if (dev === "wasm") env.backends.onnx.wasm.proxy = true;
          onProgress(0, "Preparing model on " + (dev === "webgpu" ? "GPU" : "CPU") + "...");
          gen = await pipeline("text-generation", m.id, {
            device: dev,
            dtype: dev === "webgpu" ? m.gpu : m.cpu,
            progress_callback: cb
          });
          current = { id: m.id, device: dev === "webgpu" ? "GPU" : "CPU" };
          return current;
        } catch (e) {
          console.warn("Model load failed on " + dev, e);
          lastErr = e; gen = null;
        }
      }
      throw lastErr || new Error("Model failed to load");
    },
    async generate(messages, opts) {
      if (!gen) throw new Error("Model not loaded");
      const out = await gen(messages, {
        max_new_tokens: (opts && opts.max_new_tokens) || 256,
        do_sample: true,
        temperature: (opts && opts.temperature) || 0.5,
        top_p: 0.85,
        repetition_penalty: 1.05,
        return_full_text: false
      });
      let t = out[0].generated_text;
      if (Array.isArray(t)) t = t[t.length - 1].content;
      return String(t || "");
    }
  };
  window.dispatchEvent(new Event("pw-llm-ready"));
}
