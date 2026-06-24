import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, itemName, expiresOn, value } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const htmlContent = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Asset Registered</h2>
        <p>A new asset has been added to your inventory tracking system.</p>
        <ul>
          <li><strong>Product:</strong> ${itemName}</li>
          <li><strong>Value:</strong> $${value}</li>
          <li><strong>Dead Date (Expiry):</strong> ${expiresOn}</li>
        </ul>
        <p>Thank you for using the Asset Tracker.</p>
      </div>
    `;

    // Try to send via Resend API if key exists
    const apiKey = process.env.RESEND_API_KEY;
    
    if (apiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Acme <onboarding@resend.dev>', // Default testing email for Resend
          to: [email],
          subject: `Asset Tracked: ${itemName}`,
          html: htmlContent
        })
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('Resend API Error:', err);
        return NextResponse.json({ error: 'Failed to send email via Resend' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Email sent via Resend!' });
    } else {
      // Mock email sending
      console.log('--- EMAIL NOTIFICATION TRIGGERED ---');
      console.log(`To: ${email}`);
      console.log(`Subject: Asset Tracked: ${itemName}`);
      console.log(`Body:\n${htmlContent}`);
      console.log('--- END EMAIL ---');
      console.log('Note: To send actual emails, set RESEND_API_KEY in your .env file.');

      return NextResponse.json({ 
        success: true, 
        message: 'Mock email sent! Set RESEND_API_KEY to send real emails.' 
      });
    }

  } catch (error) {
    console.error('Notify API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
