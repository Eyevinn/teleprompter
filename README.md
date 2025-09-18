# Teleprompter Web Application

A professional web-based teleprompter application for presentations, video recording, and public speaking.

## Features

- **Manuscript Upload**: Support for text files (.txt) and Word documents (.docx)
- **Configurable Speed**: Adjustable reading speed from 60-300 words per minute
- **Segment Timing**: Set custom segment lengths with countdown timer
- **Duration Calculations**: Real-time calculation of expected reading time vs. segment length
- **Professional Interface**: Dark theme optimized for teleprompter use
- **Live Text Editing**: Edit text directly in the application
- **Auto-scrolling**: Smooth text scrolling based on reading speed
- **Playback Controls**: Start, pause, and reset functionality

## Usage

1. **Open the Application**: Open `index.html` in your web browser
2. **Load Content**: Upload a manuscript file or type/paste text directly
3. **Configure Settings**:
   - Set your reading speed (words per minute)
   - Configure segment length
   - Adjust font size for optimal readability
4. **Monitor Duration**: Check the word count and expected duration vs. your segment length
5. **Start Prompting**: Click Start to begin auto-scrolling text
6. **Control Playback**: Use Pause/Resume and Reset as needed

## File Structure

```
teleprompter/
├── index.html          # Main application HTML
├── style.css           # Styling and layout
├── script.js           # JavaScript functionality
├── README.md           # This file
└── .gitignore         # Git ignore rules
```

## Technical Details

- **Pure HTML/CSS/JavaScript**: No framework dependencies
- **Mammoth.js**: Used for Word document parsing
- **Responsive Design**: Works on desktop and mobile devices
- **Local Storage**: All processing happens in your browser

## Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## License

MIT License