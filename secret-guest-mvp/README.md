# Secret Guest MVP - Hotel Quality Assessment Application

## Overview

Secret Guest MVP is a web-based application that automates hotel quality assessment through video analysis. The application processes short video recordings from three hotel zones (Reception, Room, Bathroom) and automatically answers quality assessment questions using computer vision models, generating comprehensive reports with star ratings.

## Features

### Core Functionality
- **Zone-based Assessment**: Evaluate three key hotel areas (Reception, Room, Bathroom)
- **Video Upload/Recording**: Support for file upload or direct browser recording
- **AI-Powered Analysis**: Automatic object detection and quality scoring
- **Russian Language Support**: Full interface in Russian for hospitality industry
- **Star Rating System**: 1-5 star ratings for each assessment question
- **PDF Report Generation**: Downloadable assessment reports
- **Progress Tracking**: Track completed zones and overall progress

### Zones and Questions

#### Reception Zone (Ресепшен)
1. "Как быстро вас заселили?" - Check-in speed assessment
2. "Были ли понятные указатели и легко ли найти ресепшен?" - Navigation and signage
3. "Чистота и порядок в зоне ресепшен?" - Cleanliness and organization

#### Room Zone (Номер)
1. "Соответствует ли номер ожиданиям и есть ли базовые удобства?" - Basic amenities check
2. "Чистота постели и поверхностей?" - Bedding and surface cleanliness
3. "Чистота окон/освещенность?" - Window cleanliness and lighting

#### Bathroom Zone (Ванная)
1. "Чистота сантехники (раковина, унитаз, душ)?" - Fixture cleanliness
2. "Полотенца и туалетные принадлежности предоставлены и чистые?" - Supplies and amenities

## Technology Stack

### Frontend
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **TailwindCSS** for responsive design with Ostrovok.ru inspired color palette
- **Lucide React** for consistent iconography

### Video Processing
- **ffmpeg.wasm** for client-side video processing and frame extraction
- Frame extraction at 1 FPS with maximum 10-15 frames per video
- Support for 15-30 second video recordings

### Computer Vision
- **Roboflow Hosted Inference API** (Free tier)
- Two specialized models:
  - General object detection (furniture, amenities, people)
  - Negative condition detection (stains, dirt, clutter)

### PDF Generation
- **jsPDF** for client-side PDF report generation
- No server-side dependencies for document creation

### Hosting & Deployment
- **Vercel** or **Netlify** for static site hosting
- Client-side only architecture (no backend server required)
- Local storage for temporary data

## Getting Started

### Prerequisites
- Node.js 20.19+ or 22.12+
- npm or yarn package manager
- Modern web browser with camera access (for video recording)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd secret-guest-mvp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Roboflow API key
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

### Environment Variables

Create a `.env` file with the following variables:

```env
VITE_ROBOFLOW_API_KEY=your_roboflow_api_key_here
VITE_APP_NAME=Secret Guest MVP
VITE_APP_VERSION=1.0.0
VITE_ENABLE_DEBUG=false
```

## Usage

### Basic Workflow

1. **Select Zone**: Choose one of the three available assessment zones
2. **Upload Video**: Either upload a video file (10-30 seconds, max 100MB) or record directly in browser
3. **AI Analysis**: The system automatically extracts frames and analyzes them using computer vision
4. **View Results**: Review automatic answers to assessment questions with star ratings
5. **Download Report**: Generate and download a PDF report with all findings

### Supported Video Formats
- MP4, WebM, QuickTime, AVI
- Duration: 10-30 seconds
- Maximum file size: 100MB
- Recommended resolution: 640x480 or higher

## Project Structure

```
src/
├── components/           # React components
│   ├── ZoneSelector/    # Zone selection interface
│   ├── VideoProcessor/  # Video upload and processing
│   ├── ResultsDisplay/  # Results and scoring display
│   ├── FrameExtractor/  # Video frame extraction
│   ├── PDFExport/       # PDF report generation
│   └── common/          # Shared components
├── types/               # TypeScript type definitions
├── constants/           # Configuration and constants
│   ├── zones.ts         # Zone and question configurations
│   └── index.ts         # App constants and API config
├── services/            # External service integrations
├── utils/               # Utility functions
└── hooks/               # Custom React hooks
```

## Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests
npm test
```

### Code Quality

- **TypeScript**: Full type safety across the application
- **ESLint**: Code linting with React and TypeScript rules
- **Prettier**: Code formatting (if configured)
- **Tailwind**: Utility-first CSS with design system

## Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Netlify Deployment

1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Configure environment variables

### Manual Deployment

```bash
# Build the project
npm run build

# The dist/ folder contains the built application
# Upload dist/ contents to your static hosting provider
```

## API Integration

### Roboflow Setup

1. Create account at [Roboflow](https://roboflow.com)
2. Get your API key from the dashboard
3. Set up two detection models:
   - General hotel objects model
   - Negative conditions detection model
4. Configure endpoints in `src/constants/index.ts`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Future Enhancements

- [ ] Real ffmpeg.wasm integration for frame extraction
- [ ] Complete Roboflow API integration
- [ ] Advanced scoring algorithm implementation
- [ ] PDF report generation with charts and images
- [ ] Additional zones (Restaurant, Elevator, Lobby, etc.)
- [ ] Multi-language support
- [ ] User authentication and data persistence
- [ ] Analytics and reporting dashboard
- [ ] Mobile app version

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in the `/docs` folder

## Acknowledgments

- Built for hackathon demonstration
- Inspired by mystery guest evaluation methodologies
- Designed with hospitality industry best practices
- UI/UX inspired by Ostrovok.ru design principles