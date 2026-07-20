# Launched by torchrun in a SEPARATE process: notebook_launcher cannot fork
# once CUDA is initialised in the parent, so we never touch CUDA in the notebook.
import os, glob, json as _json, time, torch
from collections import Counter

os.environ['PYTORCH_ALLOC_CONF'] = 'expandable_segments:True'
# HF token resolution (never hardcode; never commit):
# 1) env already set
# 2) Kaggle Secrets label HF_TOKEN (UI attach; wiped by kernels push)
# 3) private dataset file /kaggle/input/**/hf_token
def _load_hf_token():
    env = os.environ.get('HF_TOKEN') or os.environ.get('HUGGING_FACE_HUB_TOKEN')
    if env and len(env) > 10:
        return env.strip()
    try:
        from kaggle_secrets import UserSecretsClient
        t = UserSecretsClient().get_secret('HF_TOKEN')
        if t and len(t) > 10:
            return t.strip()
    except Exception:
        pass
    for p in sorted(glob.glob('/kaggle/input/**/hf_token', recursive=True)):
        if os.path.isfile(p) and os.path.getsize(p) > 10:
            with open(p, 'r', encoding='utf-8') as f:
                t = f.read().strip()
            if t and len(t) > 10:
                return t
    raise RuntimeError('HF_TOKEN missing (env / Kaggle secret / private hf_token file)')

os.environ['HF_TOKEN'] = _load_hf_token()

BASE     = 'google/gemma-4-E2B-it'
FALLBACK = 'google/gemma-3n-E2B-it'
OUT_REPO = 'telivity/CareerOps-4B'

LOCAL_RANK = int(os.environ.get('LOCAL_RANK', 0))
IS_MAIN    = LOCAL_RANK == 0
torch.cuda.set_device(LOCAL_RANK)

def log(*a):
    if IS_MAIN:
        print(*a, flush=True)

log('rank', LOCAL_RANK, 'gpu:', torch.cuda.get_device_name(LOCAL_RANK),
    '| world size:', os.environ.get('WORLD_SIZE'))

# ---- dataset ----
from datasets import load_dataset
train_path = glob.glob('/kaggle/input/**/careerops_train.jsonl', recursive=True)[0]
ds = load_dataset('json', data_files={'train': train_path})
log(ds)

SYSTEM = (
    "You are the CareerOps assistant. You run a person's job search end to end: you grade how well they fit a role, "
    "write tailored résumés and cover letters from their real experience only, parse job postings, keep their board "
    "organised, decide what they should work on today, and chase follow-ups. "
    "Never invent employers, titles, dates, metrics or skills. Be concise, specific and practical."
)

def to_chat(ex):
    return {'messages': [{'role': 'system', 'content': SYSTEM}] + ex['messages']}

ds = ds.map(to_chat, remove_columns=[c for c in ds['train'].column_names if c != 'messages'])

# ---- 4-bit base model, one GPU per process ----
from transformers import AutoTokenizer, AutoModelForCausalLM, AutoConfig, BitsAndBytesConfig

# Proven clean numerics: float32 compute + fp16=False (fp16 compute/AMP was a failure mode).
bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type='nf4',
                         bnb_4bit_compute_dtype=torch.float32, bnb_4bit_use_double_quant=True)

def load(model_id):
    tok = AutoTokenizer.from_pretrained(model_id, token=os.environ['HF_TOKEN'])
    # Gemma 4 declares bfloat16 at top level AND in text/vision/audio sub-configs;
    # dtype= on from_pretrained does not override the sub-configs. Force all of them.
    cfg = AutoConfig.from_pretrained(model_id, token=os.environ['HF_TOKEN'])
    for holder in (cfg, getattr(cfg, 'text_config', None),
                   getattr(cfg, 'vision_config', None), getattr(cfg, 'audio_config', None)):
        if holder is not None and hasattr(holder, 'dtype'):
            holder.dtype = 'float16'
        if holder is not None and hasattr(holder, 'torch_dtype'):
            holder.torch_dtype = 'float16'
    mdl = AutoModelForCausalLM.from_pretrained(
        model_id, config=cfg, quantization_config=bnb,
        device_map={'': LOCAL_RANK},     # DDP: this process owns exactly one GPU
        dtype=torch.float16, token=os.environ['HF_TOKEN'])
    return tok, mdl

