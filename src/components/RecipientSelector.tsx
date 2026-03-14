import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Search, Calendar, Percent, CheckSquare, XSquare } from "lucide-react";
import { format } from "date-fns";
import { calculateSpeakerCompletion, calculateExhibitorCompletion } from "@/lib/exhibitorCompletionUtils";

interface RecipientSelectorProps {
  recipientType: "exhibitor" | "speaker";
  onSelectionChange: (selectedIds: string[]) => void;
}

type Exhibitor = {
  id: string;
  name: string;
  created_at: string;
  logo_url: string | null;
  website: string | null;
  booth_number: string | null;
  company_profile: string | null;
  short_description: string | null;
  event_status: string | null;
};

type Speaker = {
  id: string;
  name: string;
  created_at: string;
  photo_url: string | null;
  company: string | null;
  company_logo_url: string | null;
  title: string | null;
  bio: string | null;
  linkedin_url: string | null;
  seminar_title: string | null;
  seminar_description: string | null;
  speaker_submissions: Array<{ approval_status: string | null }> | null;
};

export const RecipientSelector = ({ recipientType, onSelectionChange }: RecipientSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [completionFilter, setCompletionFilter] = useState<number>(100);
  const [eventStatusFilter, setEventStatusFilter] = useState<string>("all");

  // Fetch unique event statuses for exhibitors
  const { data: eventStatuses } = useQuery({
    queryKey: ["exhibitor-event-statuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exhibitors")
        .select("event_status")
        .not("event_status", "is", null);
      
      if (error) throw error;
      
      // Extract unique statuses
      const uniqueStatuses = [...new Set(data?.map(e => e.event_status).filter(Boolean))] as string[];
      return uniqueStatuses.sort();
    },
    enabled: recipientType === "exhibitor",
  });

  // Fetch exhibitors or speakers
  const { data: recipients, isLoading } = useQuery<Exhibitor[] | Speaker[]>({
    queryKey: [recipientType === "exhibitor" ? "exhibitors-all" : "speakers-all"],
    queryFn: async (): Promise<Exhibitor[] | Speaker[]> => {
      if (recipientType === "exhibitor") {
        const { data, error } = await supabase
          .from("exhibitors")
          .select("id, name, created_at, logo_url, website, booth_number, company_profile, short_description, event_status")
          .order("name", { ascending: true });
        
        if (error) throw error;
        return data || [];
      } else {
        const { data, error } = await supabase
          .from("speakers")
          .select(`
            id, 
            name, 
            created_at, 
            photo_url, 
            company, 
            company_logo_url,
            title, 
            bio, 
            linkedin_url,
            seminar_title, 
            seminar_description,
            speaker_submissions(approval_status)
          `)
          .order("name", { ascending: true });
        
        if (error) throw error;
        return data || [];
      }
    },
  });

  // State for storing completion percentages
  const [completionMap, setCompletionMap] = useState<Map<string, number>>(new Map());

  // Calculate completion percentages for all recipients
  useEffect(() => {
    const calculateCompletions = async () => {
      if (!recipients) return;

      const map = new Map<string, number>();
      
      if (recipientType === "exhibitor") {
        // Calculate exhibitor completions in parallel
        await Promise.all(
          recipients.map(async (item) => {
            const { percentage } = await calculateExhibitorCompletion(item.id);
            map.set(item.id, percentage);
          })
        );
      } else {
        // Calculate speaker completions synchronously
        recipients.forEach((item) => {
          const { percentage } = calculateSpeakerCompletion(item);
          map.set(item.id, percentage);
        });
      }
      
      setCompletionMap(map);
    };

    calculateCompletions();
  }, [recipients, recipientType]);

  // Filter recipients
  const filteredRecipients = useMemo(() => {
    if (!recipients) return [];
    
    return recipients.filter(item => {
      // Search filter
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Date filter
      const itemDate = new Date(item.created_at);
      const matchesDateFrom = !dateFrom || itemDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || itemDate <= new Date(dateTo);
      
      // Completion filter - use cached completion from map
      const completion = completionMap.get(item.id) || 0;
      const matchesCompletion = completion < completionFilter;
      
      // Event status filter (only for exhibitors)
      const matchesEventStatus = recipientType === "speaker" || 
        eventStatusFilter === "all" || 
        ('event_status' in item && item.event_status === eventStatusFilter);
      
      return matchesSearch && matchesDateFrom && matchesDateTo && matchesCompletion && matchesEventStatus;
    });
  }, [recipients, searchTerm, dateFrom, dateTo, completionFilter, completionMap, eventStatusFilter, recipientType]);

  // Handle select all
  const handleSelectAll = () => {
    const allIds = new Set(filteredRecipients.map(r => r.id));
    setSelectedIds(allIds);
  };

  // Handle deselect all
  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Handle individual selection
  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange(Array.from(selectedIds));
  }, [selectedIds, onSelectionChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Recipients</CardTitle>
        <CardDescription>
          Choose {recipientType === "exhibitor" ? "exhibitors" : "speakers"} to send emails to
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${recipientType === "exhibitor" ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search by Name
            </Label>
            <Input
              id="search"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Date From */}
          <div className="space-y-2">
            <Label htmlFor="dateFrom" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Created From
            </Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <Label htmlFor="dateTo" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Created To
            </Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {/* Completion Filter */}
          <div className="space-y-2">
            <Label htmlFor="completion" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Max Completion
            </Label>
            <Select value={completionFilter.toString()} onValueChange={(v) => setCompletionFilter(Number(v))}>
              <SelectTrigger id="completion">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">Less than 25%</SelectItem>
                <SelectItem value="50">Less than 50%</SelectItem>
                <SelectItem value="75">Less than 75%</SelectItem>
                <SelectItem value="100">All (100%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Event Status Filter (Exhibitors only) */}
          {recipientType === "exhibitor" && (
            <div className="space-y-2">
              <Label htmlFor="eventStatus" className="flex items-center gap-2 h-5">
                Event Status
              </Label>
              <Select value={eventStatusFilter} onValueChange={setEventStatusFilter}>
                <SelectTrigger id="eventStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {eventStatuses?.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Selection Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            <CheckSquare className="h-4 w-4 mr-2" />
            Select All ({filteredRecipients.length})
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeselectAll}>
            <XSquare className="h-4 w-4 mr-2" />
            Deselect All
          </Button>
          <span className="text-sm text-muted-foreground ml-auto">
            {selectedIds.size} selected
          </span>
        </div>

        {/* Recipients List */}
        <div className="border rounded-lg max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : filteredRecipients.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No {recipientType === "exhibitor" ? "exhibitors" : "speakers"} found
            </div>
          ) : (
            <div className="divide-y">
              {filteredRecipients.map((item) => {
                const completion = completionMap.get(item.id) || 0;
                const isSelected = selectedIds.has(item.id);
                
                return (
                  <div
                    key={item.id}
                    className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleToggleSelect(item.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelect(item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-medium truncate">{item.name}</h4>
                          <div className="flex items-center gap-3 whitespace-nowrap">
                            <span className="text-xs text-muted-foreground">
                              Completion: {completion}%
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(item.created_at), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
