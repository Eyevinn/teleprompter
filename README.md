# Open Teleprompter

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Slack](http://slack.streamingtech.se/badge.svg)](http://slack.streamingtech.se)
[![Badge OSC](https://img.shields.io/badge/Evaluate-24243B?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcl8yODIxXzMxNjcyKSIvPgo8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI3IiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiLz4KPGRlZnM%2BCjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhcl8yODIxXzMxNjcyIiB4MT0iMTIiIHkxPSIwIiB4Mj0iMTIiIHkyPSIyNCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjQzE4M0ZGIi8%2BCjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzREQzlGRiIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM%2BCjwvc3ZnPgo%3D)](https://app.osaas.io/browse/eyevinn-teleprompter)

A professional open-source web-based teleprompter application with controller-display separation for presentations, video recording, and public speaking.

**✨ Available in Eyevinn Open Source Cloud** - Try Open Teleprompter instantly without installation at [app.osaas.io](https://app.osaas.io/browse/eyevinn-teleprompter)

Open Teleprompter provides a complete solution for professional teleprompter needs, featuring real-time synchronization between controller and display interfaces, manuscript formatting, mobile-friendly display controls, presets, and Docker deployment support.

This fork keeps the original Eyevinn teleprompter foundation and adds a set of controller, display, mobile, and deployment improvements focused on personal recording workflows.

## Screenshots

### Controller Interface
The controller provides comprehensive management of your teleprompter session:

![Controller Interface](controller.png)

### Display Interface
The clean, distraction-free display optimized for teleprompter use:

![Display Interface](display.png)

## Features

### Original Project Features

- **Controller-Display Architecture**: Separate interfaces connected via WebSocket
- **Manuscript Upload**: Support for text files (.txt) and Word documents (.docx)
- **Manuscript Formatting**: Teleprompter formatting options
- **Configurable Speed**: Adjustable reading speed
- **Segment Timing**: Set custom segment lengths with countdown timer
- **Scheduled Start**: Set future start times with countdown display
- **Duration Calculations**: Real-time calculation of expected reading time vs. segment length
- **On-Air Indicator**: Visual indicator with automatic activation
- **Live Text Editing**: Edit text directly in the controller
- **Auto-scrolling**: Smooth text scrolling based on reading speed
- **Playback Controls**: Start, pause, and reset functionality
- **Multiple Displays**: Support for multiple synchronized displays
- **Mirror Mode**: For use with teleprompter hardware
- **Fullscreen Support**: F11 or F key for fullscreen mode

### Added In This Fork

- **Focused Controller UI**: Script editor, reading setup, display options, advanced timing, and presets
- **Rich Text Editing**: Bold, italic, highlight, accent color, and remove formatting controls
- **Expanded Reading Setup**: Adjustable speed from 30-300 words per minute, font size, and centered text width
- **Optional Reading Guide**: Horizontal guide line on the display
- **Start Cooldown**: Countdown before playback starts
- **Re-recording Controls**: Jump -5s, -10s, and +5s while recording
- **Settings Presets**: Save and load preferred reading/display settings
- **Mobile Display Mode**: Fullscreen/wake-lock helpers for phone display use
- **Improved Mobile/Mirror Layout**: Display controls and indicators remain readable in mobile and mirror mode
- **Accurate WPM Scrolling**: Scroll timing is based on word count and measured text travel distance
- **Centered Text Width Control**: Limit and center the readable text column for camera-facing delivery
- **Docker Compose Deployment**: `.env.example`, `docker-compose.yml`, public URL configuration, and `/healthz`

## Quick Start

### Using Node.js

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Server**:
   ```bash
   npm start
   ```

3. **Access the Application**:
   - Controller: http://localhost:8080/controller
   - Display: http://localhost:8080/display

### Using Docker

1. **Build the Docker Image**:
   ```bash
   docker build -t open-teleprompter .
   ```

2. **Run the Container**:
   ```bash
   docker run -p 8080:8080 open-teleprompter
   ```

3. **Access the Application**:
   - Controller: http://localhost:8080/controller
   - Display: http://localhost:8080/display

### Using Docker Compose

1. **Create your environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` for your server**:
   ```bash
   HOST_PORT=8080
   PUBLIC_HOST=192.168.1.139
   PUBLIC_PROTOCOL=http
   PUBLIC_PORT=8080
   ```

   If you run it behind an HTTPS reverse proxy, use your domain and leave
   `PUBLIC_PORT` empty:
   ```bash
   HOST_PORT=8080
   PUBLIC_HOST=teleprompter.example.com
   PUBLIC_PROTOCOL=https
   PUBLIC_PORT=
   ```

3. **Start the service**:
   ```bash
   docker compose up -d --build
   ```

4. **Access the Application**:
   - Controller: http://localhost:8080/controller
   - Display: http://localhost:8080/display

If you use a reverse proxy such as Caddy, Traefik, Nginx Proxy Manager, or
nginx, make sure WebSocket upgrades are enabled for the same host. The HTTP
server and WebSocket server both use the same port.

### Custom Port Configuration

#### Node.js
```bash
PORT=3000 npm start
```

#### Docker
```bash
docker run -p 3000:3000 -e PORT=3000 open-teleprompter
```

## Usage

1. **Open the Controller**: Navigate to `/controller` to configure and control the teleprompter
2. **Open the Display**: Navigate to `/display` for the clean teleprompter display
3. **Load Content**: Upload a manuscript file or type/paste text directly in the controller
4. **Format Content**: Use teleprompter formatting, rich text controls, or remove formatting when needed
5. **Configure Reading Setup**:
   - Set reading speed, font size, and text width
   - Enable the optional reading guide line
   - Enable mirror mode, hide timer, or on-air indicator
6. **Start Prompting**: Set an optional cooldown and click Start
7. **Control Playback**: Use Pause/Resume, Reset, -5s, -10s, and +5s as needed
8. **Save Presets**: Store your preferred reading/display settings for later sessions

## File Structure

```
open-teleprompter/
├── server.js           # Node.js WebSocket server
├── package.json        # Node.js dependencies
├── controller.html     # Controller interface
├── controller.css      # Controller styling
├── controller.js       # Controller functionality
├── display.html        # Teleprompter display
├── display.css         # Display styling
├── display.js          # Display functionality
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Docker Compose deployment
├── .env.example        # Deployment environment example
├── .dockerignore       # Docker ignore rules
├── README.md           # This file
└── .gitignore         # Git ignore rules
```

## Technical Details

- **Node.js Backend**: WebSocket server for real-time communication
- **WebSocket Communication**: Real-time synchronization between controller and displays
- **State Management**: Server-side state management for multiple clients
- **Mammoth.js**: Used for Word document parsing
- **Responsive Design**: Works on desktop and mobile devices
- **Docker Support**: Containerized deployment ready
- **Health Check**: `/healthz` endpoint for container monitoring

## Environment Variables

- `PORT`: Server port for both HTTP and WebSocket (default: 8080)
- `PUBLIC_HOST`: Hostname or IP shown to controllers and displays
- `PUBLIC_PROTOCOL`: Public protocol for generated URLs (`http` or `https`)
- `PUBLIC_PORT`: Public port for generated URLs. Set to an empty value when
  using the default HTTPS/HTTP port through a reverse proxy.
- `NODE_ENV`: Node.js environment (default: production in Docker)

## Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## Contributing

We welcome contributions to Open Teleprompter! Please see our [contribution guidelines](CONTRIBUTING.md) for more information.

## Support

Join our [community on Slack](http://slack.streamingtech.se) where you can post any questions regarding any of our open source projects. Eyevinn's consulting business can also offer you:

- Further development of this component
- Customization and integration of this component into your platform
- Support and maintenance agreement
- Training

Contact [sales@eyevinn.se](mailto:sales@eyevinn.se) if you are interested.

## About Eyevinn Technology

[Eyevinn Technology](https://www.eyevinntechnology.se) is an independent consultant firm specialized in video and streaming. Independent in a way that we are not commercially tied to any platform or technology vendor. As our way to innovate and push the industry forward we develop proof-of-concepts and tools. The things we learn and the code we write we share with the industry in [blogs](https://dev.to/video) and by open sourcing the code we have written.

Want to know more about Eyevinn and how it is to work here. Contact us at [work@eyevinn.se](mailto:work@eyevinn.se)!

## License

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Copyright 2025 Eyevinn Technology AB
