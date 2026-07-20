"""CareerOps-4B quality gate.

Two checks, one model load:
  1. Val loss on the 164 held-out rows — BASE vs FINE-TUNED. Answers "did it learn
     anything that generalises" and "did it memorise" in one number.
  2. Side-by-side generations on 20 held-out examples — BASE vs FINE-TUNED vs the
     reference answer. Answers "is the output actually good", which loss cannot.

Both use the SAME loaded model: PEFT's disable_adapter() gives exact base behaviour
without a second 10.2 GB load, so the comparison is apples-to-apples.
"""
import os, glob, json, math, time, torch

os.environ['PYTORCH_ALLOC_CONF'] = 'expandable_segments:True'
# Token comes from Kaggle Secrets (Add-ons -> Secrets -> HF_TOKEN).
# Never hardcode it: notebook JSON is easy to leak and the string cannot be un-shared.
from kaggle_secrets import UserSecretsClient
os.environ['HF_TOKEN'] = UserSecretsClient().get_secret('HF_TOKEN')

BASE     = 'google/gemma-4-E2B-it'
ADAPTER  = 'telivity/careerops-4b'
OUT_REPO = 'telivity/careerops-4b'
N_SIDE   = 20          # side-by-side examples
MAX_NEW  = 512

SYSTEM = (
    "You are the CareerOps assistant. You run a person's job search end to end: you grade how well they fit a role, "
    "write tailored résumés and cover letters from their real experience only, parse job postings, keep their board "
    "organised, decide what they should work on today, chase follow-ups, and explain how CareerOps works. "
    "Never invent employers, titles, dates, metrics or skills. Be concise, specific and practical."
)

# ---- data ----
val_path = glob.glob('/kaggle/input/**/careerops_val.jsonl', recursive=True)[0]
rows = [json.loads(l) for l in open(val_path)]
print(f'val rows: {len(rows)}', flush=True)
from collections import Counter
print('tasks:', dict(Counter(r.get('task', '?') for r in rows)), flush=True)

# ---- model: base in 4-bit, adapter on top ----
from transformers import AutoTokenizer, AutoModelForCausalLM, AutoConfig, BitsAndBytesConfig
from peft import PeftModel

bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type='nf4',
                         bnb_4bit_compute_dtype=torch.float16, bnb_4bit_use_double_quant=True)

cfg = AutoConfig.from_pretrained(BASE, token=os.environ['HF_TOKEN'])
for holder in (cfg, getattr(cfg, 'text_config', None),
               getattr(cfg, 'vision_config', None), getattr(cfg, 'audio_config', None)):
    if holder is not None and hasattr(holder, 'dtype'):
        holder.dtype = 'float16'
    if holder is not None and hasattr(holder, 'torch_dtype'):
        holder.torch_dtype = 'float16'

tok = AutoTokenizer.from_pretrained(BASE, token=os.environ['HF_TOKEN'])
if tok.pad_token is None:
    tok.pad_token = tok.eos_token

model = AutoModelForCausalLM.from_pretrained(BASE, config=cfg, quantization_config=bnb,
                                             device_map={'': 0}, dtype=torch.float16,
                                             token=os.environ['HF_TOKEN'])
for _n, p in model.named_parameters():
    if p.dtype == torch.bfloat16:
        p.data = p.data.to(torch.float16)
for _n, b in model.named_buffers():
    if b.dtype == torch.bfloat16:
        b.data = b.data.to(torch.float16)

model = PeftModel.from_pretrained(model, ADAPTER, token=os.environ['HF_TOKEN'])
model.eval()
print('loaded base + adapter', flush=True)


# ---- 1. val loss, base vs tuned ----
def build(ex):
    """Tokenise one example; mask everything except the assistant turn (same as training)."""
    msgs = [{'role': 'system', 'content': SYSTEM}] + ex['messages']
    full = tok.apply_chat_template(msgs, tokenize=False)
    prompt = tok.apply_chat_template(msgs[:-1], tokenize=False, add_generation_prompt=True)
    f = tok(full, return_tensors='pt', truncation=True, max_length=768)
    n_prompt = len(tok(prompt, truncation=True, max_length=768)['input_ids'])
    labels = f['input_ids'].clone()
    labels[0, :n_prompt] = -100          # loss only on the answer
    return f['input_ids'], f['attention_mask'], labels


@torch.no_grad()
def val_loss(tag):
    tot_loss, tot_tok = 0.0, 0
    for i, ex in enumerate(rows):
        ids, mask, labels = build(ex)
        n = int((labels != -100).sum())
        if n == 0:
            continue
        out = model(input_ids=ids.cuda(), attention_mask=mask.cuda(), labels=labels.cuda())
        tot_loss += float(out.loss) * n
        tot_tok += n
        if (i + 1) % 40 == 0:
            print(f'  {tag} {i+1}/{len(rows)}', flush=True)
    mean = tot_loss / max(tot_tok, 1)
    return mean, tot_tok


