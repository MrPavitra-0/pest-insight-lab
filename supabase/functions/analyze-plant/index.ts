import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getSystemPrompt = (language: string) => {
  const languageNames: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    pt: 'Portuguese',
    zh: 'Chinese',
    hi: 'Hindi',
    ar: 'Arabic',
    pa: 'Punjabi'
  };
  
  const targetLanguage = languageNames[language] || 'English';
  
  return `You are an agricultural plant health expert specializing in pest and disease detection from leaf and plant images.

IMPORTANT: You MUST respond entirely in ${targetLanguage}. All text in your response must be in ${targetLanguage}.

You must:
1️⃣ Carefully analyze ONLY the uploaded image.
2️⃣ Describe what you see visually: leaf color, spots, holes, insects, fungi patterns, etc.
3️⃣ Identify the MOST LIKELY cause: pest species OR plant disease OR "Healthy/Unknown" if unclear.
4️⃣ Provide confidence percentages based on visual evidence.
5️⃣ Include 2 alternative possibilities if confidence is below 95%.
6️⃣ Provide a short recommended action or treatment based on the diagnosis.

Output Format (strictly follow, but ALL text values must be in ${targetLanguage}):
{
 "detected_issue": "<Primary Detected Disease/Pest/Healthy in ${targetLanguage}>",
 "confidence": "<0-100>%",
 "explanation": "<What visual evidence led you to this conclusion - in ${targetLanguage}>",
 "recommended_treatment": "<Action steps or 'No treatment needed if healthy' - in ${targetLanguage}>",
 "alternative_detections": [
     {"issue": "<Option 1 in ${targetLanguage}>", "confidence": "<%>"},
     {"issue": "<Option 2 in ${targetLanguage}>", "confidence": "<%>"}
 ]
}

Do NOT provide generic or repeated results.  
If the visual evidence does not clearly match wheat rust, DO NOT diagnose wheat rust.  
Only use information visible in the image — no assumptions.
Always respond with valid JSON only, no markdown formatting.
Remember: ALL text content must be in ${targetLanguage}.`;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { imageBase64, language = 'en' } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing plant image in language:', language);

    // Call Lovable AI with vision capabilities
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: getSystemPrompt(language)
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this plant image and provide your diagnosis in the specified JSON format.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    console.log('AI Response received:', aiResponse.substring(0, 200));

    // Parse the JSON response from AI
    let analysisResult;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = aiResponse.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.slice(7);
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }
      cleanedResponse = cleanedResponse.trim();
      
      analysisResult = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Return a structured error response
      analysisResult = {
        detected_issue: "Analysis Error",
        confidence: "0%",
        explanation: "Could not parse the AI response. Raw response: " + aiResponse.substring(0, 200),
        recommended_treatment: "Please try uploading the image again.",
        alternative_detections: []
      };
    }

    // Transform to frontend format
    const confidenceValue = parseFloat(analysisResult.confidence?.replace('%', '') || '0') / 100;
    
    const results = [
      {
        class_name: analysisResult.detected_issue?.toLowerCase().replace(/\s+/g, '_') || 'unknown',
        display_name: analysisResult.detected_issue || 'Unknown',
        confidence: confidenceValue,
        treatment: analysisResult.recommended_treatment || 'No treatment specified',
        explanation: analysisResult.explanation || ''
      }
    ];

    // Add alternative detections
    if (analysisResult.alternative_detections && Array.isArray(analysisResult.alternative_detections)) {
      for (const alt of analysisResult.alternative_detections) {
        const altConfidence = parseFloat(alt.confidence?.replace('%', '') || '0') / 100;
        results.push({
          class_name: alt.issue?.toLowerCase().replace(/\s+/g, '_') || 'alternative',
          display_name: alt.issue || 'Alternative',
          confidence: altConfidence,
          treatment: '',
          explanation: ''
        });
      }
    }

    console.log('Analysis complete, returning results');

    return new Response(JSON.stringify({ 
      predictions: results,
      raw_analysis: analysisResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-plant function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
