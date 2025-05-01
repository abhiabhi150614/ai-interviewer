import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'https://ai-interviewer-hb48.onrender.com';

function App() {
  const [step, setStep] = useState('upload');
  const [resumeText, setResumeText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [interviewerName, setInterviewerName] = useState('AI Interviewer');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [speechSpeed, setSpeechSpeed] = useState(1);
  const [speechVolume, setSpeechVolume] = useState(1);

  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        if (event.results[0].isFinal) {
          handleAnswer(transcript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError('Speech recognition error. Please try again.');
      };
    }

    // Initialize speech synthesis
    synthesisRef.current = window.speechSynthesis;
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);

    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE_URL}/api/interview/start`, formData);
      setResumeText(response.data.resumeText);
      setStep('jobTitle');
    } catch (error) {
      setError('Error processing resume. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobTitleSubmit = () => {
    if (!jobTitle.trim()) {
      setError('Please enter a job title');
      return;
    }
    setStep('interview');
    generateQuestion();
  };

  const generateQuestion = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE_URL}/api/interview/question`, {
        resumeText,
        jobTitle,
        conversationHistory
      });

      const question = response.data.question;
      setCurrentQuestion(question);
      speakQuestion(question);
    } catch (error) {
      setError('Error generating question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const speakQuestion = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechSpeed;
    utterance.volume = speechVolume;
    synthesisRef.current.speak(utterance);
  };

  const handleAnswer = async (answer) => {
    const newHistory = [...conversationHistory, { question: currentQuestion, answer }];
    setConversationHistory(newHistory);

    if (newHistory.length >= 5 || answer.toLowerCase().includes("i'm done")) {
      generateSummary(newHistory);
    } else {
      generateQuestion();
    }
  };

  const generateSummary = async (history) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE_URL}/api/interview/summary`, {
        resumeText,
        jobTitle,
        conversationHistory: history
      });

      const summary = response.data.summary;
      setSummary(summary);
      setStep('summary');
      speakQuestion(summary);
    } catch (error) {
      setError('Error generating summary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
    setIsRecording(!isRecording);
  };

  const replayQuestion = () => {
    speakQuestion(currentQuestion);
  };

  const skipQuestion = () => {
    handleAnswer('I would like to skip this question.');
  };

  const handleSpeedChange = (e) => {
    const speed = parseFloat(e.target.value);
    setSpeechSpeed(speed);
    // Replay current question with new speed
    if (currentQuestion) {
      speakQuestion(currentQuestion);
    }
  };

  const handleVolumeChange = (e) => {
    const volume = parseFloat(e.target.value);
    setSpeechVolume(volume);
    // Replay current question with new volume
    if (currentQuestion) {
      speakQuestion(currentQuestion);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-8">AI Interviewer</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}

        {step === 'upload' && (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Upload Your Resume</h2>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>
        )}

        {step === 'jobTitle' && (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Enter Job Position</h2>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g., Software Engineer"
              className="w-full px-4 py-2 border rounded-lg mb-4"
            />
            <input
              type="text"
              value={interviewerName}
              onChange={(e) => setInterviewerName(e.target.value)}
              placeholder="Interviewer Name (optional)"
              className="w-full px-4 py-2 border rounded-lg mb-4"
            />
            <button
              onClick={handleJobTitleSubmit}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              Start Interview
            </button>
          </div>
        )}

        {step === 'interview' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Interview in Progress</h2>
            
            {/* Speech Controls */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Speech Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Speech Speed: {speechSpeed}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={speechSpeed}
                    onChange={handleSpeedChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Volume: {Math.round(speechVolume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={speechVolume}
                    onChange={handleVolumeChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="font-semibold">Current Question:</p>
              <p className="mt-2">{currentQuestion}</p>
            </div>
            <div className="flex space-x-4 mb-4">
              <button
                onClick={replayQuestion}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Replay Question
              </button>
              <button
                onClick={skipQuestion}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Skip Question
              </button>
              <button
                onClick={toggleRecording}
                className={`${
                  isRecording ? 'bg-red-500' : 'bg-green-500'
                } text-white px-4 py-2 rounded-lg hover:bg-opacity-80`}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Conversation History:</h3>
              {conversationHistory.map((item, index) => (
                <div key={index} className="mb-4">
                  <p className="font-semibold">Q{index + 1}: {item.question}</p>
                  <p>A{index + 1}: {item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'summary' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Interview Summary</h2>
            <div className="prose max-w-none">
              {summary.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
            <button
              onClick={() => {
                setStep('upload');
                setResumeText('');
                setJobTitle('');
                setConversationHistory([]);
                setSummary('');
              }}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              Start New Interview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 