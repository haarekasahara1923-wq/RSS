import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireFeature } from '@/app/api/middleware'

async function fetchFromGroq(systemContent: string, userContent: string) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not configured in environment variables")
    }

    // Try primary Groq model, fallback to secondary Groq model if needed
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
                    response_format: { type: "json_object" },
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

    throw lastError || new Error("Failed to generate response from Groq API")
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    // Feature gate check: User needs Pro/Elite plan for AI tools
    const featureCheck = await requireFeature(req, 'aiTools')
    if (featureCheck.error) return featureCheck.error

    try {
        const body = await req.json()
        const { subject, topic, count = 5, difficulty = 'MEDIUM', type = 'MCQ' } = body

        if (!subject) {
            return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
        }

        const systemContent = `You are an expert ${subject} teacher creating school exams for Universal Day Boarding Academy. You must output a JSON object containing a property 'questions' which is an array of ${count} objects. Each object must precisely match this format: { "subject": "${subject}", "topic": "${topic || subject}", "questionText": "Question text here", "type": "${type}", "options": ["Option A", "Option B", "Option C", "Option D"], "correctAnswer": "Exact matching string from options array", "marks": ${difficulty === 'HARD' ? 4 : difficulty === 'EASY' ? 1 : 2}, "difficulty": "${difficulty}", "explanation": "Explanation for the answer" }. For DESCRIPTIVE type, you can leave options array empty and correctAnswer empty.`

        const userContent = `Generate ${count} ${difficulty} level ${type} questions for the subject ${subject} on the topic of ${topic || 'general syllabus'}. Ensure the JSON output strictly follows the requested structure.`

        const { data, model } = await fetchFromGroq(systemContent, userContent)

        const rawContent = data.choices[0]?.message?.content
        if (!rawContent) {
            throw new Error("No response generated from Groq AI")
        }

        const parsedData = JSON.parse(rawContent)

        // Handle variations in AI output shapes
        const questions = parsedData.questions || parsedData.data || parsedData

        return NextResponse.json({
            success: true,
            data: Array.isArray(questions) ? questions : [parsedData],
            provider: `Groq AI (${model})`,
            message: `Generated ${Array.isArray(questions) ? questions.length : 1} ${type} questions for ${subject} using Groq AI`,
        })
    } catch (error: any) {
        console.error('AI question generation error:', error)
        return NextResponse.json({ 
            error: error?.message || 'Failed to generate questions. Please check Groq API configuration or try again.' 
        }, { status: 500 })
    }
}
