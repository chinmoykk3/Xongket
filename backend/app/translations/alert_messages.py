"""
Multilingual disaster warning templates for rural Assam.
Supported languages:
  - Assamese (অসমীয়া) - Default state language
  - Bodo (बर') - Bodoland Territorial Region (BTR)
  - Bengali (বাংলা) - Barak Valley & char areas
  - Hindi (हिन्दी) - Tea garden / migrant communities
  - English - Standard inter-agency / ASDMA dispatch
"""

from __future__ import annotations

# Structure: TEMPLATES[hazard][severity][language]
TEMPLATES: dict[str, dict[str, dict[str, str]]] = {
    "flood": {
        "advisory": {
            "assamese": "{village_name}ত নদী/জলভাগৰ পানী বৃদ্ধি হোৱাৰ সম্ভাৱনা আছে (বৰ্তমান: {value}{unit})। সতৰ্ক থাকক আৰু পৰিস্থিতি লক্ষ্য কৰক।",
            "bodo": "{village_name} आव दै बांनायनि खौरां दं (दासान्दि: {value}{unit})। सांग्रां जा आरो अबस्थाखौ नोजोर हो।",
            "bengali": "{village_name}-এ নদীর জলস্তর বৃদ্ধির সম্ভাবনা রয়েছে (বর্তমান: {value}{unit})। সতর্ক থাকুন ও খবরাখবর রাখুন।",
            "hindi": "{village_name} में जल स्तर बढ़ने की संभावना है (वर्तमान: {value}{unit})। सतर्क रहें और स्थिति पर नज़र रखें।",
            "english": "Advisory: Water level rising in {village_name} (current: {value}{unit}). Stay alert and monitor local conditions.",
        },
        "warning": {
            "assamese": "সতৰ্কবাণী: {village_name}ত পানীৰ মাত্ৰা সতৰ্ক সীমা পাৰ হৈছে ({value}{unit})। প্ৰয়োজনীয় নথি-সামগ্ৰী লগত ৰাখি ওখ ঠাইলৈ যাবলৈ সাজু হওক।",
            "bodo": "हुसियार खौरां: {village_name} आव दैनि बिबाङा हुसियार सिमा बारबाय ({value}{unit})। रैखाथि जायगायाव थांनो थियारि जा।",
            "bengali": "সতর্কবার্তা: {village_name}-এ জলস্তর সতর্কতা স্তর অতিক্রম করেছে ({value}{unit})। প্রয়োজনীয় সামগ্রী নিয়ে নিরাপদ আশ্রয়ে যাওয়ার প্রস্তুতি নিন।",
            "hindi": "चेतावनी: {village_name} में जल स्तर चेतावनी सीमा पार कर चुका है ({value}{unit})। सुरक्षित स्थान पर जाने की तैयारी रखें।",
            "english": "Warning: Water level reached warning threshold in {village_name} ({value}{unit}). Prepare for relocation to higher ground.",
        },
        "danger": {
            "assamese": "জৰুৰী বিপদ সংকেত! {village_name}ত পানী বিপদসীমাৰ ওপৰত ({value}{unit})। পলম নকৰি ওখ স্থান বা নিকটৱৰ্তী আশ্ৰয় শিবিৰলৈ যাওক!",
            "bodo": "गिख्रोंथाव खौरां! {village_name} आव दैनि बिबाङा बिपद सिमानिफ्राय गोजौ जाबाय ({value}{unit})। थाबैनो गोजौ जायगा एबा आश्रय जायगायाव थां!",
            "bengali": "জরুরি বিপদ সংকেত! {village_name}-এ জলস্তর বিপদসীমা অতিক্রম করেছে ({value}{unit})। অবিলম্বে নিরাপদ আশ্রয়ে বা নিকটস্থ শিবিরে যান!",
            "hindi": "खतरे की चेतावनी! {village_name} में जल स्तर खतरे के निशान से ऊपर है ({value}{unit})। तुरंत सुरक्षित स्थान या नजदीकी आश्रय स्थल जाएं!",
            "english": "Danger Alert: Water level has exceeded danger mark in {village_name} ({value}{unit})! Evacuate immediately to higher ground or nearest shelter!",
        },
    },
    "landslide": {
        "advisory": {
            "assamese": "{village_name}ত ধাৰাসাৰ বৰষুণৰ বাবে মাটি খহাৰ প্ৰাথমিক সম্ভাৱনা আছে। পাহাৰীয়া এলেকাৰ পৰা সতৰ্ক থাকক।",
            "bodo": "{village_name} आव जोबोद अखा हानायनि थाखाय हा बाहायनायनि सांग्रांथि दं। हाजो ओनसोलनिफ्राय हुसियार जा।",
            "bengali": "{village_name}-এ ভারী বৃষ্টির কারণে ভূমিধসের প্রাথমিক ঝুঁকি রয়েছে। পাহাড়ি এলাকা থেকে সতর্ক থাকুন।",
            "hindi": "{village_name} में भारी बारिश के कारण भूस्खलन की प्रारंभिक संभावना है। पहाड़ी ढलानों से सतर्क रहें।",
            "english": "Advisory: Continuous rainfall increases landslide risk in {village_name}. Stay clear of steep slopes.",
        },
        "warning": {
            "assamese": "সতৰ্কবাণী: {village_name}ত মাটিৰ আৰ্দ্ৰতা আশংকাজনকভাৱে বৃদ্ধি পাইছে ({value}{unit})। সম্ভাৱ্য মাটি খহা স্থানৰ পৰা আঁতৰি থাকক।",
            "bodo": "हुसियार खौरां: {village_name} आव हानि सिदोबथाया खौरां जानाय बादि बांबाय ({value}{unit})। हा बाहायग्रा ओनसोलनिफ्राय जान्गार।",
            "bengali": "সতর্কবার্তা: {village_name}-এ মাটির আর্দ্রতা আশঙ্কাজনক স্তরে পৌঁছেছে ({value}{unit})। ভূমিধসপ্রবণ অঞ্চল ত্যাগ করুন।",
            "hindi": "चेतावनी: {village_name} में मिट्टी की नमी खतरनाक स्तर पर है ({value}{unit})। भूस्खलन संभावित क्षेत्रों से हट जाएं।",
            "english": "Warning: Soil moisture reached critical levels in {village_name} ({value}{unit}). Move away from unstable slope zones.",
        },
        "danger": {
            "assamese": "জৰুৰী বিপদ সংকেত! {village_name}ত মাটি খহাৰ তীব্ৰ আশংকা ({value}{unit})। পাহাৰীয়া আৰু তলতীয়া এলেকাৰ বাসিন্দাসকল অবিলম্বে আঁতৰি যাওক!",
            "bodo": "गिख्रोंथाव खौरां! {village_name} आव हा बाहायनायनि जोबोद गिथाव अबस्था ({value}{unit})। हाजो आरो गाहाय ओनसोलनि सुबुंफोरा थाबैनो जान्गार!",
            "bengali": "জরুরি বিপদ সংকেত! {village_name}-এ ব্যাপক ভূমিধসের তাৎক্ষণিক ঝুঁকি ({value}{unit})। অবিলম্বে নিরাপদ আশ্রয়ে সরে যান!",
            "hindi": "खतरे की चेतावनी! {village_name} में बड़े भूस्खलन का गंभीर खतरा ({value}{unit})। तुरंत सुरक्षित स्थान पर स्थानांतरित हों!",
            "english": "Danger Alert: Immediate landslide failure imminent in {village_name} ({value}{unit})! Evacuate steep slope areas immediately!",
        },
    },
    "earthquake": {
        "advisory": {
            "assamese": "{village_name}ত মৃদু ভূকম্পন অনুভৱ হৈছে ({value}{unit})। সতৰ্ক থাকক।",
            "bodo": "{village_name} आव लुरलुबै हाबां मिथिबाय ({value}{unit})। सांग्रां जा।",
            "bengali": "{village_name}-এ মৃদু ভূমিকম্প অনুভূত হয়েছে ({value}{unit})। সতর্ক থাকুন।",
            "hindi": "{village_name} में हल्का भूकंप दर्ज किया गया ({value}{unit})। सतर्क रहें।",
            "english": "Advisory: Minor seismic tremor recorded in {village_name} ({value}{unit}). Stay aware of aftershocks.",
        },
        "warning": {
            "assamese": "সতৰ্কবাণী: {village_name}ত মধ্যমীয়া ভূকম্পন অনুভূত হৈছে ({value}{unit})। পকী ঘৰৰ পৰা মুকলি স্থানলৈ যাওক।",
            "bodo": "हुसियार खौरां: {village_name} आव गेजेर हाबां मिथिबाय ({value}{unit})। न'निफ्राय ओंखारनानै उदां जायगायाव थां।",
            "bengali": "সতর্কবার্তা: {village_name}-এ মাঝারি মাত্রার ভূমিকম্প অনুভূত হয়েছে ({value}{unit})। পাকা ভবন ছেড়ে খোলা জায়গায় যান।",
            "hindi": "चेतावनी: {village_name} में मध्यम तीव्रता का भूकंप आया है ({value}{unit})। भवनों से बाहर खुले स्थान पर आएं।",
            "english": "Warning: Moderate earthquake tremor in {village_name} ({value}{unit}). Move away from overhead hazards into open spaces.",
        },
        "danger": {
            "assamese": "জৰুৰী বিপদ সংকেত! {village_name}ত প্ৰবল ভূকম্পন অনুভূত ({value}{unit})। সুৰক্ষিত স্থানলৈ যাওক আৰু বৈদ্যুতিক সংযোগ বন্ধ কৰক!",
            "bodo": "गिख्रोंथाव खौरां! {village_name} आव जोबोद गोख्रों हाबां जाबाय ({value}{unit})। रैखाथि जायगायाव थां आरो कारेन्ट खौ फोजा!",
            "bengali": "জরুরি বিপদ সংকেত! {village_name}-এ প্রবল ভূমিকম্প সংঘটিত ({value}{unit})। অবিলম্বে নিরাপদ আশ্রয়ে যান ও বিদ্যুৎ সংযোগ বিচ্ছিন্ন করুন!",
            "hindi": "खतरे की चेतावनी! {village_name} में तीव्र भूकंप दर्ज किया गया ({value}{unit})। तुरंत खुले मैदान में जाएं और सतर्क रहें!",
            "english": "Danger Alert: Severe earthquake tremor in {village_name} ({value}{unit})! Drop, cover, and evacuate damaged structures immediately!",
        },
    },
}


