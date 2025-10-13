import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

const REPORT_PROMPT = `Generate a comprehensive real estate consultation report based on the following conversation data.

The report should include:
1. Executive Summary
2. Customer Profile
3. Property Requirements
4. Conversation Highlights
5. Recommendations
6. Next Steps

Format the report in clean HTML with proper headings, lists, and styling. Use professional language and include all relevant details from the data provided.

Conversation Data:
{data}

Generate a well-structured HTML report (without <!DOCTYPE> or <html> tags, just the body content).`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const reportId = url.searchParams.get('id');

    // GET request - retrieve existing report
    if (req.method === 'GET' && reportId) {
      const { data: report, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error || !report) {
        return new Response(
          JSON.stringify({ error: 'Report not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(report),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST request - generate new report
    const { conversationId, leadId, reportType } = await req.json();

    if (!conversationId && !leadId) {
      return new Response(
        JSON.stringify({ error: 'Either conversationId or leadId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Generate Report] Creating report for:', { conversationId, leadId, reportType });

    // Fetch conversation data
    let conversationData: any = null;
    if (conversationId) {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('[Generate Report] Conversation fetch error:', error);
        throw new Error('Failed to fetch conversation data');
      }

      conversationData = data;
    }

    // Fetch lead data
    let leadData: any = null;
    if (leadId) {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          activities (
            type,
            message,
            created_at
          )
        `)
        .eq('id', leadId)
        .single();

      if (error) {
        console.log('[Generate Report] Lead fetch warning:', error.message);
      } else {
        leadData = data;
      }
    }

    // Combine data for report generation
    const reportData = {
      conversation: conversationData,
      lead: leadData,
      reportType: reportType || 'consultation',
      generatedAt: new Date().toISOString()
    };

    // Generate report using OpenAI
    console.log('[Generate Report] Calling OpenAI for report generation');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional real estate report writer. Generate comprehensive, well-formatted HTML reports.'
          },
          {
            role: 'user',
            content: REPORT_PROMPT.replace('{data}', JSON.stringify(reportData, null, 2))
          }
        ],
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('[Generate Report] OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error}`);
    }

    const openaiData = await openaiResponse.json();
    const reportHtml = openaiData.choices[0].message.content;

    console.log('[Generate Report] Report generated, length:', reportHtml.length);

    // Save report to database
    const { data: savedReport, error: saveError } = await supabase
      .from('reports')
      .insert({
        conversation_id: conversationId || null,
        lead_id: leadId || null,
        report_type: reportType || 'consultation',
        content_html: reportHtml,
        generated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('[Generate Report] Database save error:', saveError);
      throw saveError;
    }

    console.log('[Generate Report] Report saved:', savedReport.id);

    return new Response(
      JSON.stringify({
        success: true,
        report: savedReport
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Generate Report] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
