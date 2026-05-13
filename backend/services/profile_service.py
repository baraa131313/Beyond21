"""Service for managing child profiles (JSON-based storage)."""
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from app.models.profile import UserProfile   # ← CORRECT

logger = logging.getLogger(__name__)

# Profile database directory
PROFILES_DIR = Path("db/profiles")


class ProfileService:
    """Manages child profiles with JSON storage."""
    
    def __init__(self):
        """Initialize profile directory."""
        PROFILES_DIR.mkdir(parents=True, exist_ok=True)
    
    def get_profile(self, child_id: str) -> UserProfile:
        """
        Load profile from JSON file.
        
        Args:
            child_id: Child identifier
            
        Returns:
            UserProfile instance
        """
        profile_path = PROFILES_DIR / f"{child_id}.json"
        
        if profile_path.exists():
            try:
                with open(profile_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                logger.info(f"Profile loaded: {child_id}")
                return UserProfile(**data)
            except Exception as e:
                logger.error(f"Error loading profile {child_id}: {str(e)}")
                return self._default_profile(child_id)
        else:
            logger.info(f"Profile not found: {child_id}, creating default")
            return self._default_profile(child_id)
    
    def save_profile(self, profile: UserProfile) -> bool:
        """
        Save profile to JSON file.
        
        Args:
            profile: UserProfile instance
            
        Returns:
            True if successful
        """
        try:
            profile_path = PROFILES_DIR / f"{profile.child_id}.json"
            profile.updated_at = datetime.now().isoformat()
            
            with open(profile_path, "w", encoding="utf-8") as f:
                json.dump(profile.model_dump(), f, ensure_ascii=False, indent=2)
            
            logger.info(f"Profile saved: {profile.child_id}")
            return True
        except Exception as e:
            logger.error(f"Error saving profile: {str(e)}")
            return False
    
    def _default_profile(self, child_id: str) -> UserProfile:
        """Create default profile for new child."""
        profile = UserProfile(
            child_id=child_id,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
        )
        self.save_profile(profile)
        return profile
    
    def build_system_prompt_context(self, profile: UserProfile) -> str:
        """
        Build system prompt context from profile.
        
        Args:
            profile: UserProfile instance
            
        Returns:
            Formatted string for injection into Groq system prompt
        """
        blacklist_str = ", ".join(profile.blacklist) if profile.blacklist else "none"
        keywords_str = ", ".join(profile.positive_keywords) if profile.positive_keywords else "none"
        colors_str = ", ".join(profile.preferred_colors)
        interests_str = ", ".join(profile.interests)
        
        return (
            "CHILD PROFILE:\n"
            f"- Name: {profile.name}, Age: {profile.age}\n"
            f"- Cognitive level: {profile.cognitive_level}\n"
            f"- Interests: {interests_str}\n"
            f"- Preferred colors: {colors_str}\n"
            f"- Style: {profile.style_preference}\n"
            f"- Blacklist (NEVER use): {blacklist_str}\n"
            f"- Boosted keywords: {keywords_str}"
        )
    
    def get_sdxl_style_suffix(self, profile: UserProfile) -> str:
        """
        Get SDXL style suffix based on profile preferences.
        
        Args:
            profile: UserProfile instance
            
        Returns:
            Style suffix string for image prompt
        """
        style_map = {
            "cartoon": "cartoon style, flat design, bold outlines, vibrant colors, child-friendly",
            "watercolor": "watercolor illustration, soft edges, pastel colors, artistic",
            "realistic": "photorealistic, detailed, natural lighting, clear",
        }
        
        style_base = style_map.get(profile.style_preference, style_map["cartoon"])
        colors_str = ", ".join(profile.preferred_colors)
        
        return f"{style_base}, colors: {colors_str}"
    
    def get_negative_prompt_additions(self, profile: UserProfile) -> str:
        """
        Get negative prompt additions from blacklist.
        
        Args:
            profile: UserProfile instance
            
        Returns:
            Formatted negative prompt additions
        """
        if not profile.blacklist:
            return ""
        return ", ".join(profile.blacklist)
    
    def save_interaction(self, child_id: str, interaction_record: dict) -> bool:
        """
        Save interaction history for learning and feedback.
        
        Args:
            child_id: Child identifier
            interaction_record: Dict with transcription, translation, prompt, feedback
            
        Returns:
            True if successful
        """
        try:
            interactions_dir = PROFILES_DIR / f"{child_id}_interactions"
            interactions_dir.mkdir(parents=True, exist_ok=True)
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            interaction_path = interactions_dir / f"{timestamp}.json"
            
            record_with_ts = {
                **interaction_record,
                "timestamp": datetime.now().isoformat()
            }
            
            with open(interaction_path, "w", encoding="utf-8") as f:
                json.dump(record_with_ts, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Interaction saved for {child_id}")
            return True
        except Exception as e:
            logger.error(f"Error saving interaction: {str(e)}")
            return False  
    def update_profile_from_feedback(self, child_id: str, translation: str,
                                     quality_score: int, clarity_score: int, 
                                     style_score: int) -> bool:
        """
        Met a jour le profil selon les 3 scores de feedback visuel.
        quality_score : 1=non / 2=moyen / 3=oui
        clarity_score : 1=incomprehensible / 2=complexe / 3=claire
        style_score   : 1=pas adapte / 2=bien / 3=parfait
        """
        try:
            profile = self.get_profile(child_id)

            # ── Qualite generale ──────────────────────────────────────
            if quality_score == 3:
                kw = translation.strip().split()[0].lower() if translation.strip() else ""
                if kw and kw not in profile.positive_keywords:
                    profile.positive_keywords.append(kw)
                    logger.info(f"✅ Keyword booste : '{kw}'")
            elif quality_score == 1:
                logger.info(f"👎 Qualite negative pour {child_id}")

            # ── Clarte / comprehension ────────────────────────────────
            if clarity_score == 1:
                profile.style_preference = "cartoon"
                logger.info(f"🔄 Style simplifie → cartoon pour {child_id}")
            elif clarity_score == 3:
                logger.info(f"✅ Image claire pour {child_id}")

            # ── Style visuel / couleurs ───────────────────────────────
            if style_score == 3:
                logger.info(f"❤️ Style visuel valide pour {child_id}")
            elif style_score == 1:
                logger.info(f"😕 Style pas adapte pour {child_id}")

            return self.save_profile(profile)

        except Exception as e:
            logger.error(f"Error updating profile from feedback: {str(e)}")
            return False


# Initialize service
profile_service = ProfileService()
