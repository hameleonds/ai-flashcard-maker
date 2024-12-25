import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Create multiple-choice flashcards from the given text. Return an array of objects with 'question', 'options' (array of 4 choices), and 'correctAnswer' (index of correct option)."
        },
        {
          role: "user",
          content: text
        }
      ],
    });

    const flashcards = JSON.parse(response.choices[0].message.content || '[]');
    return NextResponse.json({ flashcards });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate flashcards' },
      { status: 500 }
    );
  }
} 