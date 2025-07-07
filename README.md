# Little Lungs ToDo - Medical Practice Task Management

A comprehensive task management system designed specifically for medical practices, providing real-time collaboration, flexible sheet management, and mobile-friendly interface.

## Features

- 📱 **Mobile-First Design** - Fully responsive interface optimized for all devices
- 🔄 **Real-Time Sync** - Live collaboration with automatic updates
- 👥 **Role-Based Access** - Admin, Doctor, and Staff roles with appropriate permissions
- 📋 **Flexible Sheets** - Customizable columns similar to Excel worksheets
- 📁 **File Management** - Upload and attach files to tasks
- 🏥 **Multi-Department** - Support for different departments and teams
- 📊 **Three Sheet Types**:
  - **Monthly Tasks** - Patient tasks organized by month
  - **Practice Admin** - Ongoing administrative tasks
  - **Personal ToDos** - Individual staff task lists

## Technology Stack

- **Frontend**: Next.js 14 (React 18)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Deployment**: Vercel
- **Language**: TypeScript

## Quick Start

### Prerequisites

- Node.js 18+ installed
- A Supabase account
- A Vercel account (for deployment)

### 1. Clone and Install

```bash
cd little-lungs-todo
npm install
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy the project URL and anon key
3. Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Setup Database

Run the SQL script in your Supabase SQL editor:

```bash
# Copy and paste the contents of database.sql into Supabase SQL Editor
```

This will create:
- User profiles table
- Sheets management tables
- Column definitions for flexibility
- User preferences for customization
- Tasks and attachments tables
- Row Level Security policies
- Real-time subscriptions

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Database Schema

### Core Tables

- **profiles** - User information extending Supabase auth
- **sheets** - Different task sheets (Monthly, Admin, Personal)
- **column_definitions** - Flexible column structure
- **user_column_preferences** - Per-user column customization
- **tasks** - Main task data with JSON storage
- **task_attachments** - File attachments

### Default Column Structures

#### Monthly Tasks
- Date, File Nr/Acc nr, Patient Name, Query, Parents Name, Cell Number, To be actioned by, Executed, Message Take BY

#### Practice Admin
- Date, Query, Cell Number, To be actioned by

#### Personal ToDos
- Date, To Do, Done?

## Deployment

### Vercel Deployment

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## User Management

### Creating Users

Users must be created by an admin through the Supabase dashboard or admin interface:

1. Go to Supabase Dashboard > Authentication > Users
2. Invite new users
3. Set their role in the profiles table (admin/doctor/staff)

### Roles

- **Admin** - Full access, can manage all sheets and users
- **Doctor** - Can view and edit tasks, limited admin functions
- **Staff** - Can view and edit assigned tasks, manage personal todos

## File Storage

The system supports file attachments through Supabase Storage:

1. Files are stored in organized buckets
2. Each attachment links to a task
3. File permissions managed through RLS
4. Support for common file types

## Customization

### Adding New Columns

Admins can add new columns to any sheet type:

1. Modify `column_definitions` table
2. Specify column type (text, date, number, boolean, select)
3. Set visibility and order
4. Users can customize their view

### Sheet Types

Easy to extend with new sheet types by:

1. Adding to the `sheet_type` enum
2. Creating column definitions
3. Updating UI components

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based access control
- Secure file upload and access
- Authentication through Supabase Auth

## Mobile Support

- Progressive Web App (PWA) ready
- Touch-friendly interface
- Responsive design for all screen sizes
- Offline-first approach (coming soon)

## Development

### Project Structure

```
src/
├── app/                 # Next.js app router
├── components/          # React components
│   ├── auth/           # Authentication components
│   └── ui/             # Reusable UI components
├── lib/                # Utilities and configurations
│   ├── supabase.ts     # Supabase client
│   └── database.types.ts # TypeScript types
└── styles/             # Global styles
```

### Available Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npm run type-check   # TypeScript check
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## License

This project is proprietary software for Little Lungs Medical Practice.

---

**Note**: Remember to keep your environment variables secure and never commit them to version control.
