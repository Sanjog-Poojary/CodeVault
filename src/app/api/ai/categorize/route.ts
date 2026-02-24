import { xai } from '@ai-sdk/xai';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
    description: z.string(),
    amount: z.number(),
    currency: z.string().default('INR'),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { description, amount, currency } = schema.parse(body);

        const { text } = await generateText({
            model: xai('grok-2-1212'),
            system: `You are a financial categorization engine for a freelance professional in India. 
Classify the provided expense into exactly one category.
Return ONLY valid JSON matching this exact format:
{
  "category": "<one of: Software, Hardware, Travel, Meals, Marketing, Miscellaneous>",
  "confidence": <number 0.0 to 1.0>,
  "is_deductible": <true or false>,
  "reasoning": "<one sentence explanation>"
}
Tax-deductible categories for Indian freelancers: Software, Hardware, Marketing, Travel (work-related).
Apply strict interpretation. Do not infer intent. Classify on description alone.`,
            prompt: `Expense: "${description}" | Amount: ${currency} ${amount}`,
        });

        const parsed = JSON.parse(text.trim());
        return NextResponse.json(parsed);
    } catch (err) {
        console.error('[AI Categorize]', err);
        return NextResponse.json(
            { category: 'Miscellaneous', confidence: 0, is_deductible: false, reasoning: 'AI unavailable' },
            { status: 200 }
        );
    }
}
