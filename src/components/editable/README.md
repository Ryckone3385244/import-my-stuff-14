# Editable Components

This directory contains reusable editable components that allow content to be edited in real-time when edit mode is enabled.

## Components

### EditableText
Basic editable text component. Can be used for any text content.

```tsx
<EditableText
  pageName="home"
  sectionName="hero"
  contentKey="title"
  defaultValue="Welcome to our site"
  className="text-4xl font-bold"
  as="h1"
/>
```

### EditableImage
Editable image component with upload/selection capabilities.

```tsx
<EditableImage
  pageName="home"
  sectionName="hero"
  contentKey="banner"
  defaultSrc="/images/default-banner.jpg"
  alt="Hero banner"
  className="w-full h-64 object-cover"
/>
```

### EditableIcon
Editable icon picker allowing selection from Lucide icon library.

```tsx
<EditableIcon
  pageName="features"
  sectionName="benefits"
  contentKey="speed-icon"
  defaultIcon="Zap"
  className="w-6 h-6 text-primary"
/>
```

### EditableVideo
Editable video/background video component.

```tsx
<EditableVideo
  pageName="home"
  sectionName="hero"
  contentKey="background"
  defaultVideoSrc="/videos/hero.mp4"
  className="absolute inset-0"
/>
```

### EditableCard
**NEW** - Complete card component with icon, title, and description.

```tsx
<EditableCard
  pageName="home"
  sectionName="features"
  cardId="feature-1"
  defaultIcon="Lightbulb"
  defaultTitle="Innovation"
  defaultDescription="Discover cutting-edge solutions"
/>
```

**Props:**
- `pageName` (string) - Page identifier for content storage
- `sectionName` (string) - Section identifier within the page
- `cardId` (string) - Unique ID for this card
- `defaultIcon` (string, optional) - Default Lucide icon name
- `defaultTitle` (string) - Default title text
- `defaultDescription` (string) - Default description text
- `className` (string, optional) - Custom card wrapper classes
- `iconClassName` (string, optional) - Custom icon classes
- `titleClassName` (string, optional) - Custom title classes
- `descriptionClassName` (string, optional) - Custom description classes
- `showIcon` (boolean, optional) - Whether to show icon, default true
- `children` (ReactNode, optional) - Additional content below description

### EditableListCard
**NEW** - Card with title and list of editable items (perfect for benefits, features).

```tsx
<EditableListCard
  pageName="registration"
  sectionName="benefits"
  cardId="early-bird"
  defaultTitle="Early Bird Benefits"
  items={[
    { id: "item-1", defaultText: "Discounted rates" },
    { id: "item-2", defaultText: "Priority access" }
  ]}
/>
```

**Props:**
- `pageName` (string) - Page identifier
- `sectionName` (string) - Section identifier
- `cardId` (string) - Unique card ID
- `defaultTitle` (string) - Card title
- `items` (ListItem[]) - Array of list items with id and defaultText
- `className` (string, optional) - Custom wrapper classes
- `titleClassName` (string, optional) - Custom title classes
- `itemClassName` (string, optional) - Custom item text classes
- `checkmarkClassName` (string, optional) - Custom checkmark classes
- `checkmarkSymbol` (string, optional) - Custom checkmark symbol, default "✓"

### EditableInfoCard
**NEW** - Simple info card with icon, title, and value (perfect for event details).

```tsx
<EditableInfoCard
  pageName="registration"
  sectionName="info"
  cardId="date"
  defaultIcon="Calendar"
  defaultTitle="Date"
  defaultValue="September 29-30, 2025"
/>
```

**Props:**
- `pageName` (string) - Page identifier
- `sectionName` (string) - Section identifier
- `cardId` (string) - Unique card ID
- `defaultIcon` (string) - Lucide icon name
- `defaultTitle` (string) - Card title
- `defaultValue` (string) - Card value/content
- `className` (string, optional) - Custom wrapper classes
- `iconClassName` (string, optional) - Custom icon classes
- `titleClassName` (string, optional) - Custom title classes
- `valueClassName` (string, optional) - Custom value classes

## Drag and Drop Sections

### DraggableSection
Wraps a section to make it draggable. In edit mode, a grip handle appears on the left side.

```tsx
<DraggableSection id="hero">
  <section className="py-20">
    <h1>Hero Section</h1>
  </section>
</DraggableSection>
```

### PageWithDraggableSections
**NEW** - High-level wrapper that handles all drag-and-drop logic for a page.

```tsx
<PageWithDraggableSections
  pageName="home"
  sections={[
    { id: 'hero', component: <HeroSection /> },
    { id: 'features', component: <FeaturesSection /> },
    { id: 'cta', component: <CTASection /> }
  ]}
/>
```

**How it works:**
- In edit mode, a bright grip handle appears fixed on the left side of the screen
- Click and drag the handle to reorder sections
- The order is automatically saved to the database
- When users return to the page, sections appear in the saved order

