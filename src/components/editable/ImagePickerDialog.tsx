import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Search, Image as ImageIcon, Loader2, X, Check, GripVertical, Images, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ImagePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageSelect: (url: string) => void;
  onImagesSelect?: (urls: string[]) => void;
  onFileUpload: (file: File) => void;
  currentImages?: string[];
  onReorder?: (images: string[]) => void;
}

interface MediaLibraryItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

interface UnsplashImage {
  id: string;
  urls: {
    small: string;
    regular: string;
    full: string;
  };
  alt_description: string;
  user: {
    name: string;
  };
}

// Sortable image item for the "Selected" tab
const SortableImageItem = ({ 
  url, 
  index, 
  onRemove 
}: { 
  url: string; 
  index: number; 
  onRemove: (index: number) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative aspect-square rounded-lg overflow-hidden border-2 border-border group ${
        isDragging ? 'ring-2 ring-primary' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 w-8 h-8 rounded bg-black/60 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-black/80 transition-colors"
      >
        <GripVertical className="w-4 h-4 text-white" />
      </div>
      <img
        src={url}
        alt={`Selected image ${index + 1}`}
        className="w-full h-full object-cover"
      />
      <button
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-destructive flex items-center justify-center hover:bg-destructive/80 transition-colors"
      >
        <X className="w-4 h-4 text-white" />
      </button>
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-2 text-center">
        Image {index + 1}
      </div>
    </div>
  );
};

export const ImagePickerDialog = ({
  open,
  onOpenChange,
  onImageSelect,
  onImagesSelect,
  onFileUpload,
  currentImages = [],
  onReorder
}: ImagePickerDialogProps) => {
  const [libraryImages, setLibraryImages] = useState<MediaLibraryItem[]>([]);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnsplashImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [localCurrentImages, setLocalCurrentImages] = useState<string[]>(currentImages);
  const [activeTab, setActiveTab] = useState(currentImages.length > 0 ? 'selected' : 'library');

  // Filter library images based on search query
  const filteredLibraryImages = libraryImages.filter(image =>
    image.file_name.toLowerCase().includes(librarySearchQuery.toLowerCase())
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Track if we've already loaded for the current open session
  const hasLoadedRef = useRef(false);
  const prevOpenRef = useRef(open);

  const loadMediaLibrary = useCallback(async () => {
    if (isLoadingLibrary) return; // Prevent duplicate calls
    setIsLoadingLibrary(true);
    try {
      const { data, error } = await supabase
        .from('media_library')
        .select('*')
        .eq('file_type', 'image')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading media library:', error);
        toast.error('Failed to load image library');
      } else {
        setLibraryImages(data || []);
      }
    } catch (err) {
      console.error('Error loading media library:', err);
    } finally {
      setIsLoadingLibrary(false);
    }
  }, [isLoadingLibrary]);

  // Only load once when dialog opens (not on every currentImages change)
  useEffect(() => {
    // Detect transition from closed to open
    if (open && !prevOpenRef.current) {
      hasLoadedRef.current = false;
    }
    prevOpenRef.current = open;

    if (open && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadMediaLibrary();
      setSelectedImages([]);
      setLocalCurrentImages(currentImages);
      setActiveTab(currentImages.length > 0 ? 'selected' : 'library');
    }
  }, [open]);

  // Sync localCurrentImages when currentImages prop changes while dialog is open
  useEffect(() => {
    if (open) {
      setLocalCurrentImages(currentImages);
    }
  }, [open, JSON.stringify(currentImages)]);

  const saveToMediaLibrary = async (fileUrl: string, fileName: string, fileSize: number, mimeType: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('media_library')
      .insert({
        file_name: fileName,
        file_url: fileUrl,
        file_type: 'image',
        mime_type: mimeType,
        file_size: fileSize,
        uploaded_by: user?.id
      });

    if (error) {
      console.error('Error saving to media library:', error);
    } else {
      loadMediaLibrary(); // Refresh the library
    }
  };

  const uploadFiles = async (files: FileList) => {
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please log in to upload images');
        return;
      }

      const uploadedUrls: string[] = [];

      // Upload all selected files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('media-library')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get the public URL directly (optimization disabled)
        const { data: { publicUrl } } = supabase.storage
          .from('media-library')
          .getPublicUrl(fileName);

        // Save image to media library database
        await saveToMediaLibrary(
          publicUrl, 
          file.name, 
          file.size, 
          file.type
        );
        uploadedUrls.push(publicUrl);
      }

      // If multiple files were uploaded, use onImagesSelect if available
      if (uploadedUrls.length > 1 && onImagesSelect) {
        onImagesSelect(uploadedUrls);
      } else if (uploadedUrls.length > 0) {
        onImageSelect(uploadedUrls[0]);
      }
      
      toast.success(`${uploadedUrls.length} image${uploadedUrls.length > 1 ? 's' : ''} uploaded and added to library`);
      onOpenChange(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFiles(files);
    }
  };

  const searchUnsplash = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ prompt: searchQuery })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Image generation failed');
      }

      const data = await response.json();
      
      if (data.imageUrl) {
        setSearchResults([{
          id: 'ai-generated-1',
          urls: {
            small: data.imageUrl,
            regular: data.imageUrl,
            full: data.imageUrl
          },
          alt_description: searchQuery,
          user: {
            name: 'AI Generated'
          }
        }]);
        toast.success('Image generated successfully!');
      } else {
        throw new Error('No image generated');
      }
    } catch (error) {
      console.error('Image generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate image. Please try uploading an image instead.');
    }
    setIsSearching(false);
  };

  const toggleImageSelection = (url: string) => {
    setSelectedImages(prev => 
      prev.includes(url) 
        ? prev.filter(img => img !== url)
        : [...prev, url]
    );
  };

  const handleAddImages = () => {
    if (onImagesSelect) {
      onImagesSelect(selectedImages);
    } else {
      selectedImages.forEach(url => {
        onImageSelect(url);
      });
    }
    setSelectedImages([]);
    onOpenChange(false);
  };

  // Handle drag end for reordering in the Selected tab
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localCurrentImages.indexOf(active.id as string);
      const newIndex = localCurrentImages.indexOf(over.id as string);
      
      const newOrder = arrayMove(localCurrentImages, oldIndex, newIndex);
      setLocalCurrentImages(newOrder);
    }
  };

  // Remove image from current selection
  const handleRemoveFromCurrent = (index: number) => {
    const newImages = localCurrentImages.filter((_, i) => i !== index);
    setLocalCurrentImages(newImages);
  };

  // Save reordered images
  const handleSaveOrder = () => {
    if (onReorder) {
      onReorder(localCurrentImages);
      toast.success('Image order saved');
      onOpenChange(false);
    }
  };

  // Add from library to current selection (in Selected tab)
  const handleAddFromLibrary = () => {
    setActiveTab('library');
  };

  const hasChanges = JSON.stringify(localCurrentImages) !== JSON.stringify(currentImages);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Choose Image</DialogTitle>
          <DialogDescription>
            Select images from your library, upload new ones, or generate with AI
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 mt-4">
          <TabsList className={`grid w-full flex-shrink-0 ${currentImages.length > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {currentImages.length > 0 && (
              <TabsTrigger value="selected">
                <Images className="h-4 w-4 mr-2" />
                Selected ({localCurrentImages.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="library">
              <ImageIcon className="h-4 w-4 mr-2" />
              Library
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-2" />
              Generate AI
            </TabsTrigger>
          </TabsList>

          {currentImages.length > 0 && (
            <TabsContent value="selected" className="flex-1 overflow-y-auto mt-4 min-h-0">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Drag images to reorder. Click the X to remove.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleAddFromLibrary}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add More
                  </Button>
                </div>
                
                {localCurrentImages.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={localCurrentImages} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                        {localCurrentImages.map((url, index) => (
                          <SortableImageItem
                            key={url}
                            url={url}
                            index={index}
                            onRemove={handleRemoveFromCurrent}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Images className="h-12 w-12 mb-4" />
                    <p>No images in carousel</p>
                    <p className="text-sm">Add images from the Library tab</p>
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          <TabsContent value="library" className="flex-1 overflow-y-auto mt-4 min-h-0">
            <div className="p-4 pb-0">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search images by filename..."
                  value={librarySearchQuery}
                  onChange={(e) => setLibrarySearchQuery(e.target.value)}
                  className="pl-10"
                />
                {librarySearchQuery && (
                  <button
                    onClick={() => setLibrarySearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {isLoadingLibrary ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredLibraryImages.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4 p-4 pt-0">
                {filteredLibraryImages.map((image) => {
                  const isSelected = selectedImages.includes(image.file_url);
                  const isInCarousel = localCurrentImages.includes(image.file_url);
                  return (
                    <button
                      key={image.id}
                      onClick={() => toggleImageSelection(image.file_url)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors group ${
                        isSelected ? 'border-primary ring-2 ring-primary' : isInCarousel ? 'border-green-500' : 'border-border hover:border-primary'
                      }`}
                    >
                      <img
                        src={image.file_url}
                        alt={image.file_name}
                        className="w-full h-full object-cover"
                      />
                      {isInCarousel && !isSelected && (
                        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {isSelected && (
                        <>
                          <div className="absolute inset-0 bg-primary/20" />
                          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive flex items-center justify-center hover:bg-destructive/80 transition-colors">
                            <X className="w-4 h-4 text-white" />
                          </div>
                        </>
                      )}
                      {!isSelected && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-secondary text-secondary-foreground px-3 py-1.5 pointer-events-none">
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Select
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-2 truncate">
                        {image.file_name}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : libraryImages.length > 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mb-4" />
                <p>No images match "{librarySearchQuery}"</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mb-4" />
                <p>No images in library yet</p>
                <p className="text-sm">Upload some images first!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="flex-1 overflow-y-auto mt-4 min-h-0">
            <div className="flex flex-col items-center justify-center p-8 h-full">
            <div 
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              <h3 className="text-lg font-semibold mb-2">Upload Images</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {isUploading ? 'Uploading and saving to library...' : 'Click to browse or drag and drop multiple images'}
              </p>
              <input
                type="file"
                accept="image/*"
                multiple
                id="file-upload-input"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
              <Button 
                onClick={() => document.getElementById('file-upload-input')?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Choose Files'
                )}
              </Button>
            </div>
            </div>
          </TabsContent>

          <TabsContent value="search" className="flex-1 overflow-y-auto mt-4 min-h-0">
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Describe the image you want (e.g., modern office, food platter, business team)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUnsplash()}
                  className="text-black"
                />
                <Button onClick={searchUnsplash} disabled={isSearching}>
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Generate'
                  )}
                </Button>
              </div>

              {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {searchResults.map((image) => {
                    const isSelected = selectedImages.includes(image.urls.regular);
                    return (
                      <button
                        key={image.id}
                        onClick={() => toggleImageSelection(image.urls.regular)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors group ${
                          isSelected ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary'
                        }`}
                      >
                        <img
                          src={image.urls.small}
                          alt={image.alt_description || 'Free image'}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <>
                            <div className="absolute inset-0 bg-primary/20" />
                            <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive flex items-center justify-center hover:bg-destructive/80 transition-colors">
                              <X className="w-4 h-4 text-white" />
                            </div>
                          </>
                        )}
                        {!isSelected && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-secondary text-secondary-foreground px-3 py-1.5 pointer-events-none">
                              <ImageIcon className="w-4 h-4 mr-2" />
                              Select
                            </span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-2 truncate">
                          Photo by {image.user.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mb-4" />
                  <p>Generate custom images with AI</p>
                  <p className="text-sm">Describe what you want and AI will create it for you</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Show save button for reordering in Selected tab */}
        {activeTab === 'selected' && hasChanges && (
          <div className="flex-shrink-0 flex justify-end pt-4 border-t">
            <Button onClick={handleSaveOrder} size="lg">
              Save Changes
            </Button>
          </div>
        )}
        
        {/* Show add button for library/search selection */}
        {selectedImages.length > 0 && activeTab !== 'selected' && (
          <div className="flex-shrink-0 flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setSelectedImages([])}>
              Clear Selection ({selectedImages.length})
            </Button>
            <Button onClick={handleAddImages} size="lg">
              Add {selectedImages.length} Image{selectedImages.length > 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
