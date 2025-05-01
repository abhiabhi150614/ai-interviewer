const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const interviewRoutes = {
  startInterview: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      const pdfBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(pdfBuffer);
      const resumeText = pdfData.text;

      // Clean up the uploaded file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        resumeText,
        message: 'Resume processed successfully'
      });
    } catch (error) {
      console.error('Error processing resume:', error);
      res.status(500).json({ error: 'Error processing resume' });
    }
  },

  generateQuestion: async (req, res) => {
    try {
      const { resumeText, jobTitle, conversationHistory } = req.body;

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      let prompt = `You are an AI interviewer. A candidate has applied for the position of ${jobTitle}.\n`;
      prompt += `Here is the candidate's resume text:\n${resumeText}\n`;

      if (conversationHistory && conversationHistory.length > 0) {
        prompt += `Interview history so far:\n`;
        conversationHistory.forEach((item, index) => {
          prompt += `Q${index + 1}: ${item.question}\n`;
          prompt += `A${index + 1}: ${item.answer}\n`;
        });
      }

      prompt += `Generate the next interview question.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const question = response.text();

      res.json({
        success: true,
        question
      });
    } catch (error) {
      console.error('Error generating question:', error);
      res.status(500).json({ error: 'Error generating question' });
    }
  },

  generateSummary: async (req, res) => {
    try {
      const { resumeText, jobTitle, conversationHistory } = req.body;

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      let prompt = `You are an AI interviewer.\n`;
      prompt += `Here is the resume:\n${resumeText}\n`;
      prompt += `Interview transcript:\n`;

      conversationHistory.forEach((item, index) => {
        prompt += `Q${index + 1}: ${item.question}\n`;
        prompt += `A${index + 1}: ${item.answer}\n`;
      });

      prompt += `Provide a concise summary of the candidate's strengths, areas for improvement, and overall performance.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();

      res.json({
        success: true,
        summary
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      res.status(500).json({ error: 'Error generating summary' });
    }
  }
};

module.exports = { interviewRoutes }; 