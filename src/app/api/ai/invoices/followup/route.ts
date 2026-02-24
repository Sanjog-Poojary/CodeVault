import { xai } from '@ai-sdk/xai';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
    clientName: z.string(),
    invoiceRef: z.string(),
    amount: z.number(),
    dueDate: z.string(),
    daysPastDue: z.number(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { clientName, invoiceRef, amount, dueDate, daysPastDue } = schema.parse(body);

        const { text } = await generateText({
            model: xai('grok-2-1212'),
            system: `Write as a professional consultant. Factual, brief, polite. 
Do not use phrases like 'just following up' or 'hope you are well'. 
Reference the invoice number and exact amount. 
Include a single, specific call-to-action.
Maximum 150 words. Plain text only. No markdown.`,
            prompt: `Draft a payment follow-up for: Client: ${clientName} | Invoice: ${invoiceRef} | Amount: ₹${amount.toLocaleString('en-IN')} | Due: ${dueDate} | ${daysPastDue} days past due`,
        });

        return NextResponse.json({ draft: text.trim() });
    } catch (err) {
        console.error('[AI Followup]', err);
        return NextResponse.json({ draft: 'AI service unavailable. Please draft follow-up manually.' }, { status: 200 });
    }
}
