import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  whatsapp: z.string().min(10),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    // If Supabase is configured, save to database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const res = await fetch(`${supabaseUrl}/rest/v1/wwc_leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          whatsapp: data.whatsapp,
          source: 'landing-page',
        }),
      });

      if (!res.ok) {
        console.error('Supabase error:', await res.text());
        return Response.json({ error: 'Failed to save lead' }, { status: 500 });
      }
    } else {
      // Log to console when Supabase is not configured
      console.log('New lead (no Supabase):', data);
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
