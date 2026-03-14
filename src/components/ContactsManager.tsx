import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const contactSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  telephone: z.string().trim().max(20, "Telephone must be less than 20 characters").regex(/^[0-9+\-\s()]*$/, "Invalid telephone format").optional().or(z.literal("")),
  job_title: z.string().trim().max(100, "Job title must be less than 100 characters").optional().or(z.literal("")),
});

interface Contact {
  id?: string;
  full_name: string;
  email: string;
  telephone: string;
  job_title: string;
  is_active: boolean;
  is_main_contact: boolean;
}

interface ContactsManagerProps {
  exhibitorId: string;
  hideSaveButton?: boolean;
  onSaveComplete?: () => void;
  showContactButtonToggle?: boolean;
}

export interface ContactsManagerRef {
  saveContacts: () => Promise<void>;
}

export const ContactsManager = forwardRef<ContactsManagerRef, ContactsManagerProps>(
  ({ exhibitorId, hideSaveButton = false, onSaveComplete, showContactButtonToggle = false }, ref) => {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showContactButton, setShowContactButton] = useState(true);

  useEffect(() => {
    loadContacts();
  }, [exhibitorId]);

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("exhibitor_contacts")
        .select("*")
        .eq("exhibitor_id", exhibitorId)
        .eq("is_active", true);

      if (error) throw error;
      
      // Normalize null values to empty strings to prevent Zod validation issues
      const normalizedContacts = (data || []).map(contact => ({
        ...contact,
        full_name: contact.full_name || "",
        email: contact.email || "",
        telephone: contact.telephone || "",
        job_title: contact.job_title || "",
      }));
      
      setContacts(normalizedContacts);

      // Auto-set first contact as main if none is marked, and persist to DB
      const hasMain = normalizedContacts.some(c => c.is_main_contact);
      if (!hasMain && normalizedContacts.length > 0) {
        const firstContact = normalizedContacts[0];
        firstContact.is_main_contact = true;
        setContacts(normalizedContacts);
        
        // Persist the auto-assignment to the database
        if (firstContact.id) {
          await supabase
            .from("exhibitor_contacts")
            .update({ is_main_contact: true })
            .eq("id", firstContact.id);
          console.log("Auto-persisted main contact flag for:", firstContact.email);
        }
      } else {
        setContacts(normalizedContacts);
      }

      // Load show_contact_button setting
      const { data: exhibitorData, error: exhibitorError } = await supabase
        .from("exhibitors")
        .select("show_contact_button")
        .eq("id", exhibitorId)
        .maybeSingle();
      
      if (exhibitorError) {
        console.error("Error fetching exhibitor settings:", exhibitorError);
      }
      
      if (exhibitorData) {
        setShowContactButton(exhibitorData.show_contact_button);
      }
    } catch (error) {
      console.error("Error loading contacts:", error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Expose saveContacts method to parent via ref
  useImperativeHandle(ref, () => ({
    saveContacts
  }));

  const addContact = () => {
    const newContact: Contact = { 
      full_name: "", 
      email: "", 
      telephone: "", 
      job_title: "", 
      is_active: true,
      is_main_contact: contacts.length === 0 // First contact is main by default
    };
    setContacts([...contacts, newContact]);
  };

  const removeContact = async (index: number) => {
    const contact = contacts[index];
    const wasMainContact = contact.is_main_contact;
    
    if (contact.id) {
      try {
        const { error } = await supabase
          .from("exhibitor_contacts")
          .delete()
          .eq("id", contact.id);

        if (error) throw error;
        
        toast({ title: "Success", description: "Contact deleted" });
      } catch (error) {
        console.error("Error deleting contact:", error);
        toast({
          title: "Error",
          description: "Failed to delete contact",
          variant: "destructive",
        });
        return;
      }
    }
    
    const updatedContacts = contacts.filter((_, i) => i !== index);
    
    // If the deleted contact was main and there are remaining contacts, set the first one as main
    if (wasMainContact && updatedContacts.length > 0) {
      updatedContacts[0].is_main_contact = true;
    }
    
    setContacts(updatedContacts);
  };

  const updateContact = (index: number, field: string, value: string | boolean) => {
    const updated = [...contacts];
    
    // If setting a contact as main, unset all others
    if (field === 'is_main_contact' && value === true) {
      updated.forEach((contact, i) => {
        contact.is_main_contact = i === index;
      });
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    
    setContacts(updated);
  };

  const saveContacts = async () => {
    setSaving(true);
    try {
      // Only save show_contact_button when the toggle is visible (admin only)
      if (showContactButtonToggle) {
        const { error: exhibitorError } = await supabase
          .from("exhibitors")
          .update({ show_contact_button: showContactButton })
          .eq("id", exhibitorId);
        
        if (exhibitorError) throw exhibitorError;
      }

      // Validate contacts using Zod
      for (const contact of contacts) {
        // Skip empty contacts
        if (!contact.full_name && !contact.email && !contact.telephone && !contact.job_title) {
          continue;
        }
        
        const result = contactSchema.safeParse(contact);
        if (!result.success) {
          const firstError = result.error.errors[0];
          toast({
            title: "Validation Error",
            description: firstError.message,
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      }

      // Filter out empty contacts
      const validContacts = contacts.filter(
        (c) => c.full_name || c.email || c.telephone || c.job_title
      );

      // Update or insert contacts
      for (const contact of validContacts) {
        if (contact.id) {
          // Update existing
          const { error } = await supabase
            .from("exhibitor_contacts")
            .update({
              full_name: contact.full_name,
              email: contact.email,
              telephone: contact.telephone,
              job_title: contact.job_title,
              is_main_contact: contact.is_main_contact,
            })
            .eq("id", contact.id);

          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from("exhibitor_contacts")
            .insert({
              exhibitor_id: exhibitorId,
              full_name: contact.full_name,
              email: contact.email,
              telephone: contact.telephone,
              job_title: contact.job_title,
              is_active: true,
              is_main_contact: contact.is_main_contact,
            });

          if (error) throw error;
        }
      }

      toast({ title: "Success", description: "Contacts saved successfully" });
      await loadContacts();
    } catch (error) {
      console.error("Error saving contacts:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save contacts";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading contacts...</div>;
  }

  return (
    <div className="space-y-6">
      {showContactButtonToggle && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="show-contact-button" className="text-base font-semibold">
              Show Contact Button on Frontend
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, visitors will see a "Contact Us" button on your exhibitor listing
            </p>
          </div>
          <Switch
            id="show-contact-button"
            checked={showContactButton}
            onCheckedChange={setShowContactButton}
          />
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Contacts</h3>
        <Button type="button" onClick={addContact} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      <div className="space-y-6">
        {contacts.map((contact, index) => (
          <div key={index} className={`p-6 border-2 rounded-lg space-y-4 relative bg-card shadow-sm ${contact.is_main_contact ? 'border-primary' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm text-muted-foreground">Contact {index + 1}</h4>
                {contact.is_main_contact && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <Star className="h-3 w-3" fill="currentColor" />
                    Main Contact
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <RadioGroup
                    value={contact.is_main_contact ? "true" : "false"}
                    onValueChange={(value) => updateContact(index, "is_main_contact", value === "true")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id={`main-${index}`} />
                      <Label htmlFor={`main-${index}`} className="text-xs cursor-pointer">
                        Set as main
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeContact(index)}
                  disabled={contacts.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={contact.full_name}
                  onChange={(e) => updateContact(index, "full_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={contact.email}
                  onChange={(e) => updateContact(index, "email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Telephone</Label>
                <Input
                  value={contact.telephone}
                  onChange={(e) => updateContact(index, "telephone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Input
                  value={contact.job_title}
                  onChange={(e) => updateContact(index, "job_title", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {contacts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No contacts added yet. Click "Add Contact" to get started.
        </div>
      )}

      {!hideSaveButton && (
        <div className="pt-6 border-t">
          <Button
            type="button"
            onClick={saveContacts}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      )}
    </div>
  );
});

ContactsManager.displayName = "ContactsManager";
