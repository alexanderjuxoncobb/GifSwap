# GifSwap

A web application that lets you swap faces into popular memes and GIFs to create personalized reactions!

## Features

- **Face Swapping**: Replace faces in popular GIFs with your own photo
- **Multiple Upload Modes**: 
  - Single face for all selected GIFs
  - Individual faces for each GIF
- **Batch Processing**: Select and process multiple GIFs at once
- **Motion Tracking UI**: Smooth animations and interactive photo gallery
- **GIF Optimization**: Automatic resizing and optimization for downloads
- **WhatsApp Sticker Support**: Create static WebP stickers from your face-swapped GIFs

## Tech Stack

- **Frontend**: 
  - React 19 with TypeScript
  - Vite for fast development
  - Tailwind CSS v4 for styling
  - Framer Motion for animations
  - Radix UI components
- **Backend**: 
  - Node.js with Express
  - TypeScript
  - Sharp for image processing
  - FFmpeg for GIF manipulation
- **AI**: Replicate API (faceswap-a-gif model)

## Setup

### Prerequisites
- Node.js 18+ and npm
- Replicate API token (get one at [replicate.com](https://replicate.com))

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd GifSwap
   ```

2. **Install dependencies:**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. **Configure environment:**
   - Create `backend/.env` file:
   ```env
   REPLICATE_API_TOKEN=your_replicate_api_token_here
   PORT=3001
   ```

4. **Run the application:**
   
   Terminal 1 - Backend:
   ```bash
   cd backend
   npm run dev
   ```
   
   Terminal 2 - Frontend:
   ```bash
   cd frontend
   npm run dev
   ```

5. **Access the app:**
   - Open http://localhost:5173 in your browser

## Usage

1. **Select GIFs**: Browse the animated gallery and click to select one or more reaction GIFs
2. **Choose Upload Mode**: 
   - "Same Face for All" - Use one photo for all selected GIFs
   - "Individual Faces" - Upload different faces for each GIF
3. **Upload Photos**: Upload clear photos with visible faces
4. **Process**: The app will process each GIF (1-3 minutes per GIF)
5. **Download**: Download individual GIFs or all at once

## API Endpoints

- `POST /api/swap` - Initiate face swap process
- `GET /api/swap/status/:predictionId` - Check processing status
- `POST /api/optimize-gif-original` - Optimize and download GIF
- `POST /api/create-sticker` - Create WhatsApp sticker (static WebP)
- `GET /api/download-gif` - Direct GIF download

## Project Structure

```
GifSwap/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── lib/        # Utility functions
│   │   └── App.tsx     # Main application
├── backend/            # Express backend server
│   ├── src/
│   │   ├── routes/     # API route handlers
│   │   └── index.ts    # Server entry point
└── README.md          # This file
```

## Authors

Made by [Alex](https://github.com/alexanderjuxoncobb) & [Rayan](https://github.com/rayan-saleh)