def get_alert_message(
    hazard: str,
    severity: str,
    language: str,
    village_name: str,
    value: float,
    unit: str,
) -> str:
    """Format an alert message in the target language with English fallback."""
    hazard_dict = TEMPLATES.get(hazard.lower(), TEMPLATES["flood"])
    severity_dict = hazard_dict.get(severity.lower(), hazard_dict["warning"])

    lang_key = language.lower() if language else "assamese"
    template = severity_dict.get(lang_key)
    if not template:
        # Fallback sequence: Assamese -> English
        template = severity_dict.get("assamese", severity_dict.get("english"))

    formatted = template.format(
        village_name=village_name,
        value=f"{value:.1f}" if isinstance(value, (int, float)) else str(value),
        unit=unit,
    )
    return formatted


def get_ai_forecast_alert_message(
    severity: str,
    language: str,
    village_name: str,
    predicted_value: float,
    unit: str,
    lead_time_hours: int,
    explanation: str,
) -> str:
    """Format an AI forecast alert with lead time and plain-language explanation."""
    lang = (language or "assamese").lower()
    val_str = f"{predicted_value:.1f}"
    h_str = f"{lead_time_hours}"

    if lang == "assamese":
        msg = (
            f"AI আগজাননী ({severity.upper()}): {village_name}ত প্ৰায় {h_str} ঘণ্টাৰ ভিতৰত "
            f"পানীৰ মাত্ৰা {val_str}{unit} পোৱাৰ সম্ভাৱনা আছে। কাৰণ: {explanation}"
        )
    elif lang == "bodo":
        msg = (
            f"AI सिगां खौरां ({severity.upper()}): {village_name} आव {h_str} घन्टायाव "
            f"दैनि बिबाङा {val_str}{unit} मोनहैनायनि खौरां। जाहोन: {explanation}"
        )
    elif lang == "bengali":
        msg = (
            f"AI পূর্বাভাস ({severity.upper()}): {village_name}-এ প্রায় {h_str} ঘণ্টার মধ্যে "
            f"জলস্তর {val_str}{unit} পৌঁছানোর আশঙ্কা রয়েছে। কারণ: {explanation}"
        )
    elif lang == "hindi":
        msg = (
            f"AI पूर्वानुमान ({severity.upper()}): {village_name} में लगभग {h_str} घंटे में "
            f"जल स्तर {val_str}{unit} पहुँचने की संभावना है। कारण: {explanation}"
        )
    else:  # english fallback
        plural = "s" if lead_time_hours != 1 else ""
        msg = (
            f"AI Early Warning ({severity.upper()}): Water level in {village_name} is expected to reach "
            f"{val_str}{unit} in about {h_str} hour{plural}. Reason: {explanation}"
        )

    return msg
