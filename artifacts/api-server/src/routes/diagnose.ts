import { Router, type IRouter } from 'express';
import { DiagnoseVehicleBody, DiagnoseVehicleResponse } from '@workspace/api-zod';

const router: IRouter = Router();

router.post('/diagnose', async (req, res) => {
  const parsed = DiagnoseVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  const { description } = parsed.data;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    req.log.error('GEMINI_API_KEY is not configured');
    res.status(500).json({ error: 'AI service not configured' });
    return;
  }

  const prompt = `You are an expert vehicle mechanic and diagnostics specialist with extensive experience in Nigerian road conditions. You are familiar with vehicles commonly used in Nigeria: Toyota, Honda, Nissan, Volkswagen, Hyundai, KIA, Ford, and others.

A vehicle owner has described the following issue:
"${description}"

Provide a clear, structured diagnostic response with these sections:

1. MOST LIKELY CAUSES (ranked by probability)
2. RECOMMENDED IMMEDIATE ACTIONS
3. ESTIMATED COST RANGE (in Nigerian Naira ₦)
4. URGENCY LEVEL: Critical / High / Medium / Low
5. SAFETY WARNINGS (if any)

Be practical and actionable. Use plain language suitable for a Nigerian vehicle owner. Reference local parts availability where relevant.`;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      req.log.error({ status: geminiRes.status, body: errText }, 'Gemini API error');
      res.status(502).json({ error: 'AI service returned an error' });
      return;
    }

    const geminiData = (await geminiRes.json()) as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };

    const result =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No diagnosis available.';

    const data = DiagnoseVehicleResponse.parse({ result });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, 'Failed to call Gemini API');
    res.status(500).json({ error: 'Failed to process diagnosis' });
  }
});

export default router;