try:
    MODEL_ID = BASE
    tokenizer, model = load(MODEL_ID)
except Exception as e:
    log(f'{BASE} unavailable ({str(e)[:120]}) — using {FALLBACK}')
    MODEL_ID = FALLBACK
    tokenizer, model = load(MODEL_ID)

if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token
log('loaded', MODEL_ID)

# ---- dtype audit: no bf16 may survive (fp16 GradScaler cannot unscale bf16 grads) ----
log('param dtypes BEFORE cast:', dict(Counter(str(p.dtype) for p in model.parameters())))
for _n, p in model.named_parameters():
    if p.dtype == torch.bfloat16:
        p.data = p.data.to(torch.float16)
for _n, b in model.named_buffers():
    if b.dtype == torch.bfloat16:
        b.data = b.data.to(torch.float16)
log('param dtypes AFTER cast:', dict(Counter(str(p.dtype) for p in model.parameters())))
assert not any(p.dtype == torch.bfloat16 for p in model.parameters())
assert not any(b.dtype == torch.bfloat16 for b in model.buffers())

# ---- QLoRA ----
from peft import LoraConfig, get_peft_model
from trl import SFTConfig, SFTTrainer

# prepare_model_for_kbit_training() is intentionally NOT used: it upcasts every
# non-quantized parameter to fp32 and Gemma 4's embeddings alone need 10.5 GB.
model.config.use_cache = False
model.enable_input_require_grads()

# Gemma 4 wraps projections in Gemma4ClippableLinear, which PEFT cannot patch.
# Target the INNER Linear modules by full name, text tower only.
PROJ = ('q_proj', 'k_proj', 'v_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj')
SKIP = ('vision', 'audio', 'image', 'vision_tower', 'audio_tower', 'multi_modal', 'embed_')
targets = []
for name, mod in model.named_modules():
    if any(s in name.lower() for s in SKIP):
        continue
    if mod.__class__.__name__ not in ('Linear', 'Linear4bit', 'Linear8bitLt'):
        continue
    parts = name.split('.')
    if parts[-1] in PROJ or (parts[-1] == 'linear' and len(parts) > 1 and parts[-2] in PROJ):
        targets.append(name)
log(f'LoRA target modules found: {len(targets)}')
assert targets, 'no LoRA targets found'

model = get_peft_model(model, LoraConfig(
    r=16, lora_alpha=32, lora_dropout=0.05, bias='none',
    task_type='CAUSAL_LM', target_modules=targets))

# LoRA params must be fp32: Gemma 4 keeps them bf16 and the fp16 scaler cannot unscale bf16.
for _n, p in model.named_parameters():
    if p.requires_grad:
        p.data = p.data.float()
if IS_MAIN:
    model.print_trainable_parameters()


# No bf16→fp32 grad hooks: with fp16=False there is no GradScaler, and modern PyTorch
# rejects hooks that change grad dtype ("was CUDABFloat16Type got FloatTensor").
# Proven clean path is bnb float32 compute + fp16=False + LoRA weights in fp32.


cfg = SFTConfig(
    output_dir='/kaggle/working/careerops-4b',
    num_train_epochs=1,
    # 2 GPUs x batch 2 x accum 2 = effective batch 8, identical to the single-GPU run
    per_device_train_batch_size=2,
    gradient_accumulation_steps=2,
    learning_rate=1e-4,  # halved: 2e-4 detonated on the first update
    lr_scheduler_type='cosine',
    warmup_steps=30,
    logging_steps=1,      # heartbeat: one line per optimizer step
    eval_strategy='no',
    save_strategy='no',
    fp16=False,          # locked clean path with bnb float32 compute (AMP/fp16 was a failure mode)
    bf16=False,
    max_grad_norm=0.3,
    max_length=768,  # E2B + T4×2: keep short. match_grading MUST be regenerated ≤~700 tok (see docs/MATCH_GRADING_REGEN.md). Do NOT raise to 2048 to paper over long JDs.
    gradient_checkpointing=True,
    gradient_checkpointing_kwargs={'use_reentrant': False},   # required for DDP
    optim='adamw_torch_fused',
    packing=False,       # T4 is sm_75; FA2 needs sm_80+, so packing would leak across examples
    ddp_find_unused_parameters=False,
    dataloader_num_workers=2,
    dataloader_pin_memory=True,
    report_to='none',
)

