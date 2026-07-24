import { AppError } from "../../shared/errors/app-error.js";

export const chatWithCompanion = async (req, res, next) => {
  console.log("Chat route hit! Prompt:", req.body.prompt);
  try {
    const { prompt } = req.body;
    if (!prompt) {
      throw new AppError("Prompt is required", 400);
    }

    const aiUrl = process.env.PYTHON_AI_SERVICE_URL || "http://127.0.0.1:8000";
    const internalToken = process.env.INTERNAL_SERVICE_TOKEN || "change-me";

    console.log(`Sending to AI Service: ${aiUrl}/internal/v1/chat`);
    const response = await fetch(`${aiUrl}/internal/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": internalToken,
      },
      body: JSON.stringify({ prompt }),
    });

    console.log("AI Service response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Service Error:", errorText);
      throw new AppError("Failed to communicate with AI service", 502);
    }

    const data = await response.json();
    
    return res.status(200).json({
      success: true,
      data: {
        response: data.response,
      },
    });
  } catch (error) {
    next(error);
  }
};
