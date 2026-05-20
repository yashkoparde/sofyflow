# Running Sofi Flow Locally

If you prefer to run Sofi Flow directly on your machine in development mode (localhost) instead of building or installing an `.exe`, follow these simple steps.

---

## 1. Prerequisites
Ensure you have the following installed on your Windows machine:
- **Node.js**: Download and install it from [nodejs.org](https://nodejs.org/). This also installs `npm` (Node Package Manager).

## 2. Navigate to the App Directory
Open your terminal (Command Prompt, PowerShell, or the terminal inside VS Code) and navigate to the `windows-app` folder:
```powershell
cd d:\Yash\Freelance\sofyflow\windows-app
```

## 3. Install Dependencies
If this is your first time running the app, or if packages have been updated, install all the required dependencies by running:
```powershell
npm install
```

## 4. Run the App
Start the application in development mode:
```powershell
npm run dev
```

### What happens next?
- **Vite** will start a local development server at `http://localhost:5173`.
- **Electron** will automatically launch in the background.
- You won't see a main window immediately (since the UI is a hidden overlay), but the app is now active!

## 5. Using the App
With the app running via `npm run dev`:
1. Click into any text field where you want to dictate (e.g., Notepad, your browser, Word).
2. Press **Ctrl + Shift + Space**.
3. A sleek, semi-transparent recording overlay will appear on your screen. Speak into your microphone.
4. Press **Ctrl + Shift + Space** again to stop recording.
5. The app will securely send your audio to the Groq API for processing and instantly paste the transcribed text into your active window.

To close the application entirely, you can go back to your terminal and press **Ctrl + C** to terminate the process.