# ---- milestone pushes to Hugging Face (rank 0 only) ----
from transformers import TrainerCallback
from huggingface_hub import HfApi, create_repo

if IS_MAIN:
    create_repo(OUT_REPO, private=True, exist_ok=True, token=os.environ['HF_TOKEN'])
_api = HfApi()
_t0 = time.time()

# Progress push milestones (~298-step run).
MILESTONES = {5, 50, 100, 150, 200, 250, 298}

class PushProgress(TrainerCallback):
    def __init__(self):
        self.t0 = time.time()

    def on_step_end(self, args, state, control, **kw):
        if not state.is_local_process_zero:
            return
        step = state.global_step
        elapsed = time.time() - self.t0
        hist = [h for h in state.log_history if 'loss' in h]
        loss = hist[-1]['loss'] if hist else None
        # printed EVERY step so the Kaggle log is a live heartbeat
        print(f'[step] {step}/{state.max_steps} loss={loss} '
              f'{elapsed / max(step, 1):.1f}s/step elapsed={round(elapsed)}s', flush=True)
        # HF pushes stay on milestones only: uploading every step is slow and floods the repo
        if step in MILESTONES or step == state.max_steps:
            self._push(state)

    def _push(self, state):
        step = state.global_step
        elapsed = time.time() - self.t0
        hist = [h for h in state.log_history if 'loss' in h]
        loss = hist[-1]['loss'] if hist else None
        trainer.model.save_pretrained('/kaggle/working/adapter')
        tokenizer.save_pretrained('/kaggle/working/adapter')
        with open('/kaggle/working/adapter/progress.json', 'w') as f:
            _json.dump({'step': step, 'total_steps': state.max_steps,
                        'pct': round(100 * step / max(state.max_steps, 1), 1),
                        'loss': loss, 'elapsed_sec': round(elapsed),
                        'sec_per_step': round(elapsed / max(step, 1), 2),
                        'gpus': int(os.environ.get('WORLD_SIZE', 1))}, f, indent=1)
        try:
            _api.upload_folder(
                folder_path='/kaggle/working/adapter', repo_id=OUT_REPO,
                token=os.environ['HF_TOKEN'],
                commit_message=f'step {step}/{state.max_steps} loss={loss} '
                               f'{round(elapsed)}s ({round(elapsed / max(step, 1), 2)}s/step) '
                               f'{os.environ.get("WORLD_SIZE", 1)}gpu')
            print(f'[push] step {step}/{state.max_steps} loss={loss} '
                  f'{round(elapsed)}s ({round(elapsed / max(step, 1), 2)}s/step)', flush=True)
        except Exception as e:
            print('[push failed]', str(e)[:200], flush=True)

trainer = SFTTrainer(model=model, args=cfg, train_dataset=ds['train'],
                     processing_class=tokenizer)
trainer.add_callback(PushProgress())
log('total optimizer steps:', trainer.state.max_steps if trainer.state.max_steps else 'computed at train()')
trainer.train()

if IS_MAIN:
    trainer.model.save_pretrained('/kaggle/working/adapter')
    tokenizer.save_pretrained('/kaggle/working/adapter')
    HfApi().upload_folder(folder_path='/kaggle/working/adapter', repo_id=OUT_REPO,
                          token=os.environ['HF_TOKEN'],
                          commit_message=f'FINAL CareerOps-4B QLoRA adapter on {MODEL_ID}')
    print('pushed ->', OUT_REPO, flush=True)
