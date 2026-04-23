// web/tests/mocks/handlers.js
/**
 * MSW Request Handlers
 * 
 * Define API mocks here that will be used across all tests.
 * These handlers intercept HTTP requests and return mock responses.
 */

import { http, HttpResponse } from 'msw';

// Base API URL
const API_BASE = '/api';

/**
 * Default handlers - used when no specific override is set
 */
export const handlers = [
  // ============================================
  // Authentication Endpoints
  // ============================================
  
  // POST /api/auth/login
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json();
    
    // Validate credentials (mock validation)
    if (body.username === 'testuser' && body.password === 'password123') {
      return HttpResponse.json({
        token: 'mock-jwt-token-12345',
        user: {
          id: 1,
          username: 'testuser',
          role: 'parent'
        }
      });
    }
    
    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }),
  
  // POST /api/auth/register
  http.post(`${API_BASE}/auth/register`, async ({ request }) => {
    const body = await request.json();
    
    // Check for duplicate username
    if (body.username === 'existinguser') {
      return HttpResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }
    
    return HttpResponse.json({
      token: 'mock-jwt-token-new',
      user: {
        id: 999,
        username: body.username,
        role: 'parent'
      }
    }, { status: 201 });
  }),
  
  // GET /api/auth/me
  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return HttpResponse.json({
      id: 1,
      username: 'testuser',
      role: 'parent',
      email: 'test@example.com'
    });
  }),
  
  // POST /api/auth/logout
  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),
  
  // GET /api/csrf-token
  http.get(`${API_BASE}/csrf-token`, () => {
    return HttpResponse.json({
      csrfToken: 'mock-csrf-token-12345'
    });
  }),
  
  // ============================================
  // User Endpoints
  // ============================================
  
  // GET /api/users/me
  http.get(`${API_BASE}/users/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return HttpResponse.json({
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'parent',
      created_at: '2024-01-01T00:00:00Z'
    });
  }),
  
  // PUT /api/users/me
  http.put(`${API_BASE}/users/me`, async ({ request }) => {
    const body = await request.json();
    
    return HttpResponse.json({
      id: 1,
      username: body.username || 'testuser',
      email: body.email || 'test@example.com',
      role: 'parent'
    });
  }),
  
  // ============================================
  // Children Endpoints
  // ============================================
  
  // GET /api/children
  http.get(`${API_BASE}/children`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return HttpResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return HttpResponse.json([
      {
        id: 1,
        name: 'Alice',
        age: 8,
        daily_limit_minutes: 120,
        current_screen_time: 45,
        used_seconds: 45 * 60,
        devices: [
          {
            id: 101,
            device_name: "Alice's Tablet",
            device_type: 'android'
          }
        ],
        blocked_apps: ['tiktok'],
        always_allowed_apps: ['calculator']
      },
      {
        id: 2,
        name: 'Bob',
        age: 10,
        daily_limit_minutes: 180,
        current_screen_time: 90,
        used_seconds: 90 * 60,
        devices: [],
        blocked_apps: [],
        always_allowed_apps: []
      }
    ]);
  }),
  
  // GET /api/children/:id
  http.get(`${API_BASE}/children/:id`, ({ params }) => {
    return HttpResponse.json({
      id: parseInt(params.id),
      name: 'Alice',
      age: 8,
      daily_limit_minutes: 120,
      current_screen_time: 45,
      categories: [1, 2, 3]
    });
  }),
  
  // POST /api/children
  http.post(`${API_BASE}/children`, async ({ request }) => {
    const body = await request.json();
    
    return HttpResponse.json({
      id: 999,
      ...body,
      created_at: new Date().toISOString()
    }, { status: 201 });
  }),
  
  // ============================================
  // Health Check
  // ============================================
  
  // GET /api/health
  http.get(`${API_BASE}/health`, () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  }),
  
  // ============================================
  // Dashboard Endpoints
  // ============================================
  
  // GET /api/dashboard/stats
  http.get(`${API_BASE}/dashboard/stats`, () => {
    return HttpResponse.json({
      total_children: 2,
      total_screen_time_today: 135,
      active_sessions: 1,
      pending_rewards: 3
    });
  }),

  // ============================================
  // Device Endpoints
  // ============================================

  // GET /api/devices
  http.get(`${API_BASE}/devices`, () => {
    return HttpResponse.json([
      {
        id: 101,
        device_name: "Alice's Tablet",
        device_type: 'android',
        child_id: 1,
        last_seen: new Date().toISOString(),
        used_seconds: 2700,
        policy_json: {
          dailyLimitMinutes: 120,
          blockedApps: ['tiktok', 'youtube'],
          alwaysAllowedApps: ['calculator']
        }
      },
      {
        id: 102,
        device_name: "Unassigned Phone",
        device_type: 'ios',
        child_id: null,
        last_seen: new Date().toISOString(),
        used_seconds: 0,
        policy_json: {}
      }
    ]);
  }),

  // PUT /api/devices/:id/assign
  http.put(`${API_BASE}/devices/:id/assign`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      deviceId: params.id,
      childId: body.childId
    });
  }),
  
  // ============================================
  // Bonus Time Endpoints
  // ============================================
  
  // GET /api/bonus-time/available
  http.get(`${API_BASE}/bonus-time/available`, ({ request }) => {
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId');
    
    // Return different bonus for different children
    if (childId === '1') {
      return HttpResponse.json({
        totalMinutes: 30,
        grantCount: 2
      });
    }
    
    return HttpResponse.json({
      totalMinutes: 0,
      grantCount: 0
    });
  }),
  
  // ============================================
  // Notification Endpoints
  // ============================================
  
  // GET /api/notifications
  http.get(`${API_BASE}/notifications`, () => {
    return HttpResponse.json([
      {
        id: 1,
        title: 'Screen Time Alert',
        message: 'Alice has 10 minutes left',
        read: false,
        created_at: new Date().toISOString()
      }
    ]);
  }),
  
  // GET /api/notifications/unread-count
  http.get(`${API_BASE}/notifications/unread-count`, () => {
    return HttpResponse.json({ count: 1 });
  }),

  // ============================================
  // Profile Endpoints
  // ============================================

  // GET /api/profile
  http.get(`${API_BASE}/profile`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json({
      id: 1,
      full_name: 'Test User',
      email: 'test@example.com',
      bio: 'A parent using ScreenSprout'
    });
  }),

  // PUT /api/profile
  http.put(`${API_BASE}/profile`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 1,
      full_name: body.full_name || 'Test User',
      email: body.email || 'test@example.com',
      bio: body.bio || ''
    });
  }),

  // GET /api/share
  http.get(`${API_BASE}/share`, () => {
    return HttpResponse.json([
      { id: 1, viewer_email: 'partner@example.com', status: 'accepted' },
      { id: 2, viewer_email: 'grandparent@example.com', status: 'pending' }
    ]);
  }),

  // POST /api/share/invite
  http.post(`${API_BASE}/share/invite`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 3,
      viewer_email: body.viewerEmail,
      status: 'pending'
    }, { status: 201 });
  }),

  // ============================================
  // Settings Endpoints
  // ============================================

  // GET /api/settings/default-policy
  http.get(`${API_BASE}/settings/default-policy`, () => {
    return HttpResponse.json({
      dailyLimitMinutes: 120,
      blockedApps: ['tiktok', 'snapchat'],
      alwaysAllowedApps: ['calculator', 'duolingo']
    });
  }),

  // PUT /api/settings/default-policy
  http.put(`${API_BASE}/settings/default-policy`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      dailyLimitMinutes: body.dailyLimitMinutes,
      blockedApps: body.blockedApps || [],
      alwaysAllowedApps: body.alwaysAllowedApps || []
    });
  }),

  // GET /api/settings/theme
  http.get(`${API_BASE}/settings/theme`, () => {
    return HttpResponse.json({ theme: 'system' });
  }),

  // PUT /api/settings/theme
  http.put(`${API_BASE}/settings/theme`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ theme: body.theme });
  }),

  // GET /api/settings/export-data
  http.get(`${API_BASE}/settings/export-data`, () => {
    return HttpResponse.json({
      user: { id: 1, username: 'testuser' },
      children: [],
      devices: [],
      exportedAt: new Date().toISOString()
    });
  }),

  // POST /api/auth/change-password
  http.post(`${API_BASE}/auth/change-password`, async ({ request }) => {
    const body = await request.json();
    if (body.currentPassword === 'wrongpassword') {
      return HttpResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }
    return HttpResponse.json({ message: 'Password changed successfully' });
  }),

  // DELETE /api/auth/account
  http.delete(`${API_BASE}/auth/account`, () => {
    return HttpResponse.json({ message: 'Account deleted' });
  }),

  // ============================================
  // Notification Endpoints (Detailed)
  // ============================================

  // GET /api/notifications?limit=
  http.get(`${API_BASE}/notifications`, () => {
    return HttpResponse.json([
      {
        id: 1,
        title: 'Screen Time Alert',
        message: 'Alice has 10 minutes left',
        type: 'time_limit',
        is_read: false,
        created_at: new Date().toISOString(),
        child_name: 'Alice'
      },
      {
        id: 2,
        title: 'Blocked App Attempt',
        message: 'Bob tried to open TikTok',
        type: 'blocked_app',
        is_read: true,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        child_name: 'Bob'
      },
      {
        id: 3,
        title: 'Goal Completed',
        message: 'Alice completed reading goal',
        type: 'goal_completed',
        is_read: false,
        created_at: new Date(Date.now() - 172800000).toISOString(),
        child_name: 'Alice'
      }
    ]);
  }),

  // PUT /api/notifications/:id/read
  http.put(`${API_BASE}/notifications/:id/read`, ({ params }) => {
    return HttpResponse.json({ id: params.id, is_read: true });
  }),

  // PUT /api/notifications/read-all
  http.put(`${API_BASE}/notifications/read-all`, () => {
    return HttpResponse.json({ message: 'All notifications marked as read' });
  }),

  // DELETE /api/notifications/:id
  http.delete(`${API_BASE}/notifications/:id`, ({ params }) => {
    return HttpResponse.json({ message: `Notification ${params.id} deleted` });
  }),

  // ============================================
  // Reports Endpoints
  // ============================================

  // GET /api/reports/activity
  http.get(`${API_BASE}/reports/activity`, () => {
    return HttpResponse.json([
      { date: '2024-01-01', child_name: 'Alice', screen_time: 90, apps_used: 5 },
      { date: '2024-01-02', child_name: 'Alice', screen_time: 120, apps_used: 8 }
    ]);
  }),

  // GET /api/reports/summary
  http.get(`${API_BASE}/reports/summary`, () => {
    return HttpResponse.json({
      totalScreenTime: 210,
      averageDaily: 105,
      topApps: ['YouTube', 'Games', 'Education'],
      topCategories: ['Entertainment', 'Education']
    });
  }),

  // ============================================
  // Schedule Endpoints
  // ============================================

  // GET /api/schedules
  http.get(`${API_BASE}/schedules`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'School Days',
        days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        start_time: '08:00',
        end_time: '15:00',
        child_id: 1
      },
      {
        id: 2,
        name: 'Weekend Free',
        days: ['sat', 'sun'],
        start_time: '09:00',
        end_time: '18:00',
        child_id: 1
      }
    ]);
  }),

  // POST /api/schedules
  http.post(`${API_BASE}/schedules`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 999, ...body }, { status: 201 });
  }),

  // DELETE /api/schedules/:id
  http.delete(`${API_BASE}/schedules/:id`, ({ params }) => {
    return HttpResponse.json({ message: `Schedule ${params.id} deleted` });
  }),

  // ============================================
  // Categories Endpoints
  // ============================================

  // GET /api/categories
  http.get(`${API_BASE}/categories`, () => {
    return HttpResponse.json([
      { id: 1, name: 'Education', color: '#2563EB', icon: 'book', allowed: true },
      { id: 2, name: 'Games', color: '#ef4444', icon: 'gamepad', allowed: false },
      { id: 3, name: 'Social', color: '#8b5cf6', icon: 'users', allowed: false }
    ]);
  }),

  // PUT /api/categories/:id
  http.put(`${API_BASE}/categories/:id`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: parseInt(params.id), ...body });
  }),

  // ============================================
  // Goals & Rewards Endpoints
  // ============================================

  // GET /api/goals
  http.get(`${API_BASE}/goals`, () => {
    return HttpResponse.json([
      {
        id: 1,
        title: 'Read 30 minutes',
        description: 'Read books for 30 minutes daily',
        target: 30,
        progress: 20,
        child_id: 1,
        status: 'active'
      },
      {
        id: 2,
        title: 'Complete homework',
        description: 'Finish all school assignments',
        target: 100,
        progress: 100,
        child_id: 1,
        status: 'completed'
      }
    ]);
  }),

  // POST /api/goals
  http.post(`${API_BASE}/goals`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 999, ...body }, { status: 201 });
  }),

  // GET /api/rewards
  http.get(`${API_BASE}/rewards`, () => {
    return HttpResponse.json([
      {
        id: 1,
        title: 'Extra Game Time',
        description: '30 minutes of extra gaming',
        points: 50,
        child_id: 1,
        status: 'available'
      },
      {
        id: 2,
        title: 'Movie Night',
        description: 'Choose the family movie',
        points: 100,
        child_id: 1,
        status: 'redeemed'
      }
    ]);
  }),

  // POST /api/rewards/:id/redeem
  http.post(`${API_BASE}/rewards/:id/redeem`, ({ params }) => {
    return HttpResponse.json({
      message: 'Reward redeemed successfully',
      rewardId: params.id
    });
  }),

  // ============================================
  // Time Requests Endpoints
  // ============================================

  // GET /api/time-requests
  http.get(`${API_BASE}/time-requests`, () => {
    return HttpResponse.json([
      {
        id: 1,
        child_id: 1,
        child_name: 'Alice',
        requested_minutes: 30,
        reason: 'Need to finish homework',
        status: 'pending',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        child_id: 2,
        child_name: 'Bob',
        requested_minutes: 60,
        reason: 'Weekend gaming',
        status: 'approved',
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ]);
  }),

  // PUT /api/time-requests/:id/approve
  http.put(`${API_BASE}/time-requests/:id/approve`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      status: 'approved',
      approved_at: new Date().toISOString()
    });
  }),

  // PUT /api/time-requests/:id/deny
  http.put(`${API_BASE}/time-requests/:id/deny`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      status: 'denied',
      denied_at: new Date().toISOString()
    });
  }),

  // ============================================
  // Location Tracking Endpoints
  // ============================================

  // GET /api/location/children/:id
  http.get(`${API_BASE}/location/children/:id`, ({ params }) => {
    return HttpResponse.json({
      child_id: parseInt(params.id),
      current_location: {
        lat: 40.7128,
        lng: -74.0060,
        accuracy: 10,
        timestamp: new Date().toISOString()
      },
      geofences: [
        { id: 1, name: 'Home', lat: 40.7128, lng: -74.0060, radius: 100 },
        { id: 2, name: 'School', lat: 40.7580, lng: -73.9855, radius: 200 }
      ],
      location_history: [
        { lat: 40.7128, lng: -74.0060, timestamp: new Date(Date.now() - 3600000).toISOString() },
        { lat: 40.7580, lng: -73.9855, timestamp: new Date(Date.now() - 7200000).toISOString() }
      ]
    });
  }),

  // ============================================
  // Web Filtering Endpoints
  // ============================================

  // GET /api/web-filtering/rules
  http.get(`${API_BASE}/web-filtering/rules`, () => {
    return HttpResponse.json([
      {
        id: 1,
        type: 'block',
        pattern: '*.socialmedia.com',
        category: 'social',
        enabled: true
      },
      {
        id: 2,
        type: 'allow',
        pattern: '*.edu',
        category: 'education',
        enabled: true
      }
    ]);
  }),

  // GET /api/web-filtering/categories
  http.get(`${API_BASE}/web-filtering/categories`, () => {
    return HttpResponse.json([
      { id: 'social', name: 'Social Media', blocked: true, icon: 'users' },
      { id: 'gaming', name: 'Gaming', blocked: true, icon: 'gamepad' },
      { id: 'education', name: 'Education', blocked: false, icon: 'book' }
    ]);
  }),

  // ============================================
  // Audit Logs Endpoints
  // ============================================

  // GET /api/audit-logs
  http.get(`${API_BASE}/audit-logs`, () => {
    return HttpResponse.json([
      {
        id: 1,
        action: 'login',
        user: 'testuser',
        ip: '192.168.1.1',
        timestamp: new Date().toISOString(),
        details: 'Successful login from web'
      },
      {
        id: 2,
        action: 'policy_update',
        user: 'testuser',
        ip: '192.168.1.1',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        details: 'Updated screen time policy for Alice'
      }
    ]);
  }),

  // ============================================
  // Webhooks Endpoints
  // ============================================

  // GET /api/webhooks
  http.get(`${API_BASE}/webhooks`, () => {
    return HttpResponse.json([
      {
        id: 1,
        url: 'https://example.com/webhook',
        events: ['time_limit_reached', 'blocked_app_attempt'],
        secret: 'whsec_********',
        active: true,
        created_at: new Date().toISOString()
      }
    ]);
  }),

  // POST /api/webhooks
  http.post(`${API_BASE}/webhooks`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 999, ...body, active: true }, { status: 201 });
  }),

  // DELETE /api/webhooks/:id
  http.delete(`${API_BASE}/webhooks/:id`, ({ params }) => {
    return HttpResponse.json({ message: `Webhook ${params.id} deleted` });
  })
];

/**
 * Error handlers - for testing error scenarios
 */
export const errorHandlers = [
  // Simulate server error
  http.get(`${API_BASE}/health`, () => {
    return HttpResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }),
  
  // Simulate network error
  http.get(`${API_BASE}/children`, () => {
    return HttpResponse.error();
  })
];

/**
 * Empty handlers - for testing empty states
 */
export const emptyHandlers = [
  http.get(`${API_BASE}/children`, () => {
    return HttpResponse.json([]);
  })
];
