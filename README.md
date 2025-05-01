# AI Interviewer

A full-stack web application that conducts AI-powered interviews using voice interaction and resume analysis.

## Features

- PDF resume upload and text extraction
- Voice-based interview questions using Google Gemini API
- Real-time speech recognition for candidate responses
- Automated interview summary generation
- Responsive design for both desktop and mobile

## Tech Stack

- **Frontend**: React + Tailwind CSS
- **Backend**: Node.js + Express
- **APIs**: Google Gemini, Deepgram
- **Hosting**: GitHub Pages (Frontend), Render.com (Backend)

## Project Structure

```
ai-interviewer/
├── frontend/               # React frontend application
│   ├── public/            # Static files
│   └── src/               # React source code
│       ├── components/    # Reusable components
│       ├── services/      # API services
│       └── utils/         # Utility functions
├── backend/               # Node.js backend
│   ├── src/              # Backend source code
│   ├── config/           # Configuration files
│   └── routes/           # API routes
└── .github/              # GitHub Actions workflows
```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Gemini API key
- Deepgram API key

### Environment Variables

Create a `.env` file in the backend directory:

```
GEMINI_API_KEY=your_gemini_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-interviewer.git
cd ai-interviewer
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
npm install
```

### Running Locally

1. Start the backend server:
```bash
cd backend
npm start
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

The application will be available at `http://localhost:3000`.

## Deployment

### Frontend (GitHub Pages)

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. The GitHub Actions workflow will automatically deploy to GitHub Pages on every push to main.

### Backend (Render.com)

1. Push your code to GitHub
2. Connect your repository to Render.com
3. The `render.yaml` file will automatically configure the deployment

## API Endpoints

- `POST /api/interview/start`: Initialize interview with resume
- `POST /api/interview/question`: Generate next interview question
- `POST /api/interview/summary`: Generate interview summary

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
