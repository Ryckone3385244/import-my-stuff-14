import { z } from "zod";
import { VALIDATION_LIMITS } from "./constants";

/**
 * Helper function to count words in text
 */
export const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Validation schema for exhibitor data
 */
export const exhibitorSchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(VALIDATION_LIMITS.COMPANY_NAME, `Company name must be less than ${VALIDATION_LIMITS.COMPANY_NAME} characters`),
  account_number: z.string().trim().min(1, "Account number is required").max(VALIDATION_LIMITS.ACCOUNT_NUMBER, `Account number must be less than ${VALIDATION_LIMITS.ACCOUNT_NUMBER} characters`),
  booth_number: z.string().trim().min(1, "Booth number is required").max(VALIDATION_LIMITS.BOOTH_NUMBER, `Booth number must be less than ${VALIDATION_LIMITS.BOOTH_NUMBER} characters`),
  contact_full_name: z.string().trim().min(1, "Exhibitor contact name is required").max(VALIDATION_LIMITS.CONTACT_NAME, `Contact name must be less than ${VALIDATION_LIMITS.CONTACT_NAME} characters`),
  contact_mobile: z.string().trim().min(1, "Mobile number is required").max(VALIDATION_LIMITS.MOBILE, `Mobile number must be less than ${VALIDATION_LIMITS.MOBILE} characters`),
  contact_email: z.string().trim().email("Invalid email address").min(1, "Email address is required").max(VALIDATION_LIMITS.EMAIL, `Email must be less than ${VALIDATION_LIMITS.EMAIL} characters`),
  address_street: z.string().trim().min(1, "Street address is required").max(VALIDATION_LIMITS.STREET_ADDRESS, `Street address must be less than ${VALIDATION_LIMITS.STREET_ADDRESS} characters`),
  address_city: z.string().trim().min(1, "City is required").max(VALIDATION_LIMITS.CITY, `City must be less than ${VALIDATION_LIMITS.CITY} characters`),
  address_postcode: z.string().trim().min(1, "Postcode is required").max(VALIDATION_LIMITS.POSTCODE, `Postcode must be less than ${VALIDATION_LIMITS.POSTCODE} characters`),
  address_country: z.string().trim().min(1, "Country is required").max(VALIDATION_LIMITS.COUNTRY, `Country must be less than ${VALIDATION_LIMITS.COUNTRY} characters`),
  description: z.preprocess(
    (val) => (val === null || val === undefined ? undefined : val),
    z.string().optional()
  ),
  website: z.string().url("Must be a valid URL").max(VALIDATION_LIMITS.WEBSITE_URL, `Website URL must be less than ${VALIDATION_LIMITS.WEBSITE_URL} characters`).optional().or(z.literal("")),
});

/**
 * Validation schema for speaker data
 */
export const speakerSchema = z.object({
  name: z.string().trim().min(1, "Speaker name is required").max(VALIDATION_LIMITS.CONTACT_NAME, `Name must be less than ${VALIDATION_LIMITS.CONTACT_NAME} characters`),
  bio: z.string().trim().optional().or(z.literal("")),
  title: z.string().trim().max(VALIDATION_LIMITS.TITLE, `Title must be less than ${VALIDATION_LIMITS.TITLE} characters`).optional().or(z.literal("")),
  company: z.string().trim().min(1, "Company is required").max(VALIDATION_LIMITS.COMPANY_NAME, `Company must be less than ${VALIDATION_LIMITS.COMPANY_NAME} characters`),
  photo_url: z.string().optional(),
  company_logo_url: z.string().optional(),
  email: z.string().email("Must be a valid email").max(VALIDATION_LIMITS.EMAIL, `Email must be less than ${VALIDATION_LIMITS.EMAIL} characters`).optional().or(z.literal("")),
  phone: z.string().max(VALIDATION_LIMITS.PHONE, `Phone must be less than ${VALIDATION_LIMITS.PHONE} characters`).optional().or(z.literal("")),
  seminar_title: z.string().trim().optional().or(z.literal("")),
  seminar_description: z.string().trim().optional().or(z.literal("")),
  linkedin_url: z.string().url("Must be a valid URL").max(VALIDATION_LIMITS.WEBSITE_URL, `LinkedIn URL must be less than ${VALIDATION_LIMITS.WEBSITE_URL} characters`).optional().or(z.literal("")),
});

/**
 * Validation schema for supplier data
 */
export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required").max(VALIDATION_LIMITS.COMPANY_NAME, `Name must be less than ${VALIDATION_LIMITS.COMPANY_NAME} characters`),
  description: z.string().optional(),
  logo_url: z.string().max(VALIDATION_LIMITS.WEBSITE_URL, `Logo URL must be less than ${VALIDATION_LIMITS.WEBSITE_URL} characters`).optional(),
  button_text: z.string().max(VALIDATION_LIMITS.ACCOUNT_NUMBER, `Button text must be less than ${VALIDATION_LIMITS.ACCOUNT_NUMBER} characters`).optional(),
  button_url: z.string().url("Must be a valid URL").max(VALIDATION_LIMITS.WEBSITE_URL, `Button URL must be less than ${VALIDATION_LIMITS.WEBSITE_URL} characters`).optional().or(z.literal("")),
});

/**
 * Validation schema for user creation
 */
export const userCreationSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(VALIDATION_LIMITS.EMAIL, `Email must be less than ${VALIDATION_LIMITS.EMAIL} characters`),
  password: z.string().min(6, "Password must be at least 6 characters").max(VALIDATION_LIMITS.ACCOUNT_NUMBER, `Password must be less than ${VALIDATION_LIMITS.ACCOUNT_NUMBER} characters`),
});