t0 = time.time()
tuned_loss, ntok = val_loss('tuned')
print(f'TUNED val loss: {tuned_loss:.4f}  (ppl {math.exp(min(tuned_loss,20)):.1f}) on {ntok} answer tokens', flush=True)

with model.disable_adapter():
    base_loss, _ = val_loss('base')
print(f'BASE  val loss: {base_loss:.4f}  (ppl {math.exp(min(base_loss,20)):.1f})', flush=True)
print(f'val loss took {round(time.time()-t0)}s', flush=True)


# ---- 2. side-by-side generations ----
# stratify: take examples spread across tasks, not the first 20 (which would be one task)
by_task = {}
for r in rows:
    by_task.setdefault(r.get('task', '?'), []).append(r)
picks, ti = [], 0
task_names = sorted(by_task)
while len(picks) < N_SIDE and any(by_task.values()):
    t = task_names[ti % len(task_names)]
    if by_task[t]:
        picks.append(by_task[t].pop(0))
    ti += 1
print(f'side-by-side on {len(picks)} examples across {len(task_names)} tasks', flush=True)


@torch.no_grad()
def gen(ex):
    msgs = [{'role': 'system', 'content': SYSTEM}] + ex['messages'][:-1]
    # apply_chat_template returns a BatchEncoding (dict-like), not a tensor —
    # it has no .cuda(); move each tensor instead.
    enc = tok.apply_chat_template(msgs, add_generation_prompt=True,
                                  return_tensors='pt', return_dict=True)
    enc = {k: v.cuda() for k, v in enc.items()}
    n_in = enc['input_ids'].shape[-1]
    out = model.generate(**enc, max_new_tokens=MAX_NEW, do_sample=False,
                         pad_token_id=tok.pad_token_id)
    return tok.decode(out[0][n_in:], skip_special_tokens=True).strip()


md = ['# CareerOps-4B — quality gate', '',
      f'Base: `{BASE}` · Adapter: `{ADAPTER}`', '',
      '## 1. Held-out loss (164 rows, answer tokens only)', '',
      '| model | val loss | perplexity |', '|---|---|---|',
      f'| base Gemma 4 E2B | {base_loss:.4f} | {math.exp(min(base_loss,20)):.1f} |',
      f'| **CareerOps-4B** | **{tuned_loss:.4f}** | **{math.exp(min(tuned_loss,20)):.1f}** |',
      '',
      f'Change: {((base_loss-tuned_loss)/base_loss*100):+.1f}% loss vs base.',
      '',
      'Train loss over the run was 1.205. Val close to that = generalisation; val far above = memorisation.',
      '', '## 2. Side-by-side generations', '']

for i, ex in enumerate(picks):
    task = ex.get('task', '?')
    prompt = ex['messages'][-2]['content'] if len(ex['messages']) >= 2 else ex['messages'][0]['content']
    ref = ex['messages'][-1]['content']
    t1 = time.time()
    tuned_out = gen(ex)
    with model.disable_adapter():
        base_out = gen(ex)
    print(f'[{i+1}/{len(picks)}] {task} ({round(time.time()-t1)}s)', flush=True)
    md += [f'### {i+1}. `{task}`', '',
           '<details><summary>prompt</summary>', '', '```', prompt[:1500], '```', '', '</details>', '',
           '**CareerOps-4B:**', '', '```', tuned_out[:2500], '```', '',
           '**Base Gemma 4 E2B:**', '', '```', base_out[:2500], '```', '',
           '**Reference (what the training data says):**', '', '```', ref[:2500], '```', '', '---', '']

report = '\n'.join(md)
open('/kaggle/working/eval_report.md', 'w').write(report)
json.dump({'base_val_loss': base_loss, 'tuned_val_loss': tuned_loss,
           'train_loss': 1.205, 'answer_tokens': ntok, 'n_side_by_side': len(picks)},
          open('/kaggle/working/eval_summary.json', 'w'), indent=1)
print('\n' + '=' * 60)
print(f'BASE  {base_loss:.4f}   TUNED {tuned_loss:.4f}   ({((base_loss-tuned_loss)/base_loss*100):+.1f}%)')
print('=' * 60, flush=True)

from huggingface_hub import HfApi
HfApi().upload_file(path_or_fileobj='/kaggle/working/eval_report.md',
                    path_in_repo='eval_report.md', repo_id=OUT_REPO,
                    token=os.environ['HF_TOKEN'], commit_message='quality gate: val loss + 20 side-by-sides')
HfApi().upload_file(path_or_fileobj='/kaggle/working/eval_summary.json',
                    path_in_repo='eval_summary.json', repo_id=OUT_REPO,
                    token=os.environ['HF_TOKEN'], commit_message='quality gate summary')
print('pushed eval_report.md ->', OUT_REPO, flush=True)
