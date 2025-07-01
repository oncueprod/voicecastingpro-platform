# VoiceCastingPro - Production Ready with Render

A professional voice casting platform connecting voice talent with clients worldwide.

## Features

- User authentication (client and talent accounts)
- Voice talent profiles and demos
- Client project posting
- Secure messaging system
- Escrow payment processing via PayPal
- Subscription plans for talent
- Admin dashboard for platform management

## Tech Stack

### Frontend
- React with TypeScript
- Vite for fast development and optimized builds
- Tailwind CSS for styling
- Framer Motion for animations
- Socket.IO for real-time messaging

### Backend
- Node.js with Express
- PostgreSQL database (hosted on Render)
- Socket.IO for WebSockets
- JWT for secure authentication
- PayPal API integration for payments
- Nodemailer for email sending

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (local or Render)
- PayPal Developer account (for payment processing)
- SMTP server access (for email functionality)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/voicecastingpro.git
cd voicecastingpro
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file based on `.env.example`
```bash
cp .env.example .env
```

4. Update the `.env` file with your credentials:
   - PostgreSQL database URL
   - PayPal API credentials
   - SMTP server details
   - JWT secret

5. Set up the database
```bash
npm run db:migrate
```

### Development

Start the frontend development server:
```bash
npm run dev
```

Start the backend server:
```bash
npm run server
```

### Production Build

Build the frontend:
```bash
npm run build
```

Start the production server:
```bash
NODE_ENV=production npm run server
```

## Deployment to Render

1. Create a PostgreSQL database on Render
2. Create a Web Service on Render:
   - Connect your GitHub repository
   - Set the build command: `npm install && npm run build`
   - Set the start command: `npm run start`
   - Add environment variables from your `.env` file

3. Configure environment variables on Render:
   - `DATABASE_URL`: Your Render PostgreSQL connection string
   - `NODE_ENV`: production
   - `JWT_SECRET`: A secure random string
   - `PAYPAL_CLIENT_ID`: Your PayPal client ID
   - `PAYPAL_CLIENT_SECRET`: Your PayPal client secret
   - Other variables from your `.env` file

4. Deploy your application

## File Storage

For production, you should use a cloud storage service like AWS S3 or Cloudinary instead of local file storage. Update the file upload logic in the server code to use your preferred cloud storage provider.

## Security Considerations

- All sensitive data is stored in environment variables
- Passwords are hashed using bcrypt
- JWT is used for secure authentication
- PayPal handles all payment processing
- CORS is configured to restrict access

## License

This project is licensed under the MIT License - see the LICENSE file for details.