export type Lang = "en" | "ta" | "hi";

export const LANGS: { code: Lang; label: string; speech: string }[] = [
  { code: "en", label: "English", speech: "en" },
  { code: "ta", label: "தமிழ்", speech: "ta" },
  { code: "hi", label: "हिन्दी", speech: "hi" },
];

interface Strings {
  yourResult: string;
  delivered: string;
  play: string;
  playing: string;
  noVoice: string;
  audioFail: string;
  referredTo: string;
  hospital: string;
  dept: string;
  directions: string;
  remind: string;
  done: string;
  headline: [string, string, string];
  spoken: [string, string, string];
}

export const STRINGS: Record<Lang, Strings> = {
  en: {
    yourResult: "Your result",
    delivered: "Spoken in your language",
    play: "Play spoken explanation",
    playing: "Playing...",
    noVoice: "This phone has no English voice installed.",
    audioFail: "Audio could not be played.",
    referredTo: "Referred to",
    hospital: "Govt. Hospital, Chengalpattu",
    dept: "Dental OPD · Tue and Thu",
    directions: "Directions",
    remind: "Remind me",
    done: "Done",
    headline: [
      "No problem found. Screen again in a year",
      "Come back for a recheck in 4 weeks",
      "See a doctor within 7 days",
    ],
    spoken: [
      "We did not find anything worrying. Please get screened again in a year, and avoid tobacco.",
      "We saw a small change. It is not urgent. Please come back in four weeks so we can check again. Avoid tobacco until then.",
      "We found a change in your mouth that needs a doctor's check. Please visit the Government Hospital in Chengalpattu, Dental OPD, on Tuesday or Thursday, within seven days. This is not a diagnosis.",
    ],
  },
  ta: {
    yourResult: "உங்கள் முடிவு",
    delivered: "உங்கள் மொழியில் ஒலி வடிவில்",
    play: "விளக்கத்தைக் கேளுங்கள்",
    playing: "ஒலிக்கிறது...",
    noVoice: "இந்த தொலைபேசியில் தமிழ் குரல் நிறுவப்படவில்லை.",
    audioFail: "ஒலியை இயக்க முடியவில்லை.",
    referredTo: "பரிந்துரைக்கப்பட்ட இடம்",
    hospital: "செங்கல்பட்டு அரசு மருத்துவமனை",
    dept: "பல் மருத்துவப் பிரிவு · செவ்வாய், வியாழன்",
    directions: "வழி",
    remind: "நினைவூட்டு",
    done: "முடிந்தது",
    headline: [
      "பிரச்சனை எதுவும் இல்லை. ஒரு வருடத்தில் மீண்டும் பரிசோதிக்கவும்",
      "4 வாரங்களில் மீண்டும் பரிசோதனைக்கு வாருங்கள்",
      "7 நாட்களுக்குள் மருத்துவரைப் பாருங்கள்",
    ],
    spoken: [
      "கவலைப்படும்படி எதுவும் இல்லை. ஒரு வருடத்தில் மீண்டும் பரிசோதனை செய்யுங்கள், புகையிலையைத் தவிர்க்கவும்.",
      "ஒரு சிறிய மாற்றம் தெரிகிறது. அவசரம் இல்லை. நான்கு வாரங்களில் மீண்டும் வாருங்கள், நாங்கள் மறுபடி பார்ப்போம். அதுவரை புகையிலையைத் தவிர்க்கவும்.",
      "உங்கள் வாயில் மருத்துவர் பரிசோதிக்க வேண்டிய ஒரு மாற்றம் தெரிகிறது. தயவுசெய்து ஏழு நாட்களுக்குள் செங்கல்பட்டு அரசு மருத்துவமனையின் பல் மருத்துவப் பிரிவுக்கு, செவ்வாய் அல்லது வியாழக்கிழமை வாருங்கள். இது நோய் உறுதிப்படுத்தல் அல்ல.",
    ],
  },
  hi: {
    yourResult: "आपका परिणाम",
    delivered: "आपकी भाषा में ऑडियो",
    play: "समझाइश सुनें",
    playing: "चल रहा है...",
    noVoice: "इस फोन में हिन्दी आवाज़ इंस्टॉल नहीं है।",
    audioFail: "ऑडियो चलाया नहीं जा सका।",
    referredTo: "यहां भेजा गया",
    hospital: "चेंगलपट्टू सरकारी अस्पताल",
    dept: "दंत विभाग · मंगलवार, गुरुवार",
    directions: "रास्ता",
    remind: "याद दिलाएं",
    done: "हो गया",
    headline: [
      "कोई समस्या नहीं मिली। एक साल बाद फिर जांच कराएं",
      "4 हफ्ते बाद दोबारा जांच के लिए आएं",
      "7 दिन के अंदर डॉक्टर को दिखाएं",
    ],
    spoken: [
      "कोई चिंता की बात नहीं मिली। एक साल बाद फिर जांच कराएं और तंबाकू से बचें।",
      "एक छोटा बदलाव दिखा है। यह जरूरी नहीं है। कृपया चार हफ्ते बाद दोबारा आएं ताकि हम फिर से जांच सकें। तब तक तंबाकू से बचें।",
      "आपके मुंह में एक बदलाव दिखा है जिसे डॉक्टर को दिखाना जरूरी है। कृपया सात दिन के अंदर चेंगलपट्टू सरकारी अस्पताल के दंत विभाग में मंगलवार या गुरुवार को आएं। यह बीमारी की पुष्टि नहीं है।",
    ],
  },
};

export function findVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  if (typeof speechSynthesis === "undefined") return undefined;
  const prefix = LANGS.find((l) => l.code === lang)!.speech;
  return speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(prefix));
}
