
class EnhancedOCRService {
  constructor() {
    this.apiKey = localStorage.getItem('openai_api_key');
    this.model = localStorage.getItem('openai_model') || 'gpt-4o';
  }

  async analyzeRecordImages(imageFiles) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured. Please add it in Settings.');
    }

    const base64Images = await Promise.all(
      imageFiles.map(file => this.fileToBase64(file))
    );

    const messages = [
      {
        role: 'system',
        content: `You are a vinyl record identification expert with advanced OCR capabilities specializing in pressing identification. Analyze record images and extract all visible information with special attention to first press vs reissue identification.

CRITICAL - Pressing Identification Rules:
1. DEADWAX/MATRIX ANALYSIS IS ESSENTIAL - Look for:
   - Hand-etched vs machine-stamped matrix numbers (hand-etched often indicates early pressings)
   - Plant identifiers: "STERLING", "RL", "PORKY", "TML", "EMI", "CBS"
   - Mastering engineer initials or signatures
   - "A1", "B1" stampings indicate first stamper/cut
   - "-" or "/" separators in matrix numbers
   - Additional letters after main catalog number (e.g., "-A", "/1")

2. LABEL ANALYSIS for pressing identification:
   - Label design variations (logo style, color shades, rim text)
   - Address changes on labels (indicate different pressing periods)
   - "Made in..." country variations
   - Stereo/mono indicators and their placement
   - Copyright text differences

3. SLEEVE/COVER indicators:
   - Barcode presence = likely 1980s+ reissue (originals often lack barcodes)
   - Price codes (UK: K/T/S prefixes, US: $ prices)
   - Laminated vs non-laminated sleeves
   - "Digital Remaster" or "180g" stickers = modern reissue

4. YEAR vs ORIGINAL YEAR distinction:
   - Sleeve may show original release year
   - Label/barcode may reveal actual pressing year
   - Catalog number patterns indicate era

Return ONLY a JSON object with this exact structure:
{
  "artist": "string or null",
  "title": "string or null", 
  "catalogueNumber": "string or null",
  "label": "string or null",
  "barcode": "string or null",
  "matrixRunoutA": "string or null",
  "matrixRunoutB": "string or null",
  "labelCode": "string or null",
  "rightsSociety": "string or null",
  "pressingPlant": "string or null",
  "labelRimText": "string or null",
  "identifierStrings": "array of strings (raw identifiers you can read, e.g., matrix/runout, barcode, label codes)",
  "year": "number or null (the pressing/year shown on this copy)",
  "originalYear": "number or null (if different from year, the original release year)",
  "reissueYear": "number or null (if this is a reissue, when it was reissued)",
  "country": "string or null",
  "format": "string or null (e.g., LP, 12\\", 7\\")",
  "genre": "string or null",
  "conditionEstimate": "string or null (NM/VG+/VG/G)",
  "pressingInfo": "string or null (full matrix/runout details as found)",
  "isFirstPress": "boolean or null (true if evidence suggests first pressing)",
  "pressingType": "string or null ('first_press', 'repress', 'reissue', 'unknown')",
  "pressingConfidence": "string ('high', 'medium', 'low' - how confident you are about pressing identification)",
  "pressingEvidence": "array of strings (specific visual evidence for pressing determination)",
  "confidence": "high|medium|low",
  "notes": "array of strings with additional observations"
}

Be precise. Only include info you can clearly read. For pressing identification, be conservative - only mark as first press if you see strong evidence (A1/B1 stampers, specific plant codes matching known first presses, etc.).`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze these record photos. Identify the artist, title, catalogue number, label, year, and CRITICALLY: examine the deadwax/matrix area and labels closely to determine if this is a first pressing, repress, or reissue. Report any matrix numbers, plant codes, or label variations you can see.'
          },
          ...base64Images.map(base64 => ({
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64}`,
              detail: 'high'
            }
          }))
        ]
      }
    ];

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          max_tokens: 2000,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OCR analysis failed');
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```|([\s\S]*)/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[2]) : content;
      
      try {
        return JSON.parse(jsonStr.trim());
      } catch (e) {
        console.error('Failed to parse OCR response:', content);
        throw new Error('Failed to parse record data');
      }
    } catch (error) {
      console.error('OCR Analysis Error:', error);
      throw error;
    }
  }

  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Return clean base64 without data URL prefix for API calls
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  updateApiKey(key) {
    this.apiKey = key;
  }

  updateModel(model) {
    this.model = model;
  }
}

window.enhancedOcrService = new EnhancedOCRService();
