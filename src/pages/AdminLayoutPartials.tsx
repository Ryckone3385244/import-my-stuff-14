/**
 * Admin Layout Partials Management
 * Allows creating, editing, duplicating, and assigning navbar/footer partials.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Copy, Star, Edit, ExternalLink, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LayoutPartial } from '@/hooks/useLayoutPartials';

const AdminLayoutPartials = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPartial, setEditingPartial] = useState<LayoutPartial | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    partial_type: 'navbar' as 'navbar' | 'footer',
    template_key: '',
  });

  useEffect(() => { checkAdmin(); }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/login'); return; }
    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id);
    const allowed = ['admin', 'customer_service', 'project_manager'];
    if (!roleData?.some(r => allowed.includes(r.role))) { toast.error('Access denied'); navigate('/'); return; }
    setIsAdmin(true);
    setLoading(false);
  };

  const { data: partials = [], isLoading: isLoadingPartials } = useQuery({
    queryKey: ['layout-partials'],
    queryFn: async () => {
      const { data, error } = await supabase.from('layout_partials').select('*').order('partial_type').order('is_default', { ascending: false }).order('name');
      if (error) throw error;
      return data as LayoutPartial[];
    },
    enabled: isAdmin,
  });

  const navbarPartials = partials.filter(p => p.partial_type === 'navbar');
  const footerPartials = partials.filter(p => p.partial_type === 'footer');

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('layout_partials').insert({
        name: data.name,
        description: data.description || null,
        partial_type: data.partial_type,
        template_key: data.template_key || null,
        is_template: false,
        is_default: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layout-partials'] });
      toast.success('Layout partial created');
      setShowDialog(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase.from('layout_partials').update({
        name: data.name,
        description: data.description || null,
        template_key: data.template_key || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layout-partials'] });
      toast.success('Layout partial updated');
      setShowDialog(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('layout_partials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layout-partials'] });
      toast.success('Deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: string }) => {
      // Unset current default
      await supabase.from('layout_partials').update({ is_default: false }).eq('partial_type', type).eq('is_default', true);
      // Set new default
      const { error } = await supabase.from('layout_partials').update({ is_default: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layout-partials'] });
      toast.success('Default updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (partial: LayoutPartial) => {
      const { error } = await supabase.from('layout_partials').insert({
        name: `${partial.name} (Copy)`,
        description: partial.description,
        partial_type: partial.partial_type,
        template_key: null, // copies are custom, not templates
        is_template: false,
        is_default: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layout-partials'] });
      toast.success('Duplicated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleNew = (type: 'navbar' | 'footer') => {
    setEditingPartial(null);
    setFormData({ name: '', description: '', partial_type: type, template_key: '' });
    setShowDialog(true);
  };

  const handleEdit = (partial: LayoutPartial) => {
    setEditingPartial(partial);
    setFormData({
      name: partial.name,
      description: partial.description || '',
      partial_type: partial.partial_type as 'navbar' | 'footer',
      template_key: partial.template_key || '',
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) { toast.error('Name is required'); return; }
    if (editingPartial) {
      updateMutation.mutate({ id: editingPartial.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const renderTable = (items: LayoutPartial[], type: 'navbar' | 'footer') => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">{type === 'navbar' ? 'Navbar' : 'Footer'} Layouts</CardTitle>
          <CardDescription>Manage {type} layout variations</CardDescription>
        </div>
        <Button size="sm" onClick={() => handleNew(type)}>
          <Plus className="h-4 w-4 mr-1" /> New {type === 'navbar' ? 'Navbar' : 'Footer'}
        </Button>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Template</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(p => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">
                {p.name}
                {p.is_default && <Badge className="ml-2" variant="outline">Default</Badge>}
                {p.is_template && <Badge className="ml-2" variant="secondary">Template</Badge>}
              </TableCell>
              <TableCell>{p.partial_type}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{p.template_key || 'Custom (Builder)'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {!p.is_default && (
                    <Button size="sm" variant="ghost" onClick={() => setDefaultMutation.mutate({ id: p.id, type: p.partial_type })} title="Set as default">
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(p)} title="Edit details">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicateMutation.mutate(p)} title="Duplicate">
                    <Copy className="h-4 w-4" />
                  </Button>
                  {!p.is_default && (
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete this layout?')) deleteMutation.mutate(p.id); }} title="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                No {type} layouts yet. Create one to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );

  if (loading || !isAdmin) return null;

  return (
    <>
      <Helmet><title>Layout Management | Admin</title></Helmet>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 pt-page">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-6">
              <Link to="/admin/dashboard">
                <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              </Link>
              <h1 className="text-2xl font-bold">Layout Management</h1>
            </div>

            <p className="text-muted-foreground mb-6">
              Create and manage navbar and footer layouts. Set a default for the whole site, 
              or assign specific layouts to individual pages. Use templates as starting points 
              or build custom layouts from scratch with the page builder.
            </p>

            <Tabs defaultValue="navbar">
              <TabsList>
                <TabsTrigger value="navbar">Navbars</TabsTrigger>
                <TabsTrigger value="footer">Footers</TabsTrigger>
              </TabsList>
              <TabsContent value="navbar" className="mt-4">
                {renderTable(navbarPartials, 'navbar')}
              </TabsContent>
              <TabsContent value="footer" className="mt-4">
                {renderTable(footerPartials, 'footer')}
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <Footer />
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPartial ? 'Edit Layout' : 'New Layout'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dark Navbar" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </div>
            {!editingPartial && (
              <div>
                <Label>Type</Label>
                <Select value={formData.partial_type} onValueChange={v => setFormData(f => ({ ...f, partial_type: v as 'navbar' | 'footer' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="navbar">Navbar</SelectItem>
                    <SelectItem value="footer">Footer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Base Template (optional)</Label>
              <Select value={formData.template_key} onValueChange={v => setFormData(f => ({ ...f, template_key: v }))}>
                <SelectTrigger><SelectValue placeholder="None (Custom Builder)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Custom Builder)</SelectItem>
                  {formData.partial_type === 'navbar' ? (
                    <>
                      <SelectItem value="navbar-centered">Centered Logo</SelectItem>
                      <SelectItem value="navbar-minimal">Minimal</SelectItem>
                      <SelectItem value="navbar-mega">Mega Menu</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="footer-minimal">Minimal</SelectItem>
                      <SelectItem value="footer-two-column">Two Column</SelectItem>
                      <SelectItem value="footer-fat">Fat Footer</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingPartial ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminLayoutPartials;
