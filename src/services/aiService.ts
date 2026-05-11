import { ReportCategory } from "@/types/report";

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export type ReportPriority = "low" | "medium" | "high";

export interface ReportSummaryResult {
  summary: string;
  priority: ReportPriority;
  recommendedAction: string;
}

export interface ReportSummaryInput {
  category: ReportCategory;
  description: string;
  reporterUserType: "passenger" | "driver";
  reportedUserType: "passenger" | "driver" | null;
  rideContext?: {
    pickup: string;
    dropoff: string;
    fare: number;
  } | null;
}

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  safety: "Safety Concern",
  lost_item: "Lost Item",
  driver_misconduct: "Driver Misconduct",
  payment_dispute: "Payment Dispute",
  other: "Other",
};

export const generateReportSummary = async (
  input: ReportSummaryInput,
): Promise<ReportSummaryResult> => {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured");
  }

  const {
    category,
    description,
    reporterUserType,
    reportedUserType,
    rideContext,
  } = input;

  const rideContextText = rideContext
    ? `The incident occurred during a trip from "${rideContext.pickup}" to "${rideContext.dropoff}" with an agreed fare of NGN ${rideContext.fare.toLocaleString()}.`
    : "No specific trip was linked to this report.";

  const reportedUserText = reportedUserType
    ? `The reported user is a ${reportedUserType}.`
    : "No specific user was reported.";

  const prompt = `You are an admin assistant for UI-Ride, a campus ride-hailing app at the University of Ibadan, Nigeria. Review the following incident report and respond with a JSON object only — no markdown, no explanation, just the raw JSON.

  Report category: ${CATEGORY_LABELS[category]}
  Filed by: ${reporterUserType}
  ${reportedUserText}
  ${rideContextText}

  Description:
  ${description}

  Respond with exactly this JSON structure:
  {
    "summary": "A concise 1-2 sentence plain-language summary of what happened",
    "priority": "low" | "medium" | "high",
    "recommendedAction": "A short, specific action the admin should take"
  }

  Priority guidelines:
  - high: safety threats, physical harm, serious misconduct
  - medium: payment disputes, repeated misconduct, unresolved lost items
  - low: minor issues, unclear reports, first-time minor complaints`;

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 256,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API request failed with status ${response.status}`);
  }

  const data = await response.json();

  const rawText: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Strip any accidental markdown fences before parsing
  const cleaned = rawText.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned) as {
    summary: string;
    priority: string;
    recommendedAction: string;
  };

  const priority: ReportPriority =
    parsed.priority === "high"
      ? "high"
      : parsed.priority === "medium"
        ? "medium"
        : "low";

  return {
    summary: parsed.summary ?? "No summary available.",
    priority,
    recommendedAction:
      parsed.recommendedAction ?? "Review the report manually.",
  };
};
