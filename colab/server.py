import os
import sys
import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
import base64
from io import BytesIO

app = FastAPI(title="Open Generative AI - Colab/Kaggle Cloud GPU Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pipe = None
MODEL_ID = "Lykon/DreamShaper"

def load_pipeline():
    global pipe
    if pipe is not None:
        return pipe
    
    from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
    
    print(f"[*] Loading model {MODEL_ID} on GPU (CUDA)...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32

    pipe = StableDiffusionPipeline.from_pretrained(
        MODEL_ID,
        torch_dtype=dtype,
        safety_checker=None,  # 100% Uncensored / No content filters
        requires_safety_checker=False,
    )
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
    pipe.to(device)
    if device == "cuda":
        pipe.enable_attention_slicing()
    print("[*] Model loaded successfully on GPU!")
    return pipe

class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: str = "ugly, deformed, disfigured, blurry, bad anatomy, low quality"
    steps: int = 25
    guidance: float = 7.5
    width: int = 512
    height: int = 512
    seed: int = -1

@app.get("/")
def home():
    return {
        "status": "online",
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
        "model": MODEL_ID,
        "mode": "100% Uncensored Free Cloud GPU"
    }

@app.post("/api/generate")
def generate(req: GenerateRequest):
    try:
        pipeline = load_pipeline()
        device = "cuda" if torch.cuda.is_available() else "cpu"
        
        generator = None
        seed = req.seed
        if seed != -1:
            generator = torch.Generator(device=device).manual_seed(seed)
        else:
            seed = int(torch.randint(0, 2147483647, (1,)).item())
            generator = torch.Generator(device=device).manual_seed(seed)

        image = pipeline(
            prompt=req.prompt,
            negative_prompt=req.negative_prompt,
            num_inference_steps=req.steps,
            guidance_scale=req.guidance,
            width=req.width,
            height=req.height,
            generator=generator,
        ).images[0]

        buffered = BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

        return {
            "url": f"data:image/png;base64,{img_str}",
            "seed": seed,
            "model": MODEL_ID,
            "device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    load_pipeline()
    uvicorn.run(app, host="0.0.0.0", port=7860)
