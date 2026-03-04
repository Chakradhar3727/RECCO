import { Resend } from 'resend';

// Initialize the Resend client
const resend = new Resend(process.env.RESEND_API_KEY!);

interface SendEmailParams {
    to: string | string[];
    subject: string;
    html: string;
}

/**
 * Sends a transactional email using Resend.
 * Defaults the from address to updates@recco.in (or whatever domain has been verified on Resend).
 */
export async function sendTransactionalEmail({ to, subject, html }: SendEmailParams) {
    try {
        // Note: For testing the prototype, verify the sender domain or use the default Resend testing email wrapper
        const { data, error } = await resend.emails.send({
            from: 'RECCO Updates <onboarding@resend.dev>', // Usually, you use your own verified domain here
            to,
            subject,
            html,
        });

        if (error) {
            console.error('Failed to send email:', error);
            return { success: false, error };
        }

        console.log('Email sent successfully:', data);
        return { success: true, data };
    } catch (err) {
        console.error('Unexpected error while sending email:', err);
        return { success: false, error: err };
    }
}
