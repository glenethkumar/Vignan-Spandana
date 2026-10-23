"""
Vignan Spandana - Mock AI Adapter
Rule-based conversational generator in Telugu and English.
Adheres strictly to saved student records without guessing missing data.
"""

from typing import Dict, Any, Optional
from .base import AIAdapter


class MockAIAdapter(AIAdapter):
    """Rule-based mock AI agent for safe parent communication demonstration."""

    def generate_greeting(self, student_name: str, language: str) -> str:
        lang = (language or "Telugu").capitalize()
        if lang == "Telugu":
            return (
                f"నమస్కారం, నేను విజ్ఞాన్ ఇన్స్టిట్యూట్ నుండి మాట్లాడుతున్న ఆర్టిఫిషియల్ ఇంటెలిజెన్స్ (AI) సహాయకురాలిని. "
                f"నేను {student_name} గారి తల్లి లేదా తండ్రితో మాట్లాడుతున్నానా అండి?"
            )
        return (
            f"Hello, I am the automated AI Assistant calling from Vignan Institute. "
            f"Am I speaking with the parent or guardian of {student_name}?"
        )

    def process_parent_response(self, context: Dict[str, Any], user_utterance: str) -> Dict[str, Any]:
        return {
            "response": "Understood. Thank you for your feedback.",
            "next_state": "confirmed",
            "action_items": []
        }

    def generate_simulated_call_script(self, student: Dict[str, Any], language: str) -> Dict[str, Any]:
        """
        Generates scripted dialogue using the student's saved data:
        - AI introduces itself as an AI assistant from Vignan's Institute
        - Asks "Am I speaking with the parent of <student name>?"
        - Parent replies "Yes" (scripted)
        - AI states attendance % (and marks if present)
        - If attendance is below 75%, AI mentions it politely
        - If attendance is missing, AI explicitly states attendance is unavailable (never guesses)
        - If phone is missing, AI notes that phone number is not registered (never guesses)
        - Parent asks a question AI cannot answer (scripted); AI says faculty will call back, and FollowUp created
        - AI closes call politely
        """
        lang = "Telugu" if (language or "").strip().lower() in ("telugu", "te") else "English"
        student_name = student.get("name", "Student")
        roll_number = student.get("roll_number", "")
        department = student.get("department", "Engineering")

        # 1. Attendance processing (Never guess if missing)
        raw_att = student.get("attendance_percentage")
        has_attendance = False
        attendance_pct: Optional[float] = None
        if raw_att is not None and str(raw_att).strip() != "" and str(raw_att).lower() not in ("none", "null", "nan"):
            try:
                attendance_pct = round(float(raw_att), 1)
                has_attendance = True
            except (ValueError, TypeError):
                has_attendance = False

        is_low_attendance = has_attendance and (attendance_pct is not None and attendance_pct < 75.0)

        # 2. Parent phone processing (Never guess if missing)
        raw_phone = student.get("parent_phone")
        has_phone = bool(raw_phone and str(raw_phone).strip() != "" and str(raw_phone).strip().lower() not in ("none", "n/a", "null", "unavailable"))

        # 3. Marks processing (Never guess if missing)
        marks_info = student.get("marks_info") or student.get("mid_marks")
        has_marks = bool(marks_info and str(marks_info).strip() != "" and str(marks_info).strip().lower() not in ("none", "n/a", "null", "unavailable"))

        lines = []

        if lang == "Telugu":
            # Opening greeting & institutional identification
            lines.append({
                "speaker": "AI Assistant",
                "text": "నమస్కారం, నేను విజ్ఞాన్స్ ఇన్స్టిట్యూట్ ఆఫ్ ఇన్ఫర్మేషన్ టెక్నాలజీ నుండి మాట్లాడుతున్న ఆర్టిఫిషియల్ ఇంటెలిజెన్స్ (AI) సహాయకురాలిని."
            })

            # Check if phone number is registered
            if not has_phone:
                lines.append({
                    "speaker": "AI Assistant",
                    "text": "గమనిక: తల్లిదండ్రుల ఫోన్ నంబర్ అధికారిక రికార్డులలో నమోదు కాలేదు. ఇది క్యాంపస్ డెమో లైన్ ద్వారా సంభాషణ."
                })

            lines.append({
                "speaker": "AI Assistant",
                "text": f"నేను {student_name} గారి తల్లి లేదా తండ్రితో మాట్లాడుతున్నానా అండి?"
            })
            lines.append({
                "speaker": "Parent",
                "text": f"అవును, నేను {student_name} తండ్రినే మాట్లాడుతున్నాను. చెప్పండి మేడమ్."
            })

            # Attendance statement (strict adherence to data presence)
            if has_attendance:
                att_statement = f"కాలేజ్ నుండి అకడమిక్ వివరాలు తెలియజేయడానికి కాల్ చేశాను. {student_name} గారి ప్రస్తుత హాజరు (Attendance) {attendance_pct}% గా నమోదైంది."
                if has_marks:
                    att_statement += f" ఇటీవల ఇంటర్నల్ మార్కులు: {marks_info}."
                lines.append({
                    "speaker": "AI Assistant",
                    "text": att_statement
                })

                if is_low_attendance:
                    lines.append({
                        "speaker": "AI Assistant",
                        "text": "ఈ హాజరు విశ్వవిద్యాలయ నిబంధనలైన 75% కనీస పరిమితి కంటే తక్కువగా ఉంది. దయచేసి విద్యార్థి ప్రతిరోజూ తరగతులకు క్రమం తప్పకుండా హాజరయ్యేలా శ్రద్ధ వహించవలసిందిగా కోరుతున్నాము."
                    })
                else:
                    lines.append({
                        "speaker": "AI Assistant",
                        "text": "విద్యార్థి హాజరు 75% కంటే ఎక్కువగా సంతృప్తికరంగా ఉంది. ఇదే విధమైన క్రమశిక్షణను కొనసాగించగలరని ఆశిస్తున్నాము."
                    })
            else:
                lines.append({
                    "speaker": "AI Assistant",
                    "text": f"కాలేజ్ నుండి అకడమిక్ వివరాలు తెలియజేయడానికి కాల్ చేశాను. ప్రస్తుతం {student_name} గారి ప్రస్తుత సెమిస్టర్ హాజరు వివరాలు సిస్టమ్‌లో అందుబాటులో లేవు, అవి ఫ్యాకల్టీ నమోదు కోసం వేచి ఉన్నాయి."
                })

            # Parent query beyond AI scope
            lines.append({
                "speaker": "Parent",
                "text": "సరేనండి. గత వారం జరిగిన పరీక్ష మార్కులు ఎందుకు తక్కువగా వచ్చాయి? అసైన్‌మెంట్ మళ్లీ సబ్మిట్ చేయడానికి ఏమైనా అవకాశం ఉంటుందా?"
            })
            lines.append({
                "speaker": "AI Assistant",
                "text": f"క్షమించండి, పరీక్ష పత్రాల అంతర్గత మూల్యాంకనం గురించిన సమాచారం నా పరిధిలో లేదు. నేను దీనిపై ఫాలో-అప్ అభ్యర్థన నమోదు చేస్తున్నాను, {department} విభాగానికి చెందిన ఫ్యాకల్టీ మీకు త్వరలోనే తిరిగి కాల్ చేస్తారు."
            })
            lines.append({
                "speaker": "AI Assistant",
                "text": "విజ్ఞాన్స్ ఇన్స్టిట్యూట్ తో మాట్లాడినందుకు మరియు సహకరించినందుకు ధన్యవాదాలు. సెలవు!"
            })

            # Telugu summary
            att_summary_part = f"హాజరు సమాచారం ({attendance_pct}%)" if has_attendance else "హాజరు వివరాలు అందుబాటులో లేవు"
            summary = f"{att_summary_part}. పరీక్ష మార్కుల పునఃపరిశీలనపై తల్లిదండ్రుల ప్రశ్నకు {department} ఫ్యాకల్టీ కాల్‌బ్యాక్ టికెట్ కేటాయించబడింది."

        else:
            # English Script
            lines.append({
                "speaker": "AI Assistant",
                "text": "Hello, I am the automated AI Assistant calling from Vignan's Institute of Information Technology."
            })

            if not has_phone:
                lines.append({
                    "speaker": "AI Assistant",
                    "text": "Notice: Parent phone number is currently not registered on official student records. Call simulated via campus demonstration line."
                })

            lines.append({
                "speaker": "AI Assistant",
                "text": f"Am I speaking with the parent of {student_name}?"
            })
            lines.append({
                "speaker": "Parent",
                "text": f"Yes, I am {student_name}'s parent speaking. How can I help you?"
            })

            # Attendance statement
            if has_attendance:
                att_statement = f"I am calling to share an academic progress update. {student_name}'s current overall attendance is {attendance_pct}%."
                if has_marks:
                    att_statement += f" Latest internal assessment score: {marks_info}."
                lines.append({
                    "speaker": "AI Assistant",
                    "text": att_statement
                })

                if is_low_attendance:
                    lines.append({
                        "speaker": "AI Assistant",
                        "text": "We noticed the attendance has fallen below the mandatory 75% threshold. We kindly request your support in encouraging regular attendance for upcoming classes."
                    })
                else:
                    lines.append({
                        "speaker": "AI Assistant",
                        "text": "The student is maintaining satisfactory attendance above the 75% requirement. Thank you for your continued encouragement."
                    })
            else:
                lines.append({
                    "speaker": "AI Assistant",
                    "text": f"I am calling to share an academic update. Currently, official attendance percentage records for {student_name} are unavailable in the departmental system and are pending faculty verification."
                })

            # Parent query beyond AI scope
            lines.append({
                "speaker": "Parent",
                "text": "Thank you. Could you please explain why internal assessment marks were deducted in the recent test, and can an assignment be submitted for re-evaluation?"
            })
            lines.append({
                "speaker": "AI Assistant",
                "text": f"I do not have access to specific answer paper evaluations. I am registering an inquiry ticket, and a faculty mentor from the {department} department will call you back shortly."
            })
            lines.append({
                "speaker": "AI Assistant",
                "text": "Thank you for your valuable time and cooperation with Vignan's Institute. Have a pleasant day."
            })

            # English summary
            att_summary_part = f"Attendance update ({attendance_pct}%)" if has_attendance else "Attendance data unavailable"
            summary = f"{att_summary_part}. Parent inquired about exam mark re-evaluation; escalated to {department} faculty callback."

        # Format speaker-labelled transcript
        transcript = "\n".join([f"[{line['speaker']}]: {line['text']}" for line in lines])

        return {
            "language": lang,
            "lines": lines,
            "transcript": transcript,
            "summary": summary,
            "duration_seconds": 45,
            "escalated": True,
            "escalation_notes": f"Parent requested clarification regarding internal exam assessment marks during AI phone call. Faculty callback requested for {student_name} ({roll_number}).",
            "action_required": f"Faculty callback regarding exam evaluation for {student_name}"
        }
