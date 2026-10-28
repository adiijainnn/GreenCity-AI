import re
import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from apps.api.models import CitizenReport, Ward, GreenSpace, User
from apps.api.services.weather_service import weather_service
from apps.api.services.air_quality_service import air_quality_service
from apps.api.services.routing_service import routing_service
from apps.api.services.place_search_service import place_search_service
from apps.api.services.environmental_risk_service import environmental_risk_service

class VoiceAssistantService:
    def __init__(self):
        pass

    def detect_language(self, text: str, user_lang: Optional[str] = None) -> str:
        """
        Determines target language: Marathi ('mr'), Hindi ('hi'), or English ('en').
        """
        if user_lang in ("mr", "hi", "en"):
            # Check if text is predominantly Devanagari while preserving chosen language
            return user_lang

        # Simple Devanagari detection
        devanagari_chars = len(re.findall(r'[\u0900-\u097F]', text))
        if devanagari_chars > 2:
            # Check for distinctive Marathi markers
            marathi_markers = ["आहे", "नाही", "कसा", "कशी", "जागा", "कोणती", "तलाव", "सिद्धेश्वर", "बघा", "करा", "झाड", "रस्ता", "सांगा"]
            if any(m in text for m in marathi_markers):
                return "mr"
            return "hi"
        return "en"

    def process_query(
        self,
        query: str,
        user_lang: str,
        user_lat: Optional[float] = None,
        user_lng: Optional[float] = None,
        db: Optional[Session] = None,
        current_user: Optional[User] = None
    ) -> Dict[str, Any]:
        """
        Processes voice or text query, invokes appropriate grounded backend tool,
        and generates response in target language (en, hi, mr).
        """
        lang = self.detect_language(query, user_lang)
        q_lower = query.lower()

        # Default coordinates (Solapur center if user hasn't shared location)
        lat = user_lat if user_lat is not None else 17.6599
        lng = user_lng if user_lng is not None else 75.9064

        # -------------------------------------------------------------------
        # INTENT 1: Environmental / AQI / Weather Query
        # -------------------------------------------------------------------
        aqi_keywords = ["aqi", "air quality", "हवेची गुणवत्ता", "हवामान", "प्रदूषण", "pollution", "pm2.5", "weather", "तापमान", "temperature"]
        if any(k in q_lower for k in aqi_keywords):
            # Check if specific place is mentioned in query
            search_res = place_search_service.search_places(query, db, limit=1) if db else []
            target_name = "Solapur"
            target_lat, target_lng = lat, lng
            if search_res:
                target_name = search_res[0]["name"]
                target_lat = search_res[0]["latitude"]
                target_lng = search_res[0]["longitude"]

            aq = air_quality_service.get_air_quality(target_lat, target_lng)
            w = weather_service.get_weather(target_lat, target_lng)
            suit = environmental_risk_service.evaluate_visit_suitability(target_lat, target_lng)

            if lang == "mr":
                reply = (
                    f"{target_name} येथे सध्याचा हवेचा गुणवत्ता निर्देशांक (AQI) {aq['indian_aqi']} "
                    f"({aq['category']}) आहे. PM2.5 प्रमाण {aq['pm2_5']} µg/m³ असून तापमान {w['temperature_c']}°C "
                    f"({w['condition_text']}) आहे. बाहेरील परिस्थिती: {suit['overall_rating']}."
                )
            elif lang == "hi":
                reply = (
                    f"{target_name} में वर्तमान वायु गुणवत्ता सूचकांक (AQI) {aq['indian_aqi']} "
                    f"({aq['category']}) है। PM2.5 का स्तर {aq['pm2_5']} µg/m³ और तापमान {w['temperature_c']}°C "
                    f"({w['condition_text']}) है। बाहरी स्थिति: {suit['overall_rating']}।"
                )
            else:
                reply = (
                    f"At {target_name}, the latest Indian AQI is {aq['indian_aqi']} ({aq['category']}) "
                    f"with PM2.5 at {aq['pm2_5']} µg/m³. The current temperature is {w['temperature_c']}°C "
                    f"({w['condition_text']}). Outdoor visit rating: {suit['overall_rating']}."
                )

            return {
                "intent": "environmental_intelligence",
                "language": lang,
                "reply": reply,
                "card_type": "environmental_card",
                "card_data": {
                    "place_name": target_name,
                    "air_quality": aq,
                    "weather": w,
                    "suitability": suit
                }
            }

        # -------------------------------------------------------------------
        # INTENT 2: Directions / Route Request
        # -------------------------------------------------------------------
        route_keywords = ["route", "direction", "मार्ग", "रस्ता", "दिशा", "जाण्यासाठी", "कसे जावे", "directions to", "how to reach"]
        if any(k in q_lower for k in route_keywords):
            search_res = place_search_service.search_places(query, db, limit=1) if db else []
            if not search_res and db:
                # default to Siddheshwar Lake if query has no specific match
                search_res = place_search_service.search_places("Siddheshwar", db, limit=1)

            if search_res:
                dest = search_res[0]
                mode = "walking" if "walk" in q_lower or "पाय" in q_lower or "चालत" in q_lower else "driving"
                route_res = routing_service.get_route(lat, lng, dest["latitude"], dest["longitude"], mode=mode)

                if lang == "mr":
                    reply = (
                        f"{dest['name']} कडे जाणारा {mode} मार्ग सापडला आहे. एकूण अंतर {route_res['distance_km']} किमी "
                        f"आणि अंदाजे वेळ {route_res['duration_minutes']} मिनिटे आहे. पहिल्या वळणासाठी मार्गदर्शक सूचना पहा."
                    )
                elif lang == "hi":
                    reply = (
                        f"{dest['name']} के लिए {mode} मार्ग उपलब्ध है। कुल दूरी {route_res['distance_km']} किमी "
                        f"और अनुमानित समय {route_res['duration_minutes']} मिनट है। पहले मोड़ के लिए निर्देश देखें।"
                    )
                else:
                    reply = (
                        f"Found a {mode} route to {dest['name']}. Distance is {route_res['distance_km']} km, "
                        f"taking approximately {route_res['duration_minutes']} minutes. Turn-by-turn guidance is ready."
                    )

                return {
                    "intent": "route_navigation",
                    "language": lang,
                    "reply": reply,
                    "card_type": "route_card",
                    "card_data": {
                        "destination_name": dest["name"],
                        "route": route_res
                    }
                }

        # -------------------------------------------------------------------
        # INTENT 3: Nearby Green Spaces / Discovery
        # -------------------------------------------------------------------
        nearby_keywords = ["nearby", "जवळ", "आसपास", "उद्यान", "बगीचा", "park", "garden", "green space", "फिरण्यासाठी", "घूमने"]
        if any(k in q_lower for k in nearby_keywords):
            # Check radius in query
            radius = 3.0
            if "1 km" in q_lower or "१ किमी" in q_lower:
                radius = 1.0
            elif "2 km" in q_lower or "२ किमी" in q_lower:
                radius = 2.0
            elif "5 km" in q_lower or "५ किमी" in q_lower:
                radius = 5.0

            nearby = place_search_service.get_nearby_places(lat, lng, radius_km=radius, db=db, limit=5)

            if nearby:
                first_few = ", ".join([p["name"] for p in nearby[:3]])
                if lang == "mr":
                    reply = (
                        f"{radius} किमी परिसरात {len(nearby)} प्रमुख हरित ठिकाणे आढळली: {first_few}. "
                        f"सविस्तर माहिती आणि अंतर खालील सूचीमध्ये पहा."
                    )
                elif lang == "hi":
                    reply = (
                        f"{radius} किमी के दायरे में {len(nearby)} प्रमुख हरित स्थल मिले हैं: {first_few}। "
                        f"विस्तृत जानकारी और पैदल दूरी नीचे दी गई है।"
                    )
                else:
                    reply = (
                        f"Found {len(nearby)} green spaces within {radius} km: {first_few}. "
                        f"Details, tree canopy scores, and walking distances are listed below."
                    )

                return {
                    "intent": "nearby_discovery",
                    "language": lang,
                    "reply": reply,
                    "card_type": "place_card",
                    "card_data": {
                        "radius_km": radius,
                        "places": nearby
                    }
                }

        # -------------------------------------------------------------------
        # INTENT 4: Citizen Complaint / Issue Draft
        # -------------------------------------------------------------------
        report_keywords = ["report", "complaint", "तक्रार", "झाड पडले", "कचरा", "garbage", "tree cut", "पाणी नाही", "समस्या", "issue"]
        if any(k in q_lower for k in report_keywords):
            # Detect category
            cat = "Other"
            if "झाड" in q_lower or "tree" in q_lower:
                cat = "Damaged Tree" if "cut" not in q_lower and "तोड" not in q_lower else "Illegal Tree Cutting"
            elif "कचरा" in q_lower or "garbage" in q_lower or "waste" in q_lower:
                cat = "Garbage in Green Space"
            elif "पाणी" in q_lower or "water" in q_lower:
                cat = "Watering Issue"

            # Match nearest ward
            nearest_ward_id = ""
            if db:
                wards = db.query(Ward).all()
                if wards:
                    nearest_ward_id = wards[0].id

            draft = {
                "title": f"Civic Report: {query[:50]}",
                "category": cat,
                "description": query,
                "latitude": lat,
                "longitude": lng,
                "ward_id": nearest_ward_id,
                "location_name": "Detected Location near Solapur"
            }

            if lang == "mr":
                reply = (
                    f"मी आपल्या तक्रारीचा मसुदा तयार केला आहे: '{cat}'. "
                    f"कृपया खालील माहिती तपासा आणि पुष्टी करा. आपण आवश्यकतेनुसार तपशील संपादित करू शकता."
                )
            elif lang == "hi":
                reply = (
                    f"मैंने आपकी शिकायत का प्रारूप तैयार कर लिया है: '{cat}'। "
                    f"कृपया विवरण की समीक्षा करें और पुष्टि करें। आप आवश्यकतानुसार इसे बदल सकते हैं।"
                )
            else:
                reply = (
                    f"I have drafted your civic issue report under category '{cat}'. "
                    f"Please review and verify the details before submitting to the municipal authority."
                )

            return {
                "intent": "draft_report",
                "language": lang,
                "reply": reply,
                "card_type": "report_review_card",
                "card_data": draft
            }

        # -------------------------------------------------------------------
        # INTENT 5: Check Report Status
        # -------------------------------------------------------------------
        status_match = re.search(r'REP-\d+-[A-Z0-9]+', query, re.IGNORECASE)
        if status_match and db:
            rep_num = status_match.group(0).upper()
            rep = db.query(CitizenReport).filter(CitizenReport.report_number == rep_num).first()
            if rep:
                # Privacy check: if logged in user is not reporter and not officer/admin
                is_authorized = True
                if current_user and current_user.role not in ("ADMIN", "OFFICER") and rep.reported_by and rep.reported_by != current_user.id:
                    is_authorized = False

                if is_authorized:
                    if lang == "mr":
                        reply = f"तक्रार क्रमांक {rep.report_number} ची सध्याची स्थिती '{rep.status}' आहे. वर्ग: {rep.category}. नोंदणी तारीख: {rep.created_at.strftime('%d-%m-%Y')}."
                    elif lang == "hi":
                        reply = f"शिकायत संख्या {rep.report_number} की वर्तमान स्थिति '{rep.status}' है। श्रेणी: {rep.category}। दिनांक: {rep.created_at.strftime('%d-%m-%Y')}।"
                    else:
                        reply = f"Report {rep.report_number} status is currently '{rep.status}'. Category: {rep.category}. Submitted on: {rep.created_at.strftime('%d-%m-%Y')}."

                    return {
                        "intent": "report_status",
                        "language": lang,
                        "reply": reply,
                        "card_type": "report_status_card",
                        "card_data": {
                            "report_number": rep.report_number,
                            "title": rep.title,
                            "category": rep.category,
                            "status": rep.status,
                            "created_at": rep.created_at.isoformat(),
                            "public_response": rep.public_response
                        }
                    }
                else:
                    return {
                        "intent": "unauthorized",
                        "language": lang,
                        "reply": "Confidential report: You do not have permission to view another citizen's private report." if lang == "en" else "गोपनीय अहवाल: आपल्याला इतर नागरिकाची खाजगी तक्रार पाहण्याची परवानगी नाही.",
                        "card_type": None,
                        "card_data": None
                    }

        # -------------------------------------------------------------------
        # DEFAULT / GENERAL ASSISTANT HELP
        # -------------------------------------------------------------------
        if lang == "mr":
            reply = (
                "मी ग्रीनसिटी एआय व्हॉईस असिस्टंट आहे! मी तुम्हाला सोलापूरमधील उद्याने शोधण्यात, "
                "हवेची गुणवत्ता (AQI) आणि हवामान तपासण्यात, रस्ता मार्गदर्शन मिळवण्यात आणि "
                "महानगरपालिकेकडे तक्रार नोंदवण्यात मदत करू शकतो. आपण काय विचारू इच्छिता?"
            )
        elif lang == "hi":
            reply = (
                "मैं ग्रीनसिटी एआई वॉयस असिस्टेंट हूँ! मैं आपको सोलापुर में हरित पार्क खोजने, "
                "वायु गुणवत्ता (AQI) व मौसम जांचने, नेविगेशन दिशा-निर्देश प्राप्त करने और "
                "नगर निगम में शिकायत दर्ज करने में सहायता कर सकता हूँ। आप क्या जानना चाहते हैं?"
            )
        else:
            reply = (
                "I am your GreenCity AI Voice Assistant. I can help you discover urban parks in Solapur, "
                "check live Air Quality (AQI) & weather, calculate turn-by-turn driving or walking routes, "
                "and draft civic reports for municipal action. How can I help you today?"
            )

        return {
            "intent": "general_help",
            "language": lang,
            "reply": reply,
            "card_type": None,
            "card_data": None
        }

voice_assistant_service = VoiceAssistantService()
