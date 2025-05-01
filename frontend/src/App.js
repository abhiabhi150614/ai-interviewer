import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Deepgram } from '@deepgram/sdk';

const API_BASE_URL = 'https://ai-interviewer-hb48.onrender.com';
const DEEPGRAM_API_KEY = ''; // Replace with your Deepgram API key

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
  const [speechSpeed, setSpeechSpeed] = useState(1.5);
  const [speechVolume, setSpeechVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const deepgramRef = useRef(null);

  useEffect(() => {
    const initializeSpeech = async () => {
      try {
        // Initialize speech synthesis
        synthesisRef.current = window.speechSynthesis;

        // Initialize Deepgram
        deepgramRef.current = new Deepgram({
          apiKey: DEEPGRAM_API_KEY
        });

        // Get microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        // Initialize MediaRecorder
        const mimeType = 'audio/webm';
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: 128000
        });

        // Handle data available event
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        // Handle recording stop
        mediaRecorderRef.current.onstop = async () => {
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            audioChunksRef.current = [];

            const source = {
              buffer: await audioBlob.arrayBuffer(),
              mimetype: mimeType
            };

            const response = await deepgramRef.current.transcription.preRecorded(source, {
              smart_format: true,
              model: 'nova-2',
              language: 'en-US',
              punctuate: true
            });

            const transcript = response.results.channels[0].alternatives[0].transcript;
            if (transcript.trim()) {
              handleAnswer(transcript);
            }
          } catch (error) {
            console.error('Transcription error:', error);
          }
        };

        setIsInitialized(true);
      } catch (error) {
        console.error('Initialization error:', error);
        if (error.name === 'NotAllowedError') {
          setError('Please allow microphone access to use speech features.');
        }
      }
    };

    initializeSpeech();

    return () => {
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        const tracks = mediaRecorderRef.current.stream?.getTracks() || [];
        tracks.forEach(track => track.stop());
      }
    };
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

  const toggleMute = () => {
    if (synthesisRef.current.speaking) {
      synthesisRef.current.cancel();
    }
    setIsMuted(!isMuted);
  };

  const speakQuestion = (text) => {
    if (isMuted) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechSpeed;
    utterance.volume = speechVolume;
    synthesisRef.current.speak(utterance);
  };

  const handleAnswer = async (answer) => {
    const newHistory = [...conversationHistory, { 
      question: currentQuestion, 
      answer,
      timestamp: new Date().toLocaleTimeString(),
      questionNumber: conversationHistory.length + 1
    }];
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
      // Stop any ongoing speech
      if (synthesisRef.current.speaking) {
        synthesisRef.current.cancel();
      }
      
      const response = await axios.post(`${API_BASE_URL}/api/interview/summary`, {
        resumeText,
        jobTitle,
        conversationHistory: history
      });

      const summary = response.data.summary;
      setSummary(summary);
      setStep('summary');
      
      // Ensure speech synthesis is ready
      if (synthesisRef.current) {
        // Small delay to ensure state updates are complete
        setTimeout(() => {
          if (!isMuted) {
            const utterance = new SpeechSynthesisUtterance(summary);
            utterance.rate = speechSpeed;
            utterance.volume = speechVolume;
            synthesisRef.current.speak(utterance);
          }
        }, 500);
      }
    } catch (error) {
      setError('Error generating summary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = () => {
    if (!mediaRecorderRef.current || !isInitialized) return;

    try {
      if (isRecording) {
        mediaRecorderRef.current.stop();
      } else {
        audioChunksRef.current = [];
        mediaRecorderRef.current.start(1000);
      }
      setIsRecording(!isRecording);
      setError('');
    } catch (error) {
      console.error('Recording error:', error);
    }
  };

  const replayQuestion = () => {
    // Stop current speech before replaying
    if (synthesisRef.current.speaking) {
      synthesisRef.current.cancel();
    }
    speakQuestion(currentQuestion);
  };

  const skipQuestion = () => {
    // Stop current speech
    if (synthesisRef.current.speaking) {
      synthesisRef.current.cancel();
    }
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

            {/* Enhanced Conversation History */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Conversation History</h3>
              <div className="space-y-6">
                {conversationHistory.map((item, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-500">Question {item.questionNumber}</span>
                      <span className="text-sm text-gray-500">{item.timestamp}</span>
                    </div>
                    <div className="mb-3">
                      <p className="font-semibold text-blue-600">Q: {item.question}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">A: {item.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'summary' && (
          <div>
            <h2 className="text-2xl font-bold text-center mb-8">Interview Summary</h2>
            
            {/* Mute Button */}
            <div className="flex justify-center mb-6">
              <button
                onClick={toggleMute}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isMuted 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-green-500 hover:bg-green-600'
                } text-white`}
              >
                <span>{isMuted ? '🔇 Unmute' : '🔊 Mute'}</span>
              </button>
            </div>

            <div className="prose max-w-none space-y-6">
              {summary.split('\n').map((paragraph, index) => {
                // Check if paragraph is a heading
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  return (
                    <h3 key={index} className="text-xl font-bold text-blue-600 mt-6 mb-4">
                      {paragraph.replace(/\*\*/g, '')}
                    </h3>
                  );
                }
                // Check if paragraph is a bullet point (handles both * and •)
                else if (paragraph.trim().startsWith('* ') || paragraph.trim().startsWith('• ')) {
                  return (
                    <div key={index} className="flex items-start space-x-2 ml-4">
                      <span className="text-blue-500 mt-1">•</span>
                      <p className="text-gray-700">{paragraph.replace(/^[*•]\s*/, '')}</p>
                    </div>
                  );
                }
                // Check if paragraph is a subheading
                else if (paragraph.startsWith('**')) {
                  return (
                    <h4 key={index} className="text-lg font-semibold text-gray-800 mt-4 mb-2">
                      {paragraph.replace(/\*\*/g, '')}
                    </h4>
                  );
                }
                // Regular paragraph
                else if (paragraph.trim()) {
                  return (
                    <p key={index} className="text-gray-700 leading-relaxed">
                      {paragraph}
                    </p>
                  );
                }
                return null;
              })}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex justify-center space-x-4">
              <button
                onClick={() => {
                  setStep('upload');
                  setResumeText('');
                  setJobTitle('');
                  setConversationHistory([]);
                  setSummary('');
                }}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Start New Interview
              </button>
              <button
                onClick={() => {
                  const element = document.createElement('a');
                  const file = new Blob([summary], {type: 'text/plain'});
                  element.href = URL.createObjectURL(file);
                  element.download = 'interview-summary.txt';
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Download Summary
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 
