import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import { adminDb } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  const { type, role, level, techstack, amount, userid } = await request.json();
  const validatedAmount = Math.min(parseInt(amount) || 5, 20);

  try {
    const { text: questions } = await generateText({
      model: google("gemini-flash-latest"),
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${validatedAmount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
        Return the questions formatted like this:
        ["Question 1", "Question 2", "Question 3"]
        
        Thank you! <3
    `,
    });

    const interview = {
      role: role,
      type: type,
      level: level,
      techstack: techstack.split(","),
      questions: JSON.parse(questions),
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    await adminDb.collection("interviews").add(interview);

    return Response.json({ success: true }, { status: 200 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error generating questions:", error);

    // Check if it's a quota error
    if (
      error.statusCode === 429 ||
      (error.data && error.data.error && error.data.error.code === 429)
    ) {
      return Response.json(
        {
          success: false,
          error: {
            name: "AI_QuotaExceededError",
            message:
              "The AI service is currently at capacity or quota limit reached. Please try again in a few moments.",
            details: error.data || error.message,
          },
        },
        { status: 429 },
      );
    }

    return Response.json(
      {
        success: false,
        error: {
          name: error.name || "AI_Error",
          message:
            error.message ||
            "An unexpected error occurred while generating interview questions.",
          details: error,
        },
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}
