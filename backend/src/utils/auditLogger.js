/**
 * @fileoverview SOC Analyst Audit Logger — SIEM-ready structured JSON logging.
 * Logs security-relevant events, access violations, privilege escalations,
 * authentication attempts, and system anomalies for security operations center monitoring.
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');
const AUDIT_LOG_FILE = path.join(LOG_DIR, 'security-audit.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Event Severity Levels (SOC Taxonomy)
 */
const SEVERITY = {
  INFO: 'INFO',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

/**
 * Extract client IP address safely from Request headers or socket
 */
const getClientIP = (req) => {
  if (!req) return '0.0.0.0';
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    '0.0.0.0'
  );
};

/**
 * Write SIEM JSON Log Entry
 */
const logSecurityEvent = ({
  eventType,
  severity = SEVERITY.INFO,
  message,
  req = null,
  userId = null,
  userRole = 'anonymous',
  metadata = {},
}) => {
  const timestamp = new Date().toISOString();
  const ipAddress = getClientIP(req);
  const userAgent = req?.headers ? req.headers['user-agent'] || 'unknown' : 'system';
  const requestMethod = req?.method || 'N/A';
  const requestPath = req?.originalUrl || req?.url || 'N/A';

  const auditEntry = {
    timestamp,
    event_type: eventType,
    severity,
    message,
    actor: {
      user_id: userId || req?.user?._id || req?.user?.id || 'anonymous',
      role: userRole || req?.user?.role || 'anonymous',
    },
    network: {
      client_ip: ipAddress,
      user_agent: userAgent,
    },
    http: {
      method: requestMethod,
      path: requestPath,
    },
    metadata,
  };

  const jsonString = JSON.stringify(auditEntry);

  // Print formatted colored output to console
  const color =
    severity === SEVERITY.CRITICAL
      ? '\x1b[41m\x1b[37m' // red bg
      : severity === SEVERITY.HIGH
      ? '\x1b[31m' // red
      : severity === SEVERITY.MEDIUM
      ? '\x1b[33m' // yellow
      : '\x1b[36m'; // cyan

  console.log(`${color}[SOC AUDIT ${severity}]\x1b[0m ${eventType}: ${message} | IP: ${ipAddress} | Actor: ${auditEntry.actor.user_id}`);

  // File append for SIEM / Logstash / Splunk forwarders
  fs.appendFile(AUDIT_LOG_FILE, jsonString + '\n', (err) => {
    if (err) console.error('Failed to write audit log:', err.message);
  });
};

module.exports = {
  logSecurityEvent,
  SEVERITY,
};