**Props:**
- `pageName` (string) - Unique identifier for the page
- `sections` (array) - Array of section objects with `id` and `component`
- `children` (ReactNode, optional) - Additional fixed content (e.g., footer)

**Example with full page:**

```tsx
const MyPage = () => {
  const sections = [
    { 
      id: 'hero', 
      component: (
        <section className="py-20 bg-primary">
          <h1>Hero Section</h1>
        </section>
      )
    },
    { 
      id: 'features', 
      component: (
        <section className="py-20">
          <h2>Features</h2>
        </section>
      )
    },
    { 
      id: 'testimonials', 
      component: (
        <section className="py-20 bg-accent">
          <h2>Testimonials</h2>
        </section>
      )
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <PageWithDraggableSections
          pageName="my-page"
          sections={sections}
        >
          {/* Fixed content that doesn't move */}
          <Footer />
        </PageWithDraggableSections>
      </main>
    </div>
  );
};
```

## Usage Guidelines

### When to use each component:

- **EditableText**: For standalone text content (headings, paragraphs, labels)
- **EditableImage**: For any image content that needs to be changeable
- **EditableIcon**: For icon-only elements or when you need just an icon picker
- **EditableVideo**: For video backgrounds or embedded videos
- **EditableCard**: For feature cards, product cards, service cards with icon + text
- **EditableListCard**: For benefit lists, feature lists, what's included sections
- **EditableInfoCard**: For event details (date, time, location), stats, quick info
- **DraggableSection**: For individual sections that need to be reorderable
- **PageWithDraggableSections**: For entire pages with multiple reorderable sections

### Best Practices:

1. **Use semantic naming**: Choose clear, descriptive values for `pageName`, `sectionName`, and `cardId`
2. **Be consistent**: Use the same naming patterns across your app
3. **Provide good defaults**: Always include meaningful default values
4. **Unique identifiers**: Ensure `cardId` and section `id` are unique within each section/page
5. **Appropriate components**: Choose the right card component for your use case
6. **Section ordering**: Use `PageWithDraggableSections` for any page where you want sections to be reorderable

### Example Page Structure:

```tsx
import { EditableCard } from '@/components/editable/EditableCard';
import { EditableListCard } from '@/components/editable/EditableListCard';
import { EditableInfoCard } from '@/components/editable/EditableInfoCard';
import { PageWithDraggableSections } from '@/components/editable/PageWithDraggableSections';

const MyPage = () => {
  // Define sections
  const heroSection = (
    <section className="py-20">
      <h1>Welcome</h1>
    </section>
  );

  const infoCardsSection = (
    <section className="py-12">
      <div className="grid md:grid-cols-3 gap-6">
        <EditableInfoCard
          pageName="event"
          sectionName="details"
          cardId="date"
          defaultIcon="Calendar"
          defaultTitle="Date"
          defaultValue="September 29-30, 2025"
        />
        <EditableInfoCard
          pageName="event"
          sectionName="details"
          cardId="location"
          defaultIcon="MapPin"
          defaultTitle="Location"
          defaultValue="ExCeL London"
        />
      </div>
    </section>
  );

  const featuresSection = (
    <section className="py-20">
      <div className="grid md:grid-cols-3 gap-6">
        <EditableCard
          pageName="features"
          sectionName="main"
          cardId="innovation"
          defaultIcon="Lightbulb"
          defaultTitle="Innovation"
          defaultDescription="Cutting-edge solutions for your business"
        />
      </div>
    </section>
  );

  const benefitsSection = (
    <section className="py-20">
      <div className="grid md:grid-cols-2 gap-6">
        <EditableListCard
          pageName="pricing"
          sectionName="benefits"
          cardId="premium"
          defaultTitle="Premium Benefits"
          items={[
            { id: "benefit-1", defaultText: "Priority support" },
            { id: "benefit-2", defaultText: "Advanced features" }
          ]}
        />
      </div>
    </section>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <PageWithDraggableSections
          pageName="my-page"
          sections={[
            { id: 'hero', component: heroSection },
            { id: 'info', component: infoCardsSection },
            { id: 'features', component: featuresSection },
            { id: 'benefits', component: benefitsSection }
          ]}
        >
          <Footer />
        </PageWithDraggableSections>
      </main>
    </div>
  );
};
```

## Content Storage

All editable content is stored in the `page_content` table with:
- `page_name`: Identifies which page the content belongs to
- `section_name`: Groups related content within a page
- `content_key`: Unique identifier for the specific content piece
- `content_value`: The actual content (text, icon name, URL, etc.)
- `content_type`: Type of content (text, image, icon, video)

Section order is stored in the `page_section_order` table with:
- `page_name`: Identifies which page the section belongs to
- `section_id`: Unique identifier for the section
- `section_order`: The order position of the section (0-indexed)

The card and section components automatically handle storage for all their editable parts.
