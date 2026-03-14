// Application-wide constants

// Default Event Settings
export const DEFAULT_EVENT = {
  NAME: "Event Name",
  DATE: "Date TBC",
  LOCATION: "Venue TBC",
  ADDRESS_LINE_1: "",
  ADDRESS_LINE_2: "",
  ADDRESS_LINE_3: "",
  EMAIL: "",
  PHONE: "",
  PHONE_FORMATTED: "",
} as const;

// Default Statistics
export const DEFAULT_STATS = {
  ATTENDEES: "15,000+",
  EXHIBITORS: "400+",
  SPEAKERS: "150+",
  SESSIONS: "50+",
} as const;

// Portal Routes
export const PORTAL_ROUTES = {
  EXHIBITOR_PREFIX: "/exhibitor/",
  SPEAKER_PREFIX: "/speaker/",
  ADMIN_PREFIX: "/admin",
} as const;

// Validation Limits
// Note: DESCRIPTION, BIO_WORDS, SEMINAR_TITLE_WORDS, SEMINAR_DESCRIPTION_WORDS removed - no limits on these fields
export const VALIDATION_LIMITS = {
  COMPANY_NAME: 200,
  ACCOUNT_NUMBER: 100,
  BOOTH_NUMBER: 50,
  CONTACT_NAME: 200,
  MOBILE: 50,
  EMAIL: 255,
  STREET_ADDRESS: 500,
  CITY: 100,
  POSTCODE: 20,
  COUNTRY: 100,
  WEBSITE_URL: 500,
  TITLE: 200,
  PHONE: 50,
} as const;

// Accessibility Labels
export const ARIA_LABELS = {
  MENU_TOGGLE: "Toggle navigation menu",
  CLOSE_MENU: "Close navigation menu",
  LOGOUT: "Sign out",
  EDIT_MODE: "Toggle edit mode",
  DELETE: "Delete item",
  EDIT: "Edit item",
  VIEW: "View details",
  UPLOAD: "Upload file",
  DOWNLOAD: "Download file",
  SEARCH: "Search",
  FILTER: "Filter results",
  SORT: "Sort results",
} as const;

// Role Display Names - maps database role values to human-readable display names
// Note: The database role value "customer_service" must NOT be changed
export const ROLE_DISPLAY_NAMES = {
  customer_service: "Client Relations Manager",
  project_manager: "Project Manager",
  admin: "Admin",
  exhibitor: "Exhibitor",
  speaker: "Speaker",
  user: "User",
} as const;

// Role Abbreviations for badges and compact displays
export const ROLE_ABBREVIATIONS = {
  customer_service: "CRM",
  project_manager: "PM",
  admin: "A",
  exhibitor: "E",
  speaker: "S",
  user: "U",
} as const;

// Query Keys
export const QUERY_KEYS = {
  EVENT_SETTINGS: "event-settings",
  NAVBAR_MENU_ITEMS: "navbar-menu-items",
  FOOTER_MENU_ITEMS: "footer-menu-items",
  EXHIBITORS: "exhibitors",
  SPEAKERS: "speakers",
  USER_ROLE: "user-role",
  IS_ADMIN: "is-admin",
  IS_ADMIN_OR_CS_OR_PM: "is-admin-or-cs-or-pm",
} as const;
