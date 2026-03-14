# Draggable Columns Guide

This guide shows how to make card grids draggable so users can reorder columns within a section in Edit Mode.

## When to Use

Use `SectionWithDraggableColumns` for any grid layout with cards/columns that should be reorderable:
- Info cards (Date, Location, Duration)
- Feature cards
- Benefits cards  
- Stats cards
- Audience/category cards

## How to Apply

### Step 1: Import the component

```tsx
import { SectionWithDraggableColumns } from '@/components/editable';
```

### Step 2: Convert your grid

**Before:**
```tsx
{
  id: 'info-cards',
  component: (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="p-6 rounded-xl bg-card">
        {/* Card 1 content */}
      </div>
      <div className="p-6 rounded-xl bg-card">
        {/* Card 2 content */}
      </div>
      <div className="p-6 rounded-xl bg-card">
        {/* Card 3 content */}
      </div>
    </div>
  )
}
```

**After:**
```tsx
{
  id: 'info-cards',
  component: (
    <SectionWithDraggableColumns
      pageName="your-page-name"
      sectionId="info-cards"
      className="grid md:grid-cols-3 gap-6"
      columns={[
        {
          id: 'card-1',
          component: (
            <div className="p-6 rounded-xl bg-card">
              {/* Card 1 content */}
            </div>
          )
        },
        {
          id: 'card-2',
          component: (
            <div className="p-6 rounded-xl bg-card">
              {/* Card 2 content */}
            </div>
          )
        },
        {
          id: 'card-3',
          component: (
            <div className="p-6 rounded-xl bg-card">
              {/* Card 3 content */}
            </div>
          )
        }
      ]}
    />
  )
}
```

### Step 3: Give each column a unique ID

Each column needs:
- **Unique `id`**: Should be descriptive (e.g., 'date', 'location', 'exhibitors')
- **`component`**: The React element for that card

## Complete Example

```tsx
import { SectionWithDraggableColumns } from '@/components/editable';

const sections = useMemo(() => [
  {
    id: 'benefits',
    component: (
      <SectionWithDraggableColumns
        pageName="registration"
        sectionId="benefits"
        className="grid md:grid-cols-2 gap-6"
        columns={[
          {
            id: 'early-bird',
            component: (
              <div className="p-8 rounded-xl bg-card">
                <h3>Early Bird Benefits</h3>
                <ul>
                  <li>Benefit 1</li>
                  <li>Benefit 2</li>
                </ul>
              </div>
            )
          },
          {
            id: 'whats-included',
            component: (
              <div className="p-8 rounded-xl bg-card">
                <h3>What's Included</h3>
                <ul>
                  <li>Item 1</li>
                  <li>Item 2</li>
                </ul>
              </div>
            )
          }
        ]}
      />
    )
  }
], []);
```

## How It Works

1. In **Edit Mode**, drag handles appear at the top of each card
2. Click and drag the handle to reorder cards horizontally
3. Order is saved automatically to the database
4. Works with any grid layout (2 columns, 3 columns, 4 columns, etc.)

## Props

| Prop | Type | Description |
|------|------|-------------|
| `pageName` | string | The page identifier (e.g., 'registration', 'why-attend') |
| `sectionId` | string | Unique section identifier (e.g., 'info-cards', 'benefits') |
| `className` | string | Grid classes for layout (e.g., 'grid md:grid-cols-3 gap-6') |
| `columns` | array | Array of column objects with `id` and `component` |

## Pages Already Using This

- ✅ Registration page: info-cards section
- ✅ Registration page: benefits section

## To Be Updated

Apply this pattern to these sections:
- Why Attend: cards-row-1, cards-row-2
- Who Attends: audience-row-1, audience-row-2
- Exhibit: benefits section
- Index (Home): stats-cards section
