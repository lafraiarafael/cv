export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { baseCV, jobDescription, targetRole } = req.body || {};

    if (!baseCV || !jobDescription) {
      return res.status(400).json({ error: 'Missing baseCV or jobDescription' });
    }

    const prompt = `
You are an expert recruiter and CV writer.

Your task is to adapt the candidate CV to the pasted job description.
You must improve match quality for ATS and human recruiters, but NEVER invent experience, education, certifications, languages, companies, dates, or tools the candidate does not actually have.

Rules:
- Keep everything truthful.
- Prioritize the most relevant experience and skills for the job.
- Improve wording so it sounds natural, strong, and specific.
- Emphasize both technical and soft-skill requirements from the vacancy.
- If the vacancy is in Dutch, write the output in Dutch.
- If the vacancy is in English, write the output in English.
- Make the title closer to the target role when appropriate.
- Create a concise, high-quality summary.
- Select only the most relevant skills.
- Reorder and rewrite bullets for relevance.
- Add analysis with strengths, gaps, and notes.
- Create a short cover letter.

Return ONLY valid JSON with this exact shape:
{
  "name": string,
  "title": string,
  "location": string,
  "email": string,
  "phone": string,
  "summary": string[],
  "skills": string[],
  "experience": [
    {
      "role": string,
      "meta": string,
      "bullets": string[]
    }
  ],
  "education": string[],
  "languages": string[],
  "analysis": {
    "strengths": string[],
    "gaps": string[],
    "notes": string[]
  },
  "coverLetter": string,
  "lang": string
}

Base CV:
${JSON.stringify(baseCV, null, 2)}

Target role:
${targetRole || ""}

Job Description:
${jobDescription}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: 'You are a precise recruiter assistant that returns only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'OpenAI API error',
        details: data
      });
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'Empty response from OpenAI' });
    }

    const parsed = JSON.parse(content);
    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({
      error: 'Server error',
      details: String(error)
    });
  }
}
