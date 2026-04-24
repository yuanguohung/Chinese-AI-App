import OpenAI from 'openai';

export const createAiClient = (apiKey, baseURL) => {
  return new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL || undefined, // fallback to default openai if empty
    dangerouslyAllowBrowser: true // Required for client-side API calls
  });
};

export const chatWithAI = async (client, messages, model) => {
  try {
    const response = await client.chat.completions.create({
      model: model || 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("AI API Error:", error);
    throw error;
  }
};
