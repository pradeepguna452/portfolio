import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// IMPORTANT: We must use the SERVICE ROLE KEY here to bypass RLS, 
// because a Cron Job does not run on behalf of a specific logged-in user.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    // 1. Authorization check for Vercel Cron (Optional but recommended)
    const authHeader = request.headers.get('Authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('--- STARTING DAILY CRON JOB ---');

    // Calculate dates
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10); // YYYY-MM-DD

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY is not set. Emails will be mocked.');
    }

    let emailsSent = 0;

    // --- 1. CHECK ITEMS EXPIRING TOMORROW ---
    const { data: items, error: itemsErr } = await supabase
      .from('items')
      .select('id, name, notify_email')
      .eq('notified', false)
      .eq('expires_on', tomorrowStr)
      .not('notify_email', 'is', null)
      .neq('notify_email', '');

    if (itemsErr) {
      console.error('Error fetching items:', itemsErr);
    } else if (items && items.length > 0) {
      for (const item of items) {
        if (!item.notify_email) continue;

        const html = `<h2>Item Expiring Tomorrow!</h2><p>Your tracked item <b>${item.name}</b> expires on ${tomorrowStr}.</p>`;
        
        if (apiKey) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Acme <onboarding@resend.dev>',
              to: [item.notify_email],
              subject: `Reminder: ${item.name} expires tomorrow!`,
              html
            })
          });
        } else {
          console.log(`[Mock Email to ${item.notify_email}]: ${item.name} expires tomorrow!`);
        }

        // Mark as notified
        await supabase.from('items').update({ notified: true }).eq('id', item.id);
        emailsSent++;
      }
    }

    // --- 2. CHECK REMINDERS DUE TOMORROW ---
    // Reminders use ISO datetime, so we check if the date part matches tomorrow
    const { data: reminders, error: remindersErr } = await supabase
      .from('reminders')
      .select('id, title, remind_at, notify_email')
      .eq('notified', false)
      .eq('done', false)
      .not('notify_email', 'is', null)
      .neq('notify_email', '')
      .like('remind_at', `${tomorrowStr}%`); // Matches anything starting with YYYY-MM-DD

    if (remindersErr) {
      console.error('Error fetching reminders:', remindersErr);
    } else if (reminders && reminders.length > 0) {
      for (const reminder of reminders) {
        if (!reminder.notify_email) continue;

        const timeStr = new Date(reminder.remind_at).toLocaleTimeString();
        const html = `<h2>Upcoming Reminder</h2><p>Your task <b>${reminder.title}</b> is scheduled for tomorrow at ${timeStr}.</p>`;
        
        if (apiKey) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Acme <onboarding@resend.dev>',
              to: [reminder.notify_email],
              subject: `Reminder: ${reminder.title} is due tomorrow!`,
              html
            })
          });
        } else {
          console.log(`[Mock Email to ${reminder.notify_email}]: ${reminder.title} due tomorrow!`);
        }

        // Mark as notified
        await supabase.from('reminders').update({ notified: true }).eq('id', reminder.id);
        emailsSent++;
      }
    }

    console.log(`--- CRON JOB FINISHED. Sent ${emailsSent} emails. ---`);
    return NextResponse.json({ success: true, emailsSent });

  } catch (error) {
    console.error('Cron API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
