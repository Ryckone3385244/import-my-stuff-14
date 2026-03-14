import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, Loader2, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';
import { toast } from "sonner";
import { calculateExhibitorCompletionSync } from "@/lib/exhibitorCompletionUtils";
import { calculateSpeakerCompletion } from "@/lib/exhibitorCompletionUtils";

export const AdminReporting = () => {
  const [activeReport, setActiveReport] = useState<"exhibitors" | "speakers">("exhibitors");
  
  // Exhibitor filters
  const [exhibitorNameFilter, setExhibitorNameFilter] = useState("");
  const [exhibitorBoothFilter, setExhibitorBoothFilter] = useState("");
  const [exhibitorCategoryFilter, setExhibitorCategoryFilter] = useState("");
  const [exhibitorStatusFilter, setExhibitorStatusFilter] = useState<string>("all");
  const [exhibitorStartDate, setExhibitorStartDate] = useState<Date | undefined>();
  const [exhibitorEndDate, setExhibitorEndDate] = useState<Date | undefined>();
  
  // Speaker filters
  const [speakerNameFilter, setSpeakerNameFilter] = useState("");
  const [speakerCompanyFilter, setSpeakerCompanyFilter] = useState("");
  const [speakerStartDate, setSpeakerStartDate] = useState<Date | undefined>();
  const [speakerEndDate, setSpeakerEndDate] = useState<Date | undefined>();
  
  // Exhibitor field selection
  const [exhibitorFields, setExhibitorFields] = useState({
    name: true,
    account_number: true,
    booth_number: true,
    category: true,
    description: true,
    website: true,
    logo_url: false,
    banner_url: false,
    company_profile: false,
    short_description: false,
    stand_type: false,
    event_status: true,
    showguide_entry: false,
    booth_dimensions: false,
    is_active: true,
    created_at: false,
    updated_at: false,
    completion_percentage: true,
    contacts: true,
    address: true,
    social_media: false,
  });
  
  // Speaker field selection
  const [speakerFields, setSpeakerFields] = useState({
    name: true,
    title: true,
    company: true,
    bio: true,
    linkedin_url: true,
    photo_url: false,
    company_logo_url: false,
    seminar_title: true,
    seminar_description: true,
    created_at: false,
    updated_at: false,
    completion_percentage: true,
  });

  // Fetch exhibitors with all related data
  const { data: exhibitors, isLoading: loadingExhibitors } = useQuery({
    queryKey: ["admin-exhibitors-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitors")
        .select(`
          *,
          exhibitor_address(*),
          exhibitor_social_media(*),
          exhibitor_contacts(*),
          exhibitor_products(*),
          exhibitor_speaker_submissions(*),
          exhibitor_speaker_headshots(*),
          exhibitor_advert_submissions(*)
        `)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch speakers
  const { data: speakers, isLoading: loadingSpeakers } = useQuery({
    queryKey: ["admin-speakers-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speakers")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Filter exhibitors
  const filteredExhibitors = exhibitors?.filter((exhibitor) => {
    if (exhibitorNameFilter && !exhibitor.name.toLowerCase().includes(exhibitorNameFilter.toLowerCase())) {
      return false;
    }
    if (exhibitorBoothFilter && !exhibitor.booth_number?.toLowerCase().includes(exhibitorBoothFilter.toLowerCase())) {
      return false;
    }
    if (exhibitorCategoryFilter && !exhibitor.category?.toLowerCase().includes(exhibitorCategoryFilter.toLowerCase())) {
      return false;
    }
    if (exhibitorStatusFilter !== "all") {
      if (exhibitorStatusFilter === "active" && !exhibitor.is_active) return false;
      if (exhibitorStatusFilter === "inactive" && exhibitor.is_active) return false;
    }
    if (exhibitorStartDate || exhibitorEndDate) {
      const createdDate = new Date(exhibitor.created_at);
      if (exhibitorStartDate && createdDate < exhibitorStartDate) return false;
      if (exhibitorEndDate) {
        const endOfDay = new Date(exhibitorEndDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (createdDate > endOfDay) return false;
      }
    }
    return true;
  });

  // Filter speakers
  const filteredSpeakers = speakers?.filter((speaker) => {
    if (speakerNameFilter && !speaker.name.toLowerCase().includes(speakerNameFilter.toLowerCase())) {
      return false;
    }
    if (speakerCompanyFilter && !speaker.company?.toLowerCase().includes(speakerCompanyFilter.toLowerCase())) {
      return false;
    }
    if (speakerStartDate || speakerEndDate) {
      const createdDate = new Date(speaker.created_at);
      if (speakerStartDate && createdDate < speakerStartDate) return false;
      if (speakerEndDate) {
        const endOfDay = new Date(speakerEndDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (createdDate > endOfDay) return false;
      }
    }
    return true;
  });

  const exportExhibitorsToExcel = () => {
    if (!filteredExhibitors || filteredExhibitors.length === 0) {
      toast.error("No exhibitors to export");
      return;
    }

    const exportData = filteredExhibitors.map((exhibitor) => {
      const row: Record<string, string | number | boolean> = {};
      
      if (exhibitorFields.name) row['Company Name'] = exhibitor.name;
      if (exhibitorFields.account_number) row['Account Number'] = exhibitor.account_number || '';
      if (exhibitorFields.booth_number) row['Booth Number'] = exhibitor.booth_number || '';
      if (exhibitorFields.category) row['Category'] = exhibitor.category || '';
      if (exhibitorFields.description) row['Description'] = exhibitor.description || '';
      if (exhibitorFields.website) row['Website'] = exhibitor.website || '';
      if (exhibitorFields.logo_url) row['Logo URL'] = exhibitor.logo_url || '';
      if (exhibitorFields.banner_url) row['Banner URL'] = exhibitor.banner_url || '';
      if (exhibitorFields.company_profile) row['Company Profile'] = exhibitor.company_profile || '';
      if (exhibitorFields.short_description) row['Short Description'] = exhibitor.short_description || '';
      if (exhibitorFields.stand_type) row['Stand Type'] = exhibitor.stand_type || '';
      if (exhibitorFields.event_status) row['Event Status'] = exhibitor.event_status || '';
      if (exhibitorFields.showguide_entry) row['Showguide Entry'] = exhibitor.showguide_entry || '';
      if (exhibitorFields.booth_dimensions) {
        row['Booth Length'] = exhibitor.booth_length || '';
        row['Booth Width'] = exhibitor.booth_width || '';
        row['Open Sides'] = exhibitor.open_sides || '';
      }
      if (exhibitorFields.is_active) row['Active'] = exhibitor.is_active ? 'Yes' : 'No';
      if (exhibitorFields.created_at) row['Created At'] = new Date(exhibitor.created_at).toLocaleDateString();
      if (exhibitorFields.updated_at) row['Updated At'] = new Date(exhibitor.updated_at).toLocaleDateString();
      if (exhibitorFields.completion_percentage) {
        const completion = calculateExhibitorCompletionSync(exhibitor as unknown as Record<string, unknown>);
        row['Completion %'] = completion.percentage;
      }
      
      // Add contact info if selected and available
      if (exhibitorFields.contacts && exhibitor.exhibitor_contacts && exhibitor.exhibitor_contacts.length > 0) {
        const contact = exhibitor.exhibitor_contacts[0];
        row['Primary Contact'] = contact.full_name || '';
        row['Contact Email'] = contact.email || '';
        row['Contact Phone'] = contact.telephone || '';
      }
      
      // Add address info if selected and available
      if (exhibitorFields.address && Array.isArray(exhibitor.exhibitor_address) && exhibitor.exhibitor_address.length > 0) {
        const address = exhibitor.exhibitor_address[0];
        row['Address'] = address.street_line_1 || '';
        row['City'] = address.city || '';
        row['Postcode'] = address.postcode || '';
        row['Country'] = address.country || '';
      }
      
      // Add social media if selected and available
      if (exhibitorFields.social_media && Array.isArray(exhibitor.exhibitor_social_media) && exhibitor.exhibitor_social_media.length > 0) {
        const social = exhibitor.exhibitor_social_media[0];
        row['Facebook'] = social.facebook || '';
        row['Instagram'] = social.instagram || '';
        row['LinkedIn'] = social.linkedin || '';
        row['TikTok'] = social.tiktok || '';
        row['YouTube'] = social.youtube || '';
      }
      
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Exhibitors");
    XLSX.writeFile(workbook, `exhibitors-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Exhibitors exported successfully");
  };

  const exportSpeakersToExcel = () => {
    if (!filteredSpeakers || filteredSpeakers.length === 0) {
      toast.error("No speakers to export");
      return;
    }

    const exportData = filteredSpeakers.map((speaker) => {
      const row: Record<string, string | number | boolean> = {};
      
      if (speakerFields.name) row['Name'] = speaker.name;
      if (speakerFields.title) row['Title'] = speaker.title || '';
      if (speakerFields.company) row['Company'] = speaker.company || '';
      if (speakerFields.bio) row['Bio'] = speaker.bio || '';
      if (speakerFields.linkedin_url) row['LinkedIn'] = speaker.linkedin_url || '';
      if (speakerFields.photo_url) row['Photo URL'] = speaker.photo_url || '';
      if (speakerFields.company_logo_url) row['Company Logo URL'] = speaker.company_logo_url || '';
      if (speakerFields.seminar_title) row['Seminar Title'] = speaker.seminar_title || '';
      if (speakerFields.seminar_description) row['Seminar Description'] = speaker.seminar_description || '';
      if (speakerFields.created_at) row['Created At'] = new Date(speaker.created_at).toLocaleDateString();
      if (speakerFields.updated_at) row['Updated At'] = new Date(speaker.updated_at).toLocaleDateString();
      if (speakerFields.completion_percentage) {
        const completion = calculateSpeakerCompletion(speaker as unknown as Record<string, unknown>);
        row['Completion %'] = completion.percentage;
      }
      
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Speakers");
    XLSX.writeFile(workbook, `speakers-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Speakers exported successfully");
  };


  return (
    <>

      <Card>
      <CardHeader>
        <CardTitle>Reporting & Export</CardTitle>
        <CardDescription>Filter and export exhibitor or speaker data</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeReport} onValueChange={(v) => setActiveReport(v as "exhibitors" | "speakers")}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="exhibitors">Exhibitors</TabsTrigger>
            <TabsTrigger value="speakers">Speakers</TabsTrigger>
          </TabsList>

          <TabsContent value="exhibitors" className="space-y-6">
            {/* Filters */}
            <div className="space-y-4">
              <h3 className="font-semibold">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="exhibitor-name">Company Name</Label>
                  <Input
                    id="exhibitor-name"
                    placeholder="Filter by name..."
                    value={exhibitorNameFilter}
                    onChange={(e) => setExhibitorNameFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="exhibitor-booth">Booth Number</Label>
                  <Input
                    id="exhibitor-booth"
                    placeholder="Filter by booth..."
                    value={exhibitorBoothFilter}
                    onChange={(e) => setExhibitorBoothFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="exhibitor-category">Category</Label>
                  <Input
                    id="exhibitor-category"
                    placeholder="Filter by category..."
                    value={exhibitorCategoryFilter}
                    onChange={(e) => setExhibitorCategoryFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="exhibitor-status">Status</Label>
                  <Select value={exhibitorStatusFilter} onValueChange={setExhibitorStatusFilter}>
                    <SelectTrigger id="exhibitor-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Created From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !exhibitorStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {exhibitorStartDate ? format(exhibitorStartDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={exhibitorStartDate}
                        onSelect={setExhibitorStartDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  {exhibitorStartDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-6 px-2 text-xs"
                      onClick={() => setExhibitorStartDate(undefined)}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                <div>
                  <Label>Created To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !exhibitorEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {exhibitorEndDate ? format(exhibitorEndDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={exhibitorEndDate}
                        onSelect={setExhibitorEndDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  {exhibitorEndDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-6 px-2 text-xs"
                      onClick={() => setExhibitorEndDate(undefined)}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Field Selection */}
            <div className="space-y-4">
              <h3 className="font-semibold">Select Fields to Export</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(exhibitorFields).map(([field, checked]) => (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox
                      id={`exhibitor-field-${field}`}
                      checked={checked}
                      onCheckedChange={(checked) => 
                        setExhibitorFields({ ...exhibitorFields, [field]: !!checked })
                      }
                    />
                    <Label htmlFor={`exhibitor-field-${field}`} className="text-sm cursor-pointer">
                      {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allTrue = Object.keys(exhibitorFields).reduce((acc, key) => ({ ...acc, [key]: true }), {});
                    setExhibitorFields(allTrue as typeof exhibitorFields);
                  }}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allFalse = Object.keys(exhibitorFields).reduce((acc, key) => ({ ...acc, [key]: false }), {});
                    setExhibitorFields(allFalse as typeof exhibitorFields);
                  }}
                >
                  Deselect All
                </Button>
              </div>
            </div>

            {/* Export */}
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {loadingExhibitors ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading exhibitors...
                  </span>
                ) : (
                  `${filteredExhibitors?.length || 0} exhibitor(s) match your filters`
                )}
              </p>
              <Button onClick={exportExhibitorsToExcel} disabled={loadingExhibitors || !filteredExhibitors?.length}>
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="speakers" className="space-y-6">
            {/* Filters */}
            <div className="space-y-4">
              <h3 className="font-semibold">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="speaker-name">Speaker Name</Label>
                  <Input
                    id="speaker-name"
                    placeholder="Filter by name..."
                    value={speakerNameFilter}
                    onChange={(e) => setSpeakerNameFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="speaker-company">Company</Label>
                  <Input
                    id="speaker-company"
                    placeholder="Filter by company..."
                    value={speakerCompanyFilter}
                    onChange={(e) => setSpeakerCompanyFilter(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label>Created From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !speakerStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {speakerStartDate ? format(speakerStartDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={speakerStartDate}
                        onSelect={setSpeakerStartDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  {speakerStartDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-6 px-2 text-xs"
                      onClick={() => setSpeakerStartDate(undefined)}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                <div>
                  <Label>Created To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !speakerEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {speakerEndDate ? format(speakerEndDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={speakerEndDate}
                        onSelect={setSpeakerEndDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  {speakerEndDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-6 px-2 text-xs"
                      onClick={() => setSpeakerEndDate(undefined)}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Field Selection */}
            <div className="space-y-4">
              <h3 className="font-semibold">Select Fields to Export</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(speakerFields).map(([field, checked]) => (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox
                      id={`speaker-field-${field}`}
                      checked={checked}
                      onCheckedChange={(checked) => 
                        setSpeakerFields({ ...speakerFields, [field]: !!checked })
                      }
                    />
                    <Label htmlFor={`speaker-field-${field}`} className="text-sm cursor-pointer">
                      {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allTrue = Object.keys(speakerFields).reduce((acc, key) => ({ ...acc, [key]: true }), {});
                    setSpeakerFields(allTrue as typeof speakerFields);
                  }}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allFalse = Object.keys(speakerFields).reduce((acc, key) => ({ ...acc, [key]: false }), {});
                    setSpeakerFields(allFalse as typeof speakerFields);
                  }}
                >
                  Deselect All
                </Button>
              </div>
            </div>

            {/* Export */}
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {loadingSpeakers ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading speakers...
                  </span>
                ) : (
                  `${filteredSpeakers?.length || 0} speaker(s) match your filters`
                )}
              </p>
              <Button onClick={exportSpeakersToExcel} disabled={loadingSpeakers || !filteredSpeakers?.length}>
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    </>
  );
};
