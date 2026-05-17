const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "";

const MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-pro",
  "gemini-3.1-pro",
  "gemini-3-flash-preview",
];

const getGeminiUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are a helpful support assistant for UI-Ride, a campus ride-hailing app at the University of Ibadan, Nigeria. 

Key information:
- Passengers can request rides by selecting pickup and destination locations
- Passengers propose a fare, drivers can accept or counter-offer
- Payment methods: Cash or Card (via Paystack)
- Drivers must register with vehicle details and bank account
- Users have a 6-digit PIN for security
- Rides can be cancelled by either party before the trip starts
- After a trip, passengers pay and can rate the driver

Keep responses concise, friendly, and helpful. If you don't know something specific about the app, say so honestly. Don't make up features that don't exist.`;

interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

let conversationHistory: GeminiMessage[] = [];

const tryModel = async (
  model: string,
  contents: GeminiMessage[],
): Promise<{ ok: boolean; reply?: string; retryable: boolean }> => {
  try {
    const response = await fetch(getGeminiUrl(model), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents,
      }),
    });

    if (response.status === 429) {
      return { ok: false, retryable: true };
    }

    if (response.status === 404) {
      return { ok: false, retryable: true };
    }

    if (!response.ok) {
      const error = await response.text();
      console.error(`Gemini ${model} error:`, error);
      return { ok: false, retryable: true };
    }

    const data = await response.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Sorry, I could not process your request.";

    return { ok: true, reply, retryable: false };
  } catch (error) {
    console.error(`Gemini ${model} fetch error:`, error);
    return { ok: false, retryable: false };
  }
};

export const sendChatMessage = async (message: string): Promise<string> => {
  conversationHistory.push({
    role: "user",
    parts: [{ text: message }],
  });

  // Try each model in order
  for (const model of MODELS) {
    const result = await tryModel(model, conversationHistory);

    if (result.ok && result.reply) {
      conversationHistory.push({
        role: "model",
        parts: [{ text: result.reply }],
      });

      if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-16);
      }

      return result.reply;
    }

    if (!result.retryable) break;

    console.log(`Model ${model} unavailable, trying next...`);
  }

  // All models failed
  conversationHistory.pop();
  return "I'm currently unavailable. Please check the FAQ tab for common questions, or try again in a moment.";
};

export const clearChatHistory = () => {
  conversationHistory = [];
};
