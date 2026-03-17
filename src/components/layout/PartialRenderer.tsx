/**
 * Layout Partial Renderer
 * 
 * Renders the appropriate navbar or footer based on the resolved partial.
 * Supports both template-based rendering and full builder canvas rendering.
 */
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useResolvedPartial, getPartialPageName, LayoutPartial } from '@/hooks/useLayoutPartials';
import { PageWithDraggableSections, SectionWithDraggableColumns } from '@/components/editable';
import { DynamicCard } from '@/components/editable/DynamicCard';
import { useEditMode, EditModeOverride } from '@/contexts/EditModeContext';
import { useState } from 'react';

// ── Template Components ─────────────────────────────────────────────

/** Standard Navbar template - the current hardcoded navbar */
import DefaultNavbar from '@/components/Navbar';
import DefaultFooter from '@/components/Footer';

/** Builder-editable partial that renders via PageWithDraggableSections */
const BuilderPartial = ({
  partial,
  wrapperClassName,
  isEditing,
  onToggleEdit,
  editLabel,
}: {
  partial: LayoutPartial;
  wrapperClassName?: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  editLabel: string;
}) => {
  const { isEditMode } = useEditMode();
  const pageName = getPartialPageName(partial);

  return (
    <EditModeOverride isEditMode={isEditMode && isEditing}>
      {isEditMode && (
        <div
          className="relative z-10 flex items-center justify-center py-2 border-t border-dashed gap-3"
          style={{ background: 'rgba(30,33,40,0.85)', borderColor: 'rgba(77,159,255,0.3)' }}
        >
          {!isEditing ? (
            <button
              onClick={onToggleEdit}
              className="px-4 py-1.5 rounded-md text-xs font-medium transition-colors hover:opacity-90"
              style={{ background: '#4d9fff', color: '#fff' }}
            >
              Edit {editLabel}
            </button>
          ) : (
            <button
              onClick={onToggleEdit}
              className="px-4 py-1.5 rounded-md text-xs font-medium transition-colors hover:opacity-90"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#e8eaed', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              Close {editLabel} Editor
            </button>
          )}
        </div>
      )}
      <div className={wrapperClassName}>
        <PageWithDraggableSections
          pageName={pageName}
          sections={[]}
          isMainContent={false}
        />
      </div>
    </EditModeOverride>
  );
};

// ── Navbar Templates ────────────────────────────────────────────────

const NavbarCentered = ({ partial }: { partial: LayoutPartial }) => {
  const [isEditing, setIsEditing] = useState(false);
  return (
    <BuilderPartial
      partial={partial}
      wrapperClassName="bg-[hsl(var(--black-card))] text-[hsl(var(--black-card-foreground))]"
      isEditing={isEditing}
      onToggleEdit={() => setIsEditing(!isEditing)}
      editLabel="Navbar"
    />
  );
};

const NavbarMinimal = ({ partial }: { partial: LayoutPartial }) => {
  const [isEditing, setIsEditing] = useState(false);
  return (
    <BuilderPartial
      partial={partial}
      wrapperClassName="bg-white text-gray-900 shadow-sm"
      isEditing={isEditing}
      onToggleEdit={() => setIsEditing(!isEditing)}
      editLabel="Navbar"
    />
  );
};

const NavbarMega = ({ partial }: { partial: LayoutPartial }) => {
  const [isEditing, setIsEditing] = useState(false);
  return (
    <BuilderPartial
      partial={partial}
      wrapperClassName="bg-[hsl(var(--black-card))] text-[hsl(var(--black-card-foreground))]"
      isEditing={isEditing}
      onToggleEdit={() => setIsEditing(!isEditing)}
      editLabel="Navbar"
    />
  );
};

// ── Footer Templates ────────────────────────────────────────────────

const FooterMinimal = ({ partial }: { partial: LayoutPartial }) => {
  const [isEditing, setIsEditing] = useState(false);
  return (
    <BuilderPartial
      partial={partial}
      wrapperClassName="bg-[hsl(var(--black-card))] text-[hsl(var(--black-card-foreground))] py-8"
      isEditing={isEditing}
      onToggleEdit={() => setIsEditing(!isEditing)}
      editLabel="Footer"
    />
  );
};

const FooterTwoColumn = ({ partial }: { partial: LayoutPartial }) => {
  const [isEditing, setIsEditing] = useState(false);
  return (
    <BuilderPartial
      partial={partial}
      wrapperClassName="bg-[hsl(var(--black-card))] text-[hsl(var(--black-card-foreground))] py-12"
      isEditing={isEditing}
      onToggleEdit={() => setIsEditing(!isEditing)}
      editLabel="Footer"
    />
  );
};

const FooterFat = ({ partial }: { partial: LayoutPartial }) => {
  const [isEditing, setIsEditing] = useState(false);
  return (
    <BuilderPartial
      partial={partial}
      wrapperClassName="bg-[hsl(var(--black-card))] text-[hsl(var(--black-card-foreground))] py-16"
      isEditing={isEditing}
      onToggleEdit={() => setIsEditing(!isEditing)}
      editLabel="Footer"
    />
  );
};

// ── Template Registry ───────────────────────────────────────────────

const TEMPLATE_REGISTRY: Record<string, React.FC<{ partial: LayoutPartial }>> = {
  'navbar-centered': NavbarCentered,
  'navbar-minimal': NavbarMinimal,
  'navbar-mega': NavbarMega,
  'footer-minimal': FooterMinimal,
  'footer-two-column': FooterTwoColumn,
  'footer-fat': FooterFat,
};

// ── Public API ──────────────────────────────────────────────────────

interface PartialRendererProps {
  type: 'navbar' | 'footer';
  pageUrl?: string;
}

/**
 * Renders the resolved navbar or footer for the current page.
 * - If the resolved partial is the default (template_key = navbar-standard/footer-standard),
 *   renders the current hardcoded component.
 * - If it matches a template, renders that template with builder editing.
 * - Otherwise renders a generic builder canvas.
 */
export const PartialRenderer = ({ type, pageUrl }: PartialRendererProps) => {
  const location = useLocation();
  const resolvedUrl = pageUrl || location.pathname;
  const { data: partial, isLoading } = useResolvedPartial(resolvedUrl, type);

  if (isLoading) return null;

  // No partial resolved → render defaults
  if (!partial) {
    return type === 'navbar' ? <DefaultNavbar /> : <DefaultFooter />;
  }

  // Default standard templates → use existing hardcoded components
  if (partial.template_key === 'navbar-standard') return <DefaultNavbar />;
  if (partial.template_key === 'footer-standard') return <DefaultFooter />;

  // Check template registry
  const TemplateComponent = partial.template_key ? TEMPLATE_REGISTRY[partial.template_key] : null;
  if (TemplateComponent) {
    return <TemplateComponent partial={partial} />;
  }

  // Fallback: generic builder canvas
  return <GenericBuilderPartial partial={partial} type={type} />;
};

const GenericBuilderPartial = ({ partial, type }: { partial: LayoutPartial; type: 'navbar' | 'footer' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const label = type === 'navbar' ? 'Navbar' : 'Footer';
  return (
    <BuilderPartial
      partial={partial}
      wrapperClassName={type === 'footer'
        ? 'bg-[hsl(var(--black-card))] text-[hsl(var(--black-card-foreground))] py-12'
        : 'bg-[hsl(var(--black-card))] text-[hsl(var(--black-card-foreground))]'
      }
      isEditing={isEditing}
      onToggleEdit={() => setIsEditing(!isEditing)}
      editLabel={label}
    />
  );
};

export default PartialRenderer;
