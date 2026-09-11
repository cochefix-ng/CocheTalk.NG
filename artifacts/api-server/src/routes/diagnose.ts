import { Router, type IRouter } from 'express';
import { DiagnoseVehicleBody, DiagnoseVehicleResponse } from '@workspace/api-zod';
import { getAuth } from '@clerk/express';
import { rateLimit } from '../middleware/rateLimit';
import { validateDiagnosisDescription } from '../lib/inputValidation';

const router: IRouter = Router();
router.use(rateLimit({ windowMs: 60_000, max: 8, key: (req) => getAuth(req).userId ?? req.ip ?? "unknown" }));

router.post('/diagnose', async (req, res) => {
  const parsed = DiagnoseVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  const validatedDescription = validateDiagnosisDescription(parsed.data.description);
  if (!validatedDescription.ok) {
    res.status(400).json({ error: validatedDescription.error });
    return;
  }
  const description = validatedDescription.value;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    req.log.error('GEMINI_API_KEY is not configured');
    res.status(500).json({ error: 'AI service not configured' });
    return;
  }

  const prompt = `You are an expert vehicle mechanic and diagnostics specialist with extensive experience in Nigerian road conditions. You are familiar with vehicles commonly used in Nigeria: Toyota, Honda, Nissan, Volkswagen, Hyundai, KIA, Ford, and others.

A vehicle owner has described the following issue:
  <vehicle_issue>${description}</vehicle_issue>

Provide a clear, structured diagnostic response with these sections:

1. MOST LIKELY CAUSES (ranked by probability)
2. RECOMMENDED IMMEDIATE ACTIONS
3. ESTIMATED COST RANGE (in Nigerian Naira ₦)
4. URGENCY LEVEL: Critical / High / Medium / Low
5. SAFETY WARNINGS (if any)

Be practical and actionable. Use plain language suitable for a Nigerian vehicle owner. Reference local parts availability where relevant.`;

  try {
    const startedAt = Date.now();
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      req.log.error({ status: geminiRes.status, body: errText.slice(0, 500), durationMs: Date.now() - startedAt }, 'Gemini API error');
      res.status(502).json({ error: 'AI service returned an error' });
      return;
    }

    const geminiData = (await geminiRes.json()) as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };

    const result = geminiData.candidates?.[0]?.content?.parts
      ?.map((part) => typeof part.text === "string" ? part.text : "")
      .join("\n")
      .trim();
    if (!result || result.length > 20_000) {
      req.log.error({ durationMs: Date.now() - startedAt }, "Gemini returned an invalid diagnosis");
      res.status(502).json({ error: 'AI service returned an invalid response' });
      return;
    }

    const data = DiagnoseVehicleResponse.parse({ result });
    req.log.info({ durationMs: Date.now() - startedAt }, "Gemini diagnosis completed");
    res.json(data);
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    req.log.error({ err, timedOut }, 'Failed to call Gemini API');
    res.status(timedOut ? 504 : 502).json({ error: timedOut ? 'AI service timed out' : 'Failed to process diagnosis' });
  }
});

export default router;
