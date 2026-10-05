import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/middleware'

async function fetchFromGroq(systemContent: string, userContent: string) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not configured in environment variables")
    }

    const models = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'groq/compound']
    let lastError = null

    for (const model of models) {
        try {
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: "system", content: systemContent },
                        { role: "user", content: userContent }
                    ],
                    temperature: 0.7,
                })
            })

            if (res.ok) {
                const data = await res.json()
                return { data, model }
            } else {
                const errText = await res.text()
                console.warn(`Groq model ${model} failed:`, errText)
                lastError = new Error(`Groq model ${model} returned ${res.status}: ${errText}`)
            }
        } catch (err: any) {
            console.warn(`Groq request for model ${model} failed:`, err.message)
            lastError = err
        }
    }

    throw lastError || new Error("Failed to generate content from Groq API")
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const body = await req.json()
        const { prompt, contentType } = body

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
        }

        const systemContent = `You are an expert AI Assistant for Universal Day Boarding Academy (UDBA). 
Your task is to generate high-quality educational content based on the user's request. 
The requested content type is: ${contentType}. 
You MUST format your ONLY response in pure, clean HTML code, ready to be rendered in a webpage without ANY markdown syntax or \`\`\`html wrapping.
Use proper HTML tags: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <table>, <tr>, <th>, <td>, <strong>, <em>, <br/>.
For Question Papers or any list-based items, group them nicely. For tabular data, always use standard HTML <table> structure.
DO NOT include <head>, <body>, or <html> tags. Just the internal HTML structure. Make the design aesthetically pleasing using clean inline CSS where helpful.
Important: Never include \\\`\\\`\\\`html at the start or end of your response.`

        const userContent = prompt

        const { data, model } = await fetchFromGroq(systemContent, userContent)

        let rawContent = data.choices[0]?.message?.content
        if (!rawContent) {
            throw new Error("No content generated from Groq AI")
        }

        // Remove markdown codeblock formatting if model included it
        rawContent = rawContent.replace(/```html/gi, "").replace(/```/g, "").trim()

        return NextResponse.json({
            success: true,
            data: rawContent,
            provider: `Groq AI (${model})`
        })
    } catch (error: any) {
        console.error('AI content generation error:', error)
        return NextResponse.json({ 
            error: error?.message || 'Failed to generate content. Please check Groq API configuration or try again.' 
        }, { status: 500 })
    }
}
