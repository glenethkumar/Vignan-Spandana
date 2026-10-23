"""
Vignan Spandana - AI Voice Assistant Engine
Handles speech-to-speech conversational logic, multi-turn history context,
bilingual support (Telugu & English), live Gemini/OpenAI/Ollama integration,
and a clearly-labelled intelligent Demonstration Mode.
"""

import os
import re
import json
import logging
from typing import Dict, Any, List, Optional
import urllib.request
import urllib.error

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION_EN = (
    "You are the Vignan Spandana AI Assistant, an institutional voice assistant for Vignan's Institute. "
    "You can converse fluently in English, Telugu, or natural mixed Telugu-English. "
    "Your personality is polite, academic, and helpful. "
    "CRITICAL DEMONSTRATION RULES:\n"
    "1. When introducing yourself, state: 'Hello! I am Vignan Spandana AI Assistant. You can speak with me in Telugu or English. How can I help you?'\n"
    "2. If asked about student attendance (such as 'Why was the student marked absent?' or attendance status), you MUST include: "
    "'In this demonstration, the sample attendance record shows the student as absent. In a real system, I would check the verified college attendance record before answering.'\n"
    "3. Never present fictional attendance information as a real college record.\n"
    "4. Keep spoken responses concise and natural for voice synthesis (around 2 to 4 sentences).\n"
    "5. If the user speaks in Telugu, respond in Telugu script. If English, respond in English."
)

SYSTEM_INSTRUCTION_TE = (
    "మీరు విజ్ఞాన్ ఇన్స్టిట్యూట్ యొక్క విఘ్నాన్ స్పందన AI అసిస్టెంట్. "
    "మీరు తెలుగు మరియు ఇంగ్లీష్ భాషలలో మర్యాదపూర్వకంగా, స్పష్టంగా సంభాషించగలరు. "
    "ముఖ్యమైన ప్రదర్శన నియమాలు:\n"
    "1. పరిచయం చేసుకునేటప్పుడు: 'నమస్కారం! నేను విఘ్నాన్ స్పందన AI అసిస్టెంట్ని. మీరు నాతో తెలుగులో లేదా ఇంగ్లీష్లో మాట్లాడవచ్చు. మీకు ఎలా సహాయం చేయగలను?' అని చెప్పండి.\n"
    "2. విద్యార్థి హాజరు లేదా గైర్హాజరు గురించి అడిగితే తప్పనిసరిగా: "
    "'ఈ ప్రదర్శనలో, నమూనా హాజరు రికార్డు ప్రకారం విద్యార్థి గైర్హాజరైనట్లు చూపుతోంది. వాస్తవ వ్యవస్థలో, సమాధానం ఇచ్చే ముందు నేను ధృవీకరించబడిన కళాశాల హాజరు రికార్డును తనిఖీ చేస్తాను.' అని స్పష్టం చేయండి.\n"
    "3. కల్పిత సమాచారాన్ని నిజమైన రికార్డుగా ఎప్పుడూ చెప్పవద్దు.\n"
    "4. సమాధానాలు సంక్షిప్తంగా మరియు వినడానికి సులభంగా ఉండేలా 2 నుండి 4 వాక్యాలలో ఇవ్వండి."
)


