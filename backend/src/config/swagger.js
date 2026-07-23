/**
 * @fileoverview OpenAPI 3.0 Swagger Specification & UI configuration.
 * Exposes interactive API documentation for:
 *   - Authentication APIs
 *   - Appointment APIs
 *   - Queue APIs
 *   - Doctor APIs
 *   - Patient APIs
 *   - Admin APIs
 */

const swaggerUi = require('swagger-ui-express');

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'MediQueue — Hospital Smart Appointment & Live Queue API',
    version: '1.0.0',
    description: `
Full-stack RESTful API documentation for **MediQueue Hospital Management System**.
Supports JWT Bearer authentication, real-time Socket.IO events, and Firebase Cloud Messaging (FCM).

### User Roles & Permissions
- **Patient**: Register, book appointments, track live queue, receive turn & delay notifications.
- **Doctor**: Manage daily consultation queue, call next, bump emergency priority, update delay, generate prescriptions.
- **Admin**: System-wide user directory, doctor profiles & fees, department CRUD, operational settings, reports & CSV exports.
    `,
    contact: {
      name: 'MediQueue Development Team',
      url: 'https://github.com/poojakullolli/hospital-queue-system',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT access token obtained from /auth/login',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '66a1234567890123456789ab' },
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', example: 'john@example.com' },
          phone: { type: 'string', example: '+91 9876543210' },
          role: { type: 'string', enum: ['patient', 'doctor', 'admin'], example: 'patient' },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Doctor: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          userId: { $ref: '#/components/schemas/User' },
          specialty: { type: 'string', example: 'Cardiology' },
          experience: { type: 'number', example: 10 },
          fee: { type: 'number', example: 500 },
          consultationDuration: { type: 'number', example: 15 },
          isAvailable: { type: 'boolean', example: true },
          isOnBreak: { type: 'boolean', example: false },
          bio: { type: 'string' },
        },
      },
      Appointment: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          patientId: { type: 'string' },
          doctorId: { type: 'string' },
          date: { type: 'string', format: 'date' },
          timeSlot: {
            type: 'object',
            properties: {
              start: { type: 'string', example: '09:00' },
              end: { type: 'string', example: '09:15' },
            },
          },
          queueNumber: { type: 'number', example: 4 },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
            example: 'confirmed',
          },
          consultationFee: { type: 'number', example: 500 },
        },
      },
      Queue: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          doctorId: { type: 'string' },
          date: { type: 'string', format: 'date' },
          currentServing: { type: 'string' },
          currentNumber: { type: 'number', example: 3 },
          status: { type: 'string', enum: ['pending', 'active', 'paused', 'closed'] },
          delayMinutes: { type: 'number', example: 15 },
          delayReason: { type: 'string', example: 'Emergency surgery' },
        },
      },
      Department: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Cardiology' },
          description: { type: 'string' },
          icon: { type: 'string', example: '❤️' },
          headDoctorId: { type: 'string' },
          isActive: { type: 'boolean', example: true },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error description' },
        },
      },
    },
  },
  tags: [
    { name: 'Authentication', description: 'User registration, login, JWT token rotation, and password resets' },
    { name: 'Appointments', description: 'Patient booking, history, status updates, and cancellation' },
    { name: 'Smart Queue', description: 'Live queue positions, turn advancing, delay announcements, emergency priority, and reordering' },
    { name: 'Doctors', description: 'Doctor directory, working hours, availability, and profile management' },
    { name: 'Patients', description: 'Patient demographic profile, medical history, and FCM push token registration' },
    { name: 'Admin', description: 'System overview, user management, clinical departments, queue settings, and reports' },
  ],
  paths: {
    // ─── AUTHENTICATION ────────────────────────────────────────────────────────
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new patient or doctor account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Jane Doe' },
                  email: { type: 'string', example: 'jane@example.com' },
                  password: { type: 'string', example: 'Password123' },
                  phone: { type: 'string', example: '+91 9876543210' },
                  role: { type: 'string', enum: ['patient', 'doctor'], example: 'patient' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully' },
          400: { description: 'Email already exists or invalid data' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'patient1@example.com' },
                  password: { type: 'string', example: 'Patient@123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authentication successful (Returns JWT Access Token)' },
          401: { description: 'Invalid email or password' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get logged-in user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'User profile retrieved' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout user and clear session cookie',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Logged out successfully' },
        },
      },
    },

    // ─── APPOINTMENTS ──────────────────────────────────────────────────────────
    '/appointments': {
      post: {
        tags: ['Appointments'],
        summary: 'Book a new appointment (Patient)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['doctorId', 'date', 'timeSlot'],
                properties: {
                  doctorId: { type: 'string', example: '66a1234567890123456789ab' },
                  date: { type: 'string', format: 'date', example: '2026-07-24' },
                  timeSlot: {
                    type: 'object',
                    properties: {
                      start: { type: 'string', example: '10:00' },
                      end: { type: 'string', example: '10:15' },
                    },
                  },
                  patientNotes: { type: 'string', example: 'Routine checkup' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Appointment booked and assigned queue number' },
          400: { description: 'Time slot already booked' },
        },
      },
    },
    '/appointments/my': {
      get: {
        tags: ['Appointments'],
        summary: 'Get appointment history for the logged-in user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of appointments' },
        },
      },
    },
    '/appointments/{id}/status': {
      put: {
        tags: ['Appointments'],
        summary: 'Update appointment status (Doctor/Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['in-progress', 'completed', 'no-show', 'cancelled'] },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Status updated' },
        },
      },
    },

    // ─── SMART QUEUE ───────────────────────────────────────────────────────────
    '/queues/{doctorId}': {
      get: {
        tags: ['Smart Queue'],
        summary: "Get doctor's active live queue status",
        parameters: [
          { name: 'doctorId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'Queue status and active waiting items' },
        },
      },
    },
    '/queues/{doctorId}/position/{appointmentId}': {
      get: {
        tags: ['Smart Queue'],
        summary: "Get patient's 1-based queue position and estimated wait time",
        parameters: [
          { name: 'doctorId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'appointmentId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Calculated position & estimated wait minutes' },
        },
      },
    },
    '/queues/{doctorId}/advance': {
      post: {
        tags: ['Smart Queue'],
        summary: 'Call next waiting patient in queue (Doctor)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'doctorId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Queue advanced and next patient notified via Socket & Push' },
        },
      },
    },
    '/queues/{doctorId}/delay': {
      post: {
        tags: ['Smart Queue'],
        summary: 'Announce doctor delay in minutes (Doctor/Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'doctorId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['minutes'],
                properties: {
                  minutes: { type: 'number', example: 15 },
                  reason: { type: 'string', example: 'Emergency procedure' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Delay recorded and broadcasted to waiting patients' },
        },
      },
    },
    '/queues/{doctorId}/emergency': {
      post: {
        tags: ['Smart Queue'],
        summary: 'Bump an appointment to Emergency Priority (#1 in waiting queue)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'doctorId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['appointmentId'],
                properties: {
                  appointmentId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Bumped to Emergency Priority' },
        },
      },
    },
    '/queues/{doctorId}/board': {
      get: {
        tags: ['Smart Queue'],
        summary: 'Public Waiting Room Queue Board display endpoint',
        parameters: [
          { name: 'doctorId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Public ticket display data' },
        },
      },
    },

    // ─── DOCTORS ───────────────────────────────────────────────────────────────
    '/doctors': {
      get: {
        tags: ['Doctors'],
        summary: 'List doctors (filterable by specialty & availability)',
        parameters: [
          { name: 'specialty', in: 'query', schema: { type: 'string' } },
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'List of doctors' },
        },
      },
    },
    '/doctors/{id}/slots': {
      get: {
        tags: ['Doctors'],
        summary: 'Get available 15/30-min time slots for a doctor on a specific date',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: { description: 'Array of available slot strings' },
        },
      },
    },

    // ─── PATIENTS & NOTIFICATIONS ──────────────────────────────────────────────
    '/notifications/fcm-token': {
      post: {
        tags: ['Patients'],
        summary: 'Register FCM Device Token for Web/Mobile Push Notifications',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fcmToken'],
                properties: {
                  fcmToken: { type: 'string', example: 'fcm_token_string_here' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'FCM Token registered' },
        },
      },
    },

    // ─── ADMIN ─────────────────────────────────────────────────────────────────
    '/admin/stats': {
      get: {
        tags: ['Admin'],
        summary: 'Get system-wide KPI overview statistics (Admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Total Users, Doctors, Patients, Appointments, Revenue' },
        },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List & search all system users with role filter (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['patient', 'doctor', 'admin'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Paginated user list' },
        },
      },
    },
    '/admin/departments': {
      get: {
        tags: ['Admin'],
        summary: 'List clinical departments',
        responses: {
          200: { description: 'List of departments' },
        },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create a new clinical department (Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'Cardiology' },
                  description: { type: 'string' },
                  icon: { type: 'string', example: '❤️' },
                  headDoctorId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Department created' },
        },
      },
    },
    '/admin/analytics': {
      get: {
        tags: ['Admin'],
        summary: 'Get appointment volume, revenue trends, and status analytics (Admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'System performance analytics' },
        },
      },
    },
  },
};

const setupSwagger = (app) => {
  // Serve interactive UI at /api-docs
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Serve raw JSON spec at /api-docs/json
  app.get('/api-docs/json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📑 Swagger API Documentation available on http://localhost:5000/api-docs');
};

module.exports = { setupSwagger, swaggerSpec };
