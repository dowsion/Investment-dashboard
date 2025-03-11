# Investment Portfolio Management System

A professional web application for managing investment portfolios and projects. Built with Next.js, TypeScript, Tailwind CSS, and Prisma.

## Features

- **Dashboard**: Overview of investment portfolio with key metrics
- **Portfolio Details**: Comprehensive view of all investment projects with detailed information
- **Document Management**: Upload, view, and download project-related documents
- **Project Management**: Add, edit, and delete investment projects
- **Data Analysis**: Calculate investment metrics like MOIC (Multiple on Invested Capital)

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (via Prisma ORM)
- **Authentication**: Role-based access control (Admin/User)
- **UI Components**: Headless UI, Heroicons

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up the database:
   ```
   npx prisma generate
   npx prisma db push
   ```
4. Start the development server:
   ```
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Admin Features

- **Add Projects**: Create new investment projects with detailed information
- **Upload Documents**: Attach important documents to projects
- **Edit Projects**: Update project details and investment metrics
- **Data Management**: Calculate investment metrics based on input data

### User Features

- **View Dashboard**: See overview of investment portfolio
- **Browse Projects**: View detailed information about each investment
- **Access Documents**: View and download project-related documents

## Project Structure

- `/src/app`: Main application code
  - `/api`: API routes for data operations
  - `/components`: Reusable UI components
  - `/portfolio`: Portfolio management pages
  - `/documents`: Document management pages
- `/prisma`: Database schema and migrations

## License

This project is proprietary and confidential.

## Contact

For support or inquiries, please contact the system administrator.
