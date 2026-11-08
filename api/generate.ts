import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { LessonGameSchema } from './_schema.js'

// The API key lives only in the server environment (ANTHROPIC_API_KEY).
// Only the lesson title/subject/grade/content are sent; nothing about students.

const SYSTEM = `أنت مصمم ألعاب تعليمية لمعلمين عرب. ستستلم نص درس كتبه المعلم.
قواعد صارمة:
1. استخدم فقط المعلومات الموجودة في نص الدرس. لا تضف أي حقيقة أو تعريف أو رقم غير موجود في النص.
2. حقل source في كل عنصر يجب أن يكون اقتباسًا حرفيًا (أو شبه حرفي) لجملة من الدرس.
3. الإجابات الخاطئة (المشتتات) تكون مصطلحات أو عبارات أخرى من الدرس نفسه، مع التأكد أنها خاطئة فعلًا لهذا السؤال.
4. الشرح (explanation) قصير وواضح ويعلّم الطالب سبب صحة الإجابة، بالاعتماد على الدرس.
5. اكتب بالعربية الفصحى المبسطة المناسبة لمستوى الصف المذكور، بجمل قصيرة.
6. mcq: من 6 إلى 14 سؤالًا، لكل سؤال 4 خيارات (أو 3 إذا لم يتوفر أكثر)، و correctIndex يبدأ من 0. simplePrompt نسخة أقصر وأبسط من السؤال.
7. trueFalse: من 6 إلى 12 عبارة، نصفها تقريبًا خاطئ. العبارة الخاطئة تُصنع بتبديل معلومة من الدرس، و correction هي العبارة الصحيحة من الدرس.
8. mistakes: جمل من الدرس استُبدلت فيها كلمة واحدة بكلمة أخرى من الدرس؛ wrong هي الكلمة الموجودة حرفيًا في sentence، و correct هي الأصلية.
9. sequences فقط إذا كان الدرس يذكر مراحل أو خطوات مرتبة فعلًا. classifications فقط إذا ذكر مجموعات وعناصرها.
10. إذا كان الدرس لا يكفي لنوع معين من الألعاب، اترك القائمة فارغة واذكر السبب في insufficient (game: matching | memory | sequence | quiz | true-false | spot-mistake | scramble).
11. لا تذكر أسماء طلاب أو أي بيانات شخصية.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'ai_not_configured' })

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) ?? {}
  const { title = '', subject = '', grade = '', content = '' } = body as Record<string, string>
  if (typeof content !== 'string' || content.trim().length < 40) return res.status(400).json({ error: 'lesson_too_short' })
  if (content.length > 20000) return res.status(413).json({ error: 'lesson_too_long' })

  const client = new Anthropic()
  try {
    const response = await client.messages.parse({
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: 'medium', format: zodOutputFormat(LessonGameSchema) },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `عنوان الدرس: ${title}\nالمادة: ${subject}\nالصف: ${grade}\n\n<lesson>\n${content}\n</lesson>`,
        },
      ],
    })
    if (response.stop_reason === 'refusal') return res.status(422).json({ error: 'refused' })
    if (!response.parsed_output) return res.status(502).json({ error: 'invalid_output' })
    return res.status(200).json({ model: response.model, result: response.parsed_output })
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'rate_limited' })
    if (error instanceof Anthropic.AuthenticationError) return res.status(503).json({ error: 'ai_auth_failed' })
    if (error instanceof Anthropic.APIError) return res.status(502).json({ error: 'ai_error', status: error.status })
    return res.status(500).json({ error: 'server_error' })
  }
}
