import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import TextAlign from '@tiptap/extension-text-align';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Heading4, ImagePlus, Underline as UnderlineIcon, Link as LinkIcon, Code, Minus, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { ImagePickerDialog } from '@/components/editable/ImagePickerDialog';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export const RichTextEditor = ({ content, onChange }: RichTextEditorProps) => {
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Disable heading in StarterKit to use custom Heading extension
        bold: {
          HTMLAttributes: {
            class: 'font-bold',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc ml-6',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal ml-6',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'mb-2',
          },
        },
      }),
      Heading.configure({
        levels: [1, 2, 3, 4],
        HTMLAttributes: {
          class: 'font-bold',
        },
      }).extend({
        // Add specific classes for each heading level - use only spacing, let global CSS handle font sizes via --h1-size, --h2-size, --h3-size, --h4-size variables
        renderHTML({ node, HTMLAttributes }) {
          const level = node.attrs.level;
          const classes = {
            1: 'font-bold mb-4 mt-6',
            2: 'font-bold mb-3 mt-5',
            3: 'font-bold mb-2 mt-4',
            4: 'font-bold mb-2 mt-3',
          };
          return [`h${level}`, { ...HTMLAttributes, class: classes[level as 1 | 2 | 3 | 4] || '' }, 0];
        },
      }),
      Image.configure({
        inline: false,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      HorizontalRule.configure({
        HTMLAttributes: {
          class: 'my-4 border-t-2 border-border',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert max-w-none focus:outline-none min-h-[300px] p-6 [&_h1]:text-[length:var(--h1-size,2.25rem)] [&_h2]:text-[length:var(--h2-size,1.875rem)] [&_h3]:text-[length:var(--h3-size,1.5rem)] [&_h4]:text-[length:var(--h4-size,1.25rem)] prose-strong:font-bold text-white',
        style: 'color: #e8eaed; caret-color: #e8eaed;',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const addImage = (url: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const handleSetLink = () => {
    if (!editor) return;
    
    // Get current link if editing
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setIsLinkDialogOpen(true);
  };

  const handleSaveLink = () => {
    if (!editor) return;

    // Empty string unsets link
    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      // Set the link
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    }

    setIsLinkDialogOpen(false);
    setLinkUrl('');
  };

  const handleShowHtmlEditor = () => {
    if (editor) {
      setHtmlContent(editor.getHTML());
      setShowHtmlEditor(true);
    }
  };

  const handleSaveHtml = () => {
    if (editor) {
      editor.commands.setContent(htmlContent);
      onChange(htmlContent);
      setShowHtmlEditor(false);
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden" style={{ background: '#1a1a2e', borderColor: 'rgba(255,255,255,0.15)' }}>
        <div className="flex flex-wrap gap-1 p-2 border-b [&_button]:text-white/70 [&_button:hover]:text-white [&_button:hover]:bg-white/10 [&_button[data-state=on]]:bg-white/20 [&_button[data-state=on]]:text-white [&_.w-px]:bg-white/10" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
          <Button
            type="button"
            variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive('heading', { level: 4 }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            title="Heading 4"
          >
            <Heading4 className="h-4 w-4" />
          </Button>
          <div className="w-px h-8 bg-border mx-1" />
          <Button
            type="button"
            variant={editor.isActive('bold') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive('italic') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive('underline') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive('link') ? 'default' : 'ghost'}
            size="sm"
            onClick={handleSetLink}
            title="Add Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <div className="w-px h-8 bg-border mx-1" />
          <Button
            type="button"
            variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive({ textAlign: 'justify' }) ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            title="Justify"
          >
            <AlignJustify className="h-4 w-4" />
          </Button>
          <div className="w-px h-8 bg-border mx-1" />
          <Button
            type="button"
            variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Add Divider"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <div className="w-px h-8 bg-border mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsImagePickerOpen(true)}
            title="Add Image"
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
          <ImagePickerDialog
            open={isImagePickerOpen}
            onOpenChange={setIsImagePickerOpen}
            onImageSelect={addImage}
            onFileUpload={() => {}}
          />
          <div className="w-px h-8 bg-border mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleShowHtmlEditor}
            title="Edit HTML"
          >
            <Code className="h-4 w-4" />
          </Button>
        </div>
        <div style={{ background: '#0d0d1a' }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
            <DialogDescription>
              Enter the URL for the link
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveLink();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLink}>
              Save Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHtmlEditor} onOpenChange={setShowHtmlEditor}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit HTML Source</DialogTitle>
            <DialogDescription>
              Edit the HTML code directly. Be careful with your changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="font-mono text-sm min-h-[400px]"
              placeholder="<p>Your HTML content here...</p>"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHtmlEditor(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveHtml}>
              Save HTML
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};