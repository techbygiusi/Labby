// User Roles
const ROLES = {
  ADMIN: 'admin',
  USER: 'user'
};

// Assignment types
const ASSIGNMENT_TYPES = {
  GROUP: 'group',
  USER: 'user'
};

// Container types
const CONTAINER_TYPES = {
  VM: 'qemu',
  LXC: 'lxc'
};

// Container status
const CONTAINER_STATUS = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  PAUSED: 'paused',
  SUSPENDED: 'suspended'
};

// API response codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  GONE: 410,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
};

// Error messages
const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_EXISTS: 'User with this email already exists',
  USER_NOT_FOUND: 'User not found',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  SETUP_ALREADY_COMPLETED: 'Setup has already been completed',
  SETUP_REQUIRED: 'Setup wizard is required',
  INVALID_TOKEN: 'Invalid or expired token',
  SERVER_ERROR: 'Internal server error'
};

module.exports = {
  ROLES,
  ASSIGNMENT_TYPES,
  CONTAINER_TYPES,
  CONTAINER_STATUS,
  HTTP_STATUS,
  ERROR_MESSAGES
};
