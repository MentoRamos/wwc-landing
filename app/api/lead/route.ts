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
        // Only the status: a Postgres constraint error echoes the offending
        // value back, which here would be the lead's own email.
        console.error('Supabase rejected the lead insert. status=%d', res.status);
        return Response.json({ error: 'Failed to save lead' }, { status: 500 });
      }
    } else {
      // Never log the lead itself: name, email and whatsapp are personal data.
      console.warn('Lead received but Supabase is not configured; nothing was stored.');
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
