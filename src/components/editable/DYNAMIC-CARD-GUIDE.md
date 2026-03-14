# Dynamic Card Content Builder

The `DynamicCard` component allows users to build custom card content by adding different types of content blocks in edit mode.

## Features

- **Add Content Blocks**: Click the '+' button to add:
  - Images
  - Body text
  - Titles (headings)
  - Buttons
  - Videos

- **Reorder Blocks**: Move blocks up/down using arrow buttons
- **Edit Content**: All content is editable in edit mode
- **Delete Blocks**: Remove unwanted content blocks
- **Persistent**: All changes are saved to the database

## Usage

```tsx
import { DynamicCard } from '@/components/editable';

<DynamicCard 
  pageName="home" 
  cardId="feature-card-1"
  className="shadow-lg"
/>
```

## Example in a Section

```tsx
import { DynamicCard } from '@/components/editable';

const FeaturesSection = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold mb-8">Features</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <DynamicCard 
            pageName="features" 
            cardId="card-1"
          />
          <DynamicCard 
            pageName="features" 
            cardId="card-2"
          />
          <DynamicCard 
            pageName="features" 
            cardId="card-3"
          />
        </div>
      </div>
    </section>
  );
};
```

## How It Works

### In Edit Mode:
1. Click the "Add Content Block" button (with + icon)
2. Choose a content type from the dialog
3. The new block appears with default content
4. Click on the content to edit it
5. Use arrow buttons to reorder blocks
6. Use trash icon to delete blocks

### For Visitors (Non-Edit Mode):
- Only the content is displayed
- No editing controls visible
- Clean, professional appearance

## Content Types

### Image
- Default: placeholder image
- Editable: Click to change image
- Displays as full-width, auto-height, rounded

### Body Text
- Default: "Enter your text here..."
- Editable: Click to edit text
- Regular paragraph styling

### Title
- Default: "Your Title Here"
- Editable: Click to edit
- Large, bold heading (h3)

### Button
- Default text: "Click Me"
- Editable: Click to edit button text
- Full-width button style

### Video
- Default: empty (add URL in edit mode)
- Editable: Click to add video URL
- Full-width, rounded player

## Database Storage

Content blocks are stored in the `page_content` table:
- `page_name`: Identifies the page
- `section_name`: Uses the `cardId` as the section
- `content_key`: Unique block ID (e.g., `block_1234567890`)
- `content_value`: JSON with `{type, content, order}`

## Props

### DynamicCard

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| pageName | string | Yes | Unique identifier for the page |
| cardId | string | Yes | Unique identifier for this card |
| className | string | No | Additional CSS classes |

## Tips

- Use unique `cardId` values for each card on the same page
- Content persists across sessions
- Works seamlessly with other editable components
- Responsive and mobile-friendly
- Blocks maintain order even after page refresh
