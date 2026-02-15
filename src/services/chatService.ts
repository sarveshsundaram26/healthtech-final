export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  language?: string;
  actions?: { label: string; action: string }[];
}

export interface UserContext {
  role: string | null;
  latestVitals?: {
    heart_rate?: number | null;
    systolic_bp?: number | null;
    diastolic_bp?: number | null;
    weight?: number | null;
  };
  userName?: string;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export const sendMessage = async (text: string, context?: UserContext): Promise<ChatMessage> => {
  if (!GEMINI_API_KEY) {
    return {
      id: Date.now().toString(),
      text: "AI Configuration Missing: Please add VITE_GEMINI_API_KEY to your .env file.",
      sender: 'ai',
      timestamp: new Date(),
    };
  }

  const vitals = context?.latestVitals;
  const vitalsContext = vitals 
    ? `User Vitals: Heart Rate ${vitals.heart_rate || 'N/A'} bpm, BP ${vitals.systolic_bp || 'N/A'}/${vitals.diastolic_bp || 'N/A'} mmHg, Weight ${vitals.weight || 'N/A'} kg.`
    : "No recent vitals available.";
  
  const systemPrompt = `
    You are an Advanced AI Health Companion for the HealthMonitor app.
    Context:
    - User Name: ${context?.userName || 'User'}
    - User Role: ${context?.role || 'Patient'}
    - ${vitalsContext}

    Instructions:
    1. Be highly professional, empathetic, and health-focused.
    2. Analyze the user's vitals if provided.
    3. Use markdown for formatting (bolding important terms).
    4. Provide actionable health tips.
    5. CRITICAL: If you detect a life-threatening symptom (like severe chest pain or very high BP), advise the user to seek immediate medical help or use the SOS button.
    6. Always include a disclaimer that you are an AI assistant and not a replacement for professional medical advice.
    7. Answer in the language the user speaks to you (Supports English, Spanish, French, Tamil).
    8. You can suggest actions like "Log Vitals", "Emergency SOS", or "View History" if relevant.

    Return the response as a direct message string.
  `;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\nUser Question: ${text}` }]
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[Gemini] API Error Response:', data);
      throw new Error(data.error?.message || `API Error: ${response.status}`);
    }

    let aiResponse = "";
    
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      aiResponse = data.candidates[0].content.parts[0].text;
    } else {
      // Check for safety block or other reason
      const finishReason = data.candidates?.[0]?.finishReason;
      const safetyRatings = data.candidates?.[0]?.safetyRatings;
      const promptFeedback = data.promptFeedback;

      console.error('[Gemini] No content generated.', { finishReason, safetyRatings, promptFeedback });

      if (promptFeedback?.blockReason) {
         throw new Error(`AI blocked config: ${promptFeedback.blockReason}`);
      }
      
      if (finishReason) {
         throw new Error(`AI generation stopped: ${finishReason}`);
      }

      throw new Error("AI returned an empty response without clear error details.");
    }

    // Improved action detection logic (case-insensitive whole word or specific phrases)
    const actions: { label: string; action: string }[] = [];
    const lowerResp = aiResponse.toLowerCase();
    
    if (lowerResp.includes('sos') || lowerResp.includes('emergency')) {
      actions.push({ label: 'Emergency SOS', action: 'trigger_sos' });
    }
    
    // Use word boundaries or more specific checks to avoid matching "apologize"
    const hasLogVitals = /\b(log vitals|track metrics|record vitals)\b/.test(lowerResp);
    if (hasLogVitals) {
      actions.push({ label: 'Log Vitals', action: 'log_vitals' });
    }

    return {
      id: Date.now().toString(),
      text: aiResponse,
      sender: 'ai',
      timestamp: new Date(),
      actions: actions.length > 0 ? actions : undefined
    };
  } catch (error: any) {
    console.error('[Gemini] Fetch Error:', error);
    
    // Check for rate limit or quota exceeded
    const isRateLimit = error.message?.includes('429') || 
                        error.message?.toLowerCase().includes('quota') ||
                        error.message?.toLowerCase().includes('too many requests');

    if (isRateLimit) {
      return {
        id: Date.now().toString(),
        text: "I'm currently receiving too many requests. Please try again in a few moments. (Using cached/mock data for now)",
        sender: 'ai',
        timestamp: new Date(),
      };
    }

    // For other errors, return the actual error
    return {
      id: Date.now().toString(),
      text: `Connection Error: ${error.message || 'Unknown error occurred'}. Please check your internet or API key.`,
      sender: 'ai',
      timestamp: new Date(),
    };
  }
};
