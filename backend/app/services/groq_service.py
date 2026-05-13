"""Groq LLaMA 3.3 service for Tunisian Arabic translation and prompt engineering."""
import json
import logging
import os
import time
from groq import Groq

logger = logging.getLogger(__name__)

# Initialize Groq client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"

# System prompt for translation (exact from notebook)
SYSTEM_PROMPT_INTERMEDIATE = """You are an expert translator specializing in Tunisian Arabic dialect (Darija Tunisienne).

Tunisian dialect characteristics:
- Mixes Arabic, French, Berber, and Italian words
- Uses French loanwords frequently
- Different grammar from Modern Standard Arabic

Translate in TWO steps:
1. First translate to French (intermediate — linguistically closer to Tunisian)
2. Then translate the French to English

Return your answer in this EXACT JSON format:
{"french": "<french translation>", "english": "<english translation>"}

Return ONLY the JSON, no other text, no preamble."""


def translate_to_english(arabic_text: str, profile_ctx: str = "") -> dict:
    """
    Translate Tunisian Arabic to English via Groq LLaMA 3.3-70b.
    Two-step approach: TN → FR (intermediate) → EN (final).
    Injects child profile context for vocabulary adaptation.
    
    Args:
        arabic_text: Tunisian Arabic text to translate
        profile_ctx: Child profile context for personalization
        
    Returns:
        dict with keys: "english", "french", "raw", "latency"
    """
    profile_section = f"\n{profile_ctx}\n" if profile_ctx else ""
    
    system = (
        SYSTEM_PROMPT_INTERMEDIATE
        + profile_section
        + "\nAdditional rules for this educational app:\n"
        "- Respect the child's cognitive level from the profile above\n"
        "- Use concrete, visual vocabulary suited for image generation\n"
        "- Incorporate the child's interests when natural\n"
        "- NEVER include words from the blacklist\n"
        "- Keep the English translation short (max 10 words) and visual"
    )
    arabic_text = arabic_text.encode('utf-8').decode('utf-8')
    profile_ctx = profile_ctx.encode('utf-8').decode('utf-8') if profile_ctx else ""
    t0 = time.time()
    try:
        resp = groq_client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"Tunisian Arabic: {arabic_text}"}
            ],
            temperature=0.1,
            max_tokens=200,
        )
        raw = resp.choices[0].message.content.strip()
        french, english = _parse_translation(raw)
        
        logger.info("Translation done, latency=%.2fs", time.time() - t0)
        
        return {
            "english": english,
            "french": french,
            "raw": raw,
            "latency": round(time.time() - t0, 2),
        }
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        raise


def _parse_translation(raw_output: str) -> tuple:
    """
    Parse JSON translation output TN→FR→EN with robust fallback.
    
    Args:
        raw_output: Raw output from Groq API
        
    Returns:
        tuple of (french, english)
    """
    try:
        clean = raw_output.strip().strip("```json").strip("```").strip()
        data = json.loads(clean)
        return data.get("french", ""), data.get("english", "")
    except json.JSONDecodeError:
        # Fallback parsing for malformed JSON
        lines = raw_output.split("\n")
        french, english = "", ""
        for line in lines:
            ll = line.lower()
            if "french" in ll:
                french = line.split(":", 1)[-1].strip().strip('"')
            if "english" in ll:
                english = line.split(":", 1)[-1].strip().strip('"')
        return french, english or raw_output


def build_image_prompt(
    english_description: str,
    profile_ctx: str = "",
    style_suffix: str = "",
    blacklist_neg: str = ""
) -> dict:
    """
    Transform English description to optimized SDXL prompt.
    Uses Groq LLaMA 3.3 to enrich prompt according to child profile.
    
    Args:
        english_description: English text describing the image
        profile_ctx: Child profile context
        style_suffix: Style tokens to include (e.g., "cartoon style, ...")
        blacklist_neg: Negative prompt additions from blacklist
        
    Returns:
        dict with keys: "prompt", "negative_prompt", "latency"
    """
    system = (
        "You are an expert at creating image generation prompts for educational children's apps.\n"
        + (f"\n{profile_ctx}\n" if profile_ctx else "")
        + f"Required style tokens to include: {style_suffix}\n"
        "Rules:\n"
        "- Always embed the style tokens above\n"
        "- Match the child's preferred colors in the scene\n"
        "- Relate to child's interests when possible\n"
        "- NEVER include blacklisted elements\n"
        "- Keep scene simple, joyful, child-safe\n"
        "- Return ONLY JSON with keys: 'prompt' and 'negative_prompt', no other text"
    )
    english_description = english_description.encode('utf-8').decode('utf-8')
    profile_ctx = profile_ctx.encode('utf-8').decode('utf-8') if profile_ctx else ""
    style_suffix = style_suffix.encode('utf-8').decode('utf-8') if style_suffix else ""
    t0 = time.time()
    try:
        resp = groq_client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"Description: {english_description}"}
            ],
            temperature=0.2,
            max_tokens=350,
        )
        raw = resp.choices[0].message.content.strip()
        
        try:
            clean = raw.strip("```json").strip("```").strip()
            data = json.loads(clean)
            prompt = data.get("prompt", english_description)
            neg = data.get("negative_prompt", "realistic, dark, scary, nsfw, blurry")
        except Exception:
            # Fallback prompt
            prompt = f"{style_suffix}, {english_description}, simple shapes, bold outlines, white background"
            neg = "realistic, photo, 3d, dark, scary, violent, nsfw, blurry, watermark"
        
        if blacklist_neg:
            neg = f"{neg}, {blacklist_neg}"
        
        logger.info(f"Translation done, latency={round(time.time() - t0, 2)}s")


        
        return {
            "prompt": prompt,
            "negative_prompt": neg,
            "latency": round(time.time() - t0, 2)
        }
    except Exception as e:
        logger.error(f"Prompt generation error: {str(e)}")
        raise
