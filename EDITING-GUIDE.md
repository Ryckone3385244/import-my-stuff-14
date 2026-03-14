# Front-End Editing System Guide

## Overview
This site now has a front-end editing system that allows authenticated users to edit content directly on the live pages without touching code.

## How to Use

### 1. Enable Edit Mode
1. Log in as an admin at `/login`
2. You'll see an "Edit Mode" button appear in the navigation bar
3. Click it to toggle edit mode ON (button turns blue)

### 2. Edit Text Content
- When edit mode is ON, hover over any editable text
- You'll see a pencil icon appear
- Click the text to start editing
- Make your changes
- Press Enter or click outside to save
- Press Escape to cancel

### 3. Change Images
- When edit mode is ON, hover over any editable image
- An "Change Image" button appears
- Click to upload a new image
- The image is automatically saved

### 4. Exit Edit Mode
- Click the "Edit Mode" button again to turn editing OFF
- Continue browsing normally

## For Developers

### Making Content Editable

#### Text Content
Replace regular text elements with `<EditableText>`:

```tsx
import { EditableText } from '@/components/editable/EditableText';

// Before:
<h2 className="text-4xl font-bold">Why Attend?</h2>

// After:
<EditableText
  pageName="home"
  sectionName="why-attend"
  contentKey="title"
  defaultValue="Why Attend?"
  className="text-4xl font-bold"
  as="h2"
/>
```

#### Images
Replace regular img tags with `<EditableImage>`:

```tsx
import { EditableImage } from '@/components/editable/EditableImage';

// Before:
<img src={speaker.photo} alt="Speaker" className="w-full h-64" />

// After:
<EditableImage
  pageName="home"
  sectionName="speakers"
  contentKey="speaker-1-photo"
  defaultSrc={speaker.photo}
  alt="Speaker"
  className="w-full h-64"
/>
```

### Component Props

#### EditableText
- `pageName`: Page identifier (e.g., "home", "about")
- `sectionName`: Section within the page (e.g., "hero", "stats")
- `contentKey`: Unique key for this content (e.g., "title", "description")
- `defaultValue`: Default text if nothing is saved
- `className`: CSS classes to apply
- `as`: HTML element type ('h1' | 'h2' | 'h3' | 'p' | 'span')

#### EditableImage
- `pageName`: Page identifier
- `sectionName`: Section within the page
- `contentKey`: Unique key for this content
- `defaultSrc`: Default image URL
- `alt`: Alt text for the image
- `className`: CSS classes to apply

## Database
All content is stored in the `page_content` table with the following structure:
- `page_name`: Which page the content is on
- `section_name`: Which section of the page
- `content_key`: Unique identifier for the content
- `content_value`: The actual content (text or image URL)
- `content_type`: 'text' or 'image'

## Security
- Only authenticated users can edit content
- Anyone can view the content
- All changes are saved to the database immediately
- Images are uploaded to Supabase Storage
