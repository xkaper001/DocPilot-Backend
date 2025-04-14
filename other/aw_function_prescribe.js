// import { GoogleGenAI } from "@google/genai";
// import { createClient } from "@deepgram/sdk";

// // Google GenAI Configuration
// const googleGenAiApiKey = process.env.GOOGLE_GENAI_API_KEY;
// const genAi = new GoogleGenAI({ apiKey: googleGenAiApiKey });
// const genAiModel = "gemini-pro"; // Or "gemini-2.0-flash" as in your example

// // Deepgram Configuration
// const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
// const deepgram = createClient(deepgramApiKey);
// const deepgramModel = "nova-3-medical"; // As indicated in your workflow

// export default async ({ req, res }) => {
//     try {
//         if (req.method === 'POST') {
//             const { audioUrl } = req.body;

//             if (!audioUrl) {
//                 return res.json({ error: 'Missing audioUrl in the request body.' }, 400);
//             }

//             console.log(`Received audio URL: ${audioUrl}`);

//             // 1. Generate STT API Call to Deepgram
//             console.log('Calling Deepgram for transcription...');
//             const { result: transcriptionResult, error: transcriptionError } = await deepgram.listen.prerecorded.transcribeUrl(
//                 {
//                     url: audioUrl,
//                 },
//                 {
//                     model: deepgramModel,
//                     smart_format: true,
//                     utterances: true, // Consider enabling for better context
//                 }
//             );

//             if (transcriptionError) {
//                 console.error('Deepgram Transcription Error:', transcriptionError);
//                 return res.json({ error: 'Failed to transcribe audio using Deepgram.', details: transcriptionError }, 500);
//             }

//             if (!transcriptionResult || !transcriptionResult.results || !transcriptionResult.results.channels || !transcriptionResult.results.channels[0] || !transcriptionResult.results.channels[0].alternatives || !transcriptionResult.results.channels[0].alternatives[0]) {
//                 console.warn('Deepgram Transcription Result is empty or malformed:', transcriptionResult);
//                 return res.json({ error: 'Received empty or malformed transcription from Deepgram.' }, 500);
//             }

//             const medicalTranscription = transcriptionResult.results.channels[0].alternatives[0].transcript;
//             console.log('Medical Transcription:', medicalTranscription);

//             // 2. Send Transcription to GenAI for Structured Prescription
//             console.log('Sending transcription to Google GenAI for structured prescription...');
//             const genAiPrompt = `You are a medical AI. Convert the following medical consultation into a structured JSON prescription.
// Extract the following:
// - symptoms
// - diagnosis
// - medication (name, dosage, frequency)
// - suggested tests (if any)
// - follow-up instructions (if any)

// Transcription:
// ${medicalTranscription}`;

//             const genAiResponse = await genAi.models.generateContent({
//                 model: genAiModel,
//                 contents: genAiPrompt,
//             });

//             const prescriptionJsonString = genAiResponse.response?.candidates?.[0]?.content?.parts?.[0]?.text;

//             if (!prescriptionJsonString) {
//                 console.warn('Google GenAI did not return a prescription JSON:', genAiResponse);
//                 return res.json({ error: 'Failed to generate structured prescription JSON.' }, 500);
//             }

//             console.log('Prescription JSON String:', prescriptionJsonString);

//             try {
//                 const prescriptionJson = JSON.parse(prescriptionJsonString);
//                 console.log('Prescription JSON:', prescriptionJson);
//                 return res.json(prescriptionJson);
//             } catch (error) {
//                 console.error('Error parsing GenAI response as JSON:', error);
//                 console.error('Raw GenAI Response:', prescriptionJsonString);
//                 return res.json({ error: 'Failed to parse the generated prescription as JSON.', details: error.message, rawResponse: prescriptionJsonString }, 500);
//             }

//         } else {
//             return res.json({ error: 'Only POST requests are supported.' }, 405);
//         }
//     } catch (error) {
//         console.error('Appwrite Function Error:', error);
//         return res.json({ error: 'An unexpected error occurred.', details: error.message }, 500);
//     }
// };

