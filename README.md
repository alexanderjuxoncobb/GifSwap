# GIF Face Swap MVP

Swap your face into popular memes and GIFs!

## Setup

1. **Install dependencies:**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

2. **Configure Replicate API:**
   - Edit `backend/.env`
   - Replace `your_replicate_api_token_here` with your actual Replicate API token

3. **Run the application:**
   
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

4. **Access the app:**
   - Open http://localhost:5173 in your browser

## Usage

1. Upload a photo of yourself
2. Select a GIF from the grid
3. Wait for the face swap to process
4. Download your personalized GIF!

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS v4
- Backend: Node.js, Express, TypeScript
- AI: Replicate API (faceswap-a-gif model)