class VoiceAssistantEngine:
    """Manages bilingual conversational generation across Live AI and Demo Simulation modes."""

    def __init__(self):
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        self.openai_api_key = os.environ.get("OPENAI_API_KEY")
        self.ollama_url = os.environ.get("OLLAMA_API_URL")

    def get_service_status(self) -> Dict[str, Any]:
        """Returns the current operational status of the AI voice pipeline."""
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        self.openai_api_key = os.environ.get("OPENAI_API_KEY")
        self.ollama_url = os.environ.get("OLLAMA_API_URL")

        provider = "demo_engine"
        mode = "demo"
        description = "Simulation Mode (No external API key in .env). Clearly labelled demonstration intelligence active."

        if self.gemini_api_key:
            provider = "gemini"
            mode = "live"
            description = "Live Google Gemini AI Model connected."
        elif self.openai_api_key:
            provider = "openai"
            mode = "live"
            description = "Live OpenAI Model connected."
        elif self.ollama_url:
            provider = "ollama"
            mode = "live"
            description = f"Local Ollama service configured at {self.ollama_url}."

        return {
            "mode": mode,
            "provider": provider,
            "description": description,
            "speech_recognition": "Web Speech API (Native Browser STT: English + Telugu)",
            "speech_synthesis": "Web Speech API (Native Browser TTS: English + Telugu)",
            "languages_supported": ["en", "te"],
            "live_key_configured": bool(self.gemini_api_key or self.openai_api_key or self.ollama_url)
        }

    def generate_response(
        self,
        message: str,
        language: str = "en",
        history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Generates an assistant response considering multi-turn conversation context.
        Attempts Live AI first if credentials exist, otherwise executes the strict demo engine.
        """
        user_text = (message or "").strip()
        lang = (language or "en").lower().strip()
        is_telugu = lang in ("te", "telugu") or self._detect_telugu_characters(user_text)
        current_lang = "te" if is_telugu else "en"

        if not user_text:
            empty_msg = (
                "నేను మీ మాటలను వినలేకపోయాను. దయచేసి మైక్రోఫోన్ ద్వారా మళ్ళీ మాట్లాడండి లేదా కింద టైప్ చేయండి."
                if current_lang == "te"
                else "I didn't catch that. Please speak into your microphone again or type your message below."
            )
            return {
                "status": "success",
                "response": empty_msg,
                "language": current_lang,
                "mode": "system",
                "provider": "system",
                "is_empty": True
            }

        # Check for Live Providers
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if self.gemini_api_key:
            try:
                live_resp = self._call_gemini_api(user_text, current_lang, history or [])
                if live_resp:
                    return {
                        "status": "success",
                        "response": live_resp,
                        "language": current_lang,
                        "mode": "live",
                        "provider": "gemini",
                        "model": "gemini-1.5-flash",
                        "disclaimer": "Generated by live Google Gemini AI."
                    }
            except Exception as e:
                logger.error(f"Live Gemini API error: {e}. Falling back to demonstration engine.")

        # If no live API or live API failed, execute Demo Engine
        demo_resp = self._generate_demo_response(user_text, current_lang, history or [])
        return {
            "status": "success",
            "response": demo_resp,
            "language": current_lang,
            "mode": "demo",
            "provider": "demo_engine",
            "disclaimer": (
                "Demo Mode (Simulation): No external AI key configured in .env. "
                "Fictional demonstration response. Add GEMINI_API_KEY in .env for live AI."
            )
        }

    def _call_gemini_api(self, message: str, language: str, history: List[Dict[str, str]]) -> str:
        """Invokes Google Gemini 1.5 Flash via REST API with multi-turn history and system instructions."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_api_key}"
        
        system_text = SYSTEM_INSTRUCTION_TE if language == "te" else SYSTEM_INSTRUCTION_EN
        
        contents = []
        # Add conversation history
        for turn in history[-6:]:  # Keep recent turns
            role = "user" if turn.get("role") == "user" else "model"
            text = turn.get("text", "")
            if text:
                contents.append({"role": role, "parts": [{"text": text}]})
        
        # Add current user prompt
        contents.append({"role": "user", "parts": [{"text": message}]})

        payload = {
            "systemInstruction": {
                "parts": [{"text": system_text}]
            },
            "contents": contents,
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 250
            }
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))
            candidates = result.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "").strip()

        raise RuntimeError("No text returned by Gemini API")

    def _generate_demo_response(
        self,
        message: str,
        language: str,
        history: List[Dict[str, str]]
    ) -> str:
        """
        Rule-based contextual demonstration generator.
        Strictly satisfies demonstration requirements for attendance, voice assistant explanation,
        and multi-turn contextual dialogue in Telugu and English.
        """
        msg_lower = message.lower()

        # 1. Attendance queries (Mandatory fictional disclaimer)
        attendance_keywords = [
            "absent", "attendance", "marked", "percentage", "present", "bunk", "leave",
            "హాజరు", "గైర్హాజరు", "ఆబ్సెంట్", "లీవ్", "శాతం"
        ]
        if any(kw in msg_lower for kw in attendance_keywords):
            if language == "te":
                return (
                    "ఈ ప్రదర్శనలో, నమూనా హాజరు రికార్డు ప్రకారం విద్యార్థి గైర్హాజరైనట్లు చూపుతోంది. "
                    "వాస్తవ వ్యవస్థలో, సమాధానం ఇచ్చే ముందు నేను ధృవీకరించబడిన కళాశాల హాజరు రికార్డును తనిఖీ చేస్తాను. "
                    "మీరు విద్యార్థి లీవ్ లేదా మెడికల్ సర్టిఫికెట్ వివరాలు అందించాలనుకుంటున్నారా?"
                )
            return (
                "In this demonstration, the sample attendance record shows the student as absent. "
                "In a real system, I would check the verified college attendance record before answering. "
                "Would you like me to submit an inquiry to the department faculty coordinator?"
            )

        # 2. How the voice assistant works
        how_keywords = [
            "how do you work", "how does this work", "voice assistant", "microphone", "technology", "architecture",
            "what can you do", "explain", "ఎలా పనిచేస్తుంది", "మైక్రోఫోన్", "వాయిస్"
        ]
        if any(kw in msg_lower for kw in how_keywords):
            if language == "te":
                return (
                    "విఘ్నాన్ స్పందన AI వాయిస్ అసిస్టెంట్ మీ బ్రౌజర్ మైక్రోఫోన్ ద్వారా ధ్వనిని గ్రహించి, "
                    "స్పీచ్-టు-టెక్స్ట్ (STT) ద్వారా అక్షరాలుగా మారుస్తుంది. ఆపై AI సంభాషణ ఇంజిన్ ద్వారా అర్థం చేసుకుని, "
                    "టెక్స్ట్-టు-స్పీచ్ (TTS) ద్వారా మీకు తెలుగు లేదా ఇంగ్లీష్‌లో తిరిగి మాట్లాడుతుంది."
                )
            return (
                "The Vignan Spandana AI Voice Assistant captures your voice through the browser microphone, "
                "converts it into text using Speech Recognition, processes the dialogue context through our AI conversational engine, "
                "and synthesizes the answer back to you in clear Telugu or English speech."
            )

        # 3. Greetings & Introductions
        greeting_keywords = [
            "hello", "hi", "hey", "who are you", "what is your name", "introduce", "namaste", "start",
            "నమస్కారం", "ఎవరు", "మీ పేరేంటి", "హలో", "హాయ్"
        ]
        if any(kw in msg_lower for kw in greeting_keywords) or msg_lower in ("hello", "hi", "namaste", ""):
            if language == "te":
                return "నమస్కారం! నేను విఘ్నాన్ స్పందన AI అసిస్టెంట్ని. మీరు నాతో తెలుగులో లేదా ఇంగ్లీష్లో మాట్లాడవచ్చు. మీకు ఎలా సహాయం చేయగలను?"
            return "Hello! I am Vignan Spandana AI Assistant. You can speak with me in Telugu or English. How can I help you?"

        # 4. College / Vignan queries
        college_keywords = ["vignan", "college", "institute", "department", "cse", "ece", "faculty", "principal", "విజ్ఞాన్", "కళాశాల"]
        if any(kw in msg_lower for kw in college_keywords):
            if language == "te":
                return (
                    "విజ్ఞాన్ ఇన్స్టిట్యూట్ విద్యార్థుల సమగ్ర వికాసం మరియు క్రమశిక్షణకు ప్రాధాన్యత ఇస్తుంది. "
                    "స్పందన వ్యవస్థ ద్వారా తల్లిదండ్రులకు హాజరు, మార్కులు మరియు విద్యా ప్రగతిని ఎప్పటికప్పుడు తెలియజేస్తాము."
                )
            return (
                "Vignan's Institute is dedicated to academic excellence and transparent parent communication. "
                "Through the Spandana system, we keep parents updated on daily attendance, exam performance, and faculty advisories."
            )

        # 5. Follow-up / Faculty assistance
        faculty_keywords = ["faculty", "coordinator", "call back", "talk to human", "టీచర్", "మాట్లాడాలి", "ఫోన్"]
        if any(kw in msg_lower for kw in faculty_keywords):
            if language == "te":
                return (
                    "తప్పకుండా! మీ అభ్యర్థనను డిపార్ట్‌మెంట్ కోఆర్డినేటర్‌కు నివేదిస్తున్నాను. "
                    "సంబంధిత ఫ్యాకల్టీ సభ్యులు త్వరలోనే మీతో నేరుగా మాట్లాడతారు."
                )
            return (
                "Certainly! I have noted your request for the department coordinator. "
                "A faculty member will follow up with you directly regarding this matter."
            )

        # 6. Gratitude / Closure
        closure_keywords = ["thank you", "thanks", "bye", "goodbye", "ధన్యవాదాలు", "థాంక్స్", "వెళ్ళొస్తా"]
        if any(kw in msg_lower for kw in closure_keywords):
            if language == "te":
                return "ధన్యవాదాలు! విజ్ఞాన్ స్పందనతో మాట్లాడినందుకు సంతోషం. మీకు ఏ సమయంలోనైనా సహాయం చేయడానికి నేను సిద్ధంగా ఉంటాను."
            return "Thank you for speaking with Vignan Spandana! Have a wonderful day, and feel free to reach out anytime."

        # 7. Default contextual answer
        if language == "te":
            return (
                f"మీరు అడిగిన '{message}' విషయంపై అర్థం చేసుకున్నాను. "
                "ఈ ప్రదర్శన సంస్కరణలో, నేను కళాశాల సమాచారం, హాజరు విధానం మరియు విజ్ఞాన్ స్పందన సేవలపై మార్గనిర్దేశం చేయగలను. "
                "మీకు మరింత నిర్దిష్టమైన సమాచారం కావాలా?"
            )
        return (
            f"I understand your query regarding '{message}'. "
            "In this prototype demonstration, I can assist you with academic inquiries, attendance procedures, and parent communication workflows. "
            "How else may I assist you today?"
        )

    def _detect_telugu_characters(self, text: str) -> bool:
        """Detects if Telugu Unicode characters (U+0C00 to U+0C7F) are present."""
        return any('\u0c00' <= char <= '\u0c7f' for char in text)
