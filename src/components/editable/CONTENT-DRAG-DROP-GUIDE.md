# Content Drag and Drop Between Sections

This guide explains how to enable dragging content items between different sections and columns.

## Components

### DraggableContent
Wraps any content to make it draggable between sections/columns.

```tsx
import { DraggableContent } from '@/components/editable';

<DraggableContent 
  id="unique-content-id" 
  sectionId="hero-section" 
  columnId="left-column"
>
  <YourContentHere />
</DraggableContent>
```

### DroppableColumn
Makes a column accept dropped content from other sections.

```tsx
import { DroppableColumn } from '@/components/editable';

<DroppableColumn 
  id="droppable-column-1"
  sectionId="features-section"
  columnId="column-1"
  className="p-4"
>
  {/* Your column content */}
</DroppableColumn>
```

## Usage Example

```tsx
import { 
  PageWithDraggableSections, 
  DraggableContent, 
  DroppableColumn 
} from '@/components/editable';

const sections = [
  {
    id: 'hero',
    component: (
      <section>
        <div className="grid md:grid-cols-2 gap-8">
          <DroppableColumn 
            id="hero-col-1" 
            sectionId="hero" 
            columnId="col-1"
          >
            <DraggableContent id="hero-heading" sectionId="hero" columnId="col-1">
              <h1>Welcome</h1>
            </DraggableContent>
          </DroppableColumn>
          
          <DroppableColumn 
            id="hero-col-2" 
            sectionId="hero" 
            columnId="col-2"
          >
            <DraggableContent id="hero-cta" sectionId="hero" columnId="col-2">
              <Button>Get Started</Button>
            </DraggableContent>
          </DroppableColumn>
        </div>
      </section>
    )
  }
];

<PageWithDraggableSections pageName="home" sections={sections} />
```

## How It Works

1. **In Edit Mode**: Hover over content to see drag handle (blue grip icon)
2. **Drag**: Click and drag the grip handle
3. **Drop**: Hover over any column - it will highlight when you can drop
4. **Visual Feedback**: 
   - Dragging content becomes semi-transparent
   - Drop zones highlight with blue ring
   - Empty columns show "Drop content here" text

## Notes

- Content can only be dragged in Edit Mode
- Each content item needs a unique `id`
- `sectionId` and `columnId` help track where content belongs
- Wrap columns with `DroppableColumn` to accept drops
- Wrap content with `DraggableContent` to make it draggable
