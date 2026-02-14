# Construction CRM Module

A modular CRM package for construction businesses that integrates with ERP systems.

## Features

- Lead management pipeline
- Site visit scheduling and tracking
- Requirements collection and drawing management
- Quotation generation and revision tracking
- Project handover to ERP
- Activity timeline and audit logs
- File attachments and document management
- Role-based permissions
- Mobile responsive design

## Architecture

This CRM module is designed as a self-contained package that can be integrated into existing ERP systems. It uses Firebase/Firestore for data storage and follows clean architecture principles.

## Folder Structure

```
src/crm/
├── components/          # React components
├── pages/              # Page components
├── services/           # Business logic and Firebase operations
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
├── constants/          # Constants and configuration
├── contexts/           # React contexts
└── config.ts           # Module configuration
```

## Integration Points

- **Navigation**: Add CRM routes to main navigation
- **Permissions**: Configure role-based access
- **Projects**: Handover confirmed leads to project module
- **Storage**: Configure file upload destinations







