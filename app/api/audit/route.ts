import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Initialize external clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agencyId, prospectUrl, prospectEmail } = body;

    // 1. Validation
    if (!agencyId || !prospectUrl || !prospectEmail) {
      return NextResponse.json(
        { error: "Missing required fields: agencyId, prospectUrl, prospectEmail" },
        { status: 400 }
      );
    }

    // Standardize URL formatting
    let targetUrl = prospectUrl.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = `https://${targetUrl}`;
    }

    // 2. Fetch Audit Data from Google PageSpeed Insights API
    const apiKey = process.env.PAGESPEED_API_KEY;
    const pageSpeedApiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      targetUrl
    )}&category=PERFORMANCE&category=SEO&category=ACCESSIBILITY&key=${apiKey}`;

    const apiResponse = await fetch(pageSpeedApiUrl);
    if (!apiResponse.ok) {
      throw new Error(`Google PageSpeed API Error: ${apiResponse.statusText}`);
    }

    const auditResult = await apiResponse.json();
    const categories = auditResult.lighthouseResult?.categories;

    const scores = {
      performance: Math.round((categories?.performance?.score || 0) * 100),
      seo: Math.round((categories?.seo?.score || 0) * 100),
      accessibility: Math.round((categories?.accessibility?.score || 0) * 100),
    };

    // 3. Save Lead to Supabase Database
    const { data: dbData, error: dbError } = await supabase
      .from("leads")
      .insert([
        {
          agency_id: agencyId,
          prospect_url: targetUrl,
          prospect_email: prospectEmail,
          performance_score: scores.performance,
          seo_score: scores.seo,
          accessibility_score: scores.accessibility,
        },
      ])
      .select();

    if (dbError) {
      console.error("Database Insert Error:", dbError);
    }

    // 4. Send Email Audit Summary via Resend
    await resend.emails.send({
      from: process.env.SENDER_EMAIL || "onboarding@resend.dev",
      to: prospectEmail,
      subject: `Your Website Audit Report for ${new URL(targetUrl).hostname}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Website Audit Summary</h2>
          <p>Here are the initial lighthouse scores for <strong>${targetUrl}</strong>:</p>
          <ul>
            <li><strong>Performance:</strong> ${scores.performance}/100</li>
            <li><strong>SEO Score:</strong> ${scores.seo}/100</li>
            <li><strong>Accessibility:</strong> ${scores.accessibility}/100</li>
          </ul>
          <p>Our team will follow up shortly to help you fix these performance bottlenecks!</p>
        </div>
      `,
    });

    // 5. Return success response to the frontend widget
    return NextResponse.json({
      success: true,
      scores,
      message: "Audit generated and emailed successfully.",
    });
  } catch (error: any) {
    console.error("Audit API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
