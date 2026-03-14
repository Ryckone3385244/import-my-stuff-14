import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { AlertCircle, ExternalLink, CheckCircle2, Loader2, Copy } from "lucide-react";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription } from "./ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { toast } from "sonner";

export const AdminGoogleDriveSettings = () => {
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [exhibitorFolderId, setExhibitorFolderId] = useState("");
  const [speakerFolderId, setSpeakerFolderId] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showUpdateButton, setShowUpdateButton] = useState(false);

  const handleUpdateSecrets = async () => {
    if (!serviceAccountJson.trim() || !exhibitorFolderId.trim() || !speakerFolderId.trim()) {
      toast.error("Please fill in all three fields");
      return;
    }

    // Validate JSON
    try {
      JSON.parse(serviceAccountJson);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON format for Service Account key';
      toast.error(message);
      return;
    }

    // Store values temporarily for user to copy
    localStorage.setItem('temp_google_drive_json', serviceAccountJson.trim());
    localStorage.setItem('temp_google_drive_exhibitor_folder_id', exhibitorFolderId.trim());
    localStorage.setItem('temp_google_drive_speaker_folder_id', speakerFolderId.trim());

    toast.success("Configuration validated!", {
      description: "Click the 'Update Backend Secrets' button below to save these values securely.",
      duration: 10000,
    });
    
    setShowUpdateButton(true);
  };

  const triggerSecretsUpdate = () => {
    toast.info("Preparing secure form...", {
      description: "You'll need to paste your Service Account JSON and both Folder IDs in the secure form that appears.",
      duration: 8000,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Drive Integration</CardTitle>
        <CardDescription>
          Configure automatic backup of exhibitor submissions to Google Drive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Files are automatically synced to separate Google Drive folders: exhibitor submissions (speaker forms, headshots, adverts) go to the Exhibitor folder, and speaker portal submissions go to the Speaker folder.
          </AlertDescription>
        </Alert>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="instructions">
            <AccordionTrigger className="text-sm font-medium">
              📚 Setup Instructions (Click to expand)
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Step 1: Create Google Cloud Project</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2 text-muted-foreground">
                    <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="h-3 w-3" /></a></li>
                    <li>Create a new project or select an existing one</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Step 2: Enable Google Drive API</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2 text-muted-foreground">
                    <li>In your project, go to "APIs & Services" → "Library"</li>
                    <li>Search for "Google Drive API"</li>
                    <li>Click on it and press "Enable"</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Step 3: Create Service Account</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2 text-muted-foreground">
                    <li>Go to "IAM & Admin" → "Service Accounts"</li>
                    <li>Click "Create Service Account"</li>
                    <li>Give it a name (e.g., "expo-drive-sync")</li>
                    <li>Click "Create and Continue"</li>
                    <li>Skip the optional steps and click "Done"</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Step 4: Generate JSON Key</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2 text-muted-foreground">
                    <li>Find your service account in the list and click on it</li>
                    <li>Go to the "Keys" tab</li>
                    <li>Click "Add Key" → "Create new key"</li>
                    <li>Select "JSON" and click "Create"</li>
                    <li>The JSON file will download automatically - keep it safe!</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Step 5: Create & Share Two Drive Folders</h4>
                  <ol className="list-decimal list-inside space-y-1 ml-2 text-muted-foreground">
                    <li>Create two folders in Google Drive: one for "Exhibitor Submissions" and one for "Speaker Portal Submissions"</li>
                    <li>For each folder, right-click and select "Share"</li>
                    <li>Copy the service account email from the JSON file (looks like: xxx@xxx.iam.gserviceaccount.com)</li>
                    <li>Paste it in the share dialog and give it "Editor" access for both folders</li>
                    <li>Copy both folder IDs from their URLs (the part after /folders/)</li>
                  </ol>
                </div>

                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> The folder ID is the string of characters in your Google Drive URL after "folders/". For example, in https://drive.google.com/drive/folders/<strong>1AbC2DeF3GhI4JkL5MnO6PqR</strong>, the folder ID is "1AbC2DeF3GhI4JkL5MnO6PqR"
                  </AlertDescription>
                </Alert>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="service_account_json">Google Drive Service Account JSON Key</Label>
            <Textarea
              id="service_account_json"
              value={serviceAccountJson}
              onChange={(e) => setServiceAccountJson(e.target.value)}
              placeholder='{"type": "service_account", "project_id": "...", ...}'
              rows={6}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Paste the entire contents of the downloaded JSON key file
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="exhibitor_folder_id">Exhibitor Submissions Folder ID</Label>
            <Input
              id="exhibitor_folder_id"
              value={exhibitorFolderId}
              onChange={(e) => setExhibitorFolderId(e.target.value)}
              placeholder="1AbC2DeF3GhI4JkL5MnO6PqR"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Folder ID for exhibitor submissions (speaker forms, headshots, adverts)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="speaker_folder_id">Speaker Portal Folder ID</Label>
            <Input
              id="speaker_folder_id"
              value={speakerFolderId}
              onChange={(e) => setSpeakerFolderId(e.target.value)}
              placeholder="2XyZ3AbC4DeF5GhI6JkL7MnO"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Folder ID for speaker portal submissions (forms and headshots)
            </p>
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Important:</strong> All three secrets (Service Account JSON + both Folder IDs) work together and should be updated as a set.
              <ol className="list-decimal list-inside mt-2 ml-2 text-xs space-y-1">
                <li>Fill in the Service Account JSON and both Folder IDs below</li>
                <li>Click "Validate & Prepare Update"</li>
                <li>Prompt the AI to update all three secrets together</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button
              onClick={handleUpdateSecrets}
              disabled={updating || !serviceAccountJson.trim() || !exhibitorFolderId.trim() || !speakerFolderId.trim()}
              className="w-full"
              variant="outline"
            >
              {updating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                "Validate & Prepare Update"
              )}
            </Button>

            {showUpdateButton && (
              <Alert className="bg-green-50 border-green-200 space-y-3">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>✓ Validation successful!</strong>
                  <p className="text-sm mt-2 mb-3">
                    Your configuration is ready. <strong>All three secrets below must be updated together</strong> for the integration to work:
                  </p>
                  
                  <div className="space-y-3 text-xs">
                    <div className="bg-white p-3 rounded border border-green-200">
                      <div className="font-semibold mb-1">Secret Name:</div>
                      <code className="text-xs bg-green-100 px-2 py-1 rounded">GOOGLE_DRIVE_EXHIBITOR_FOLDER_ID</code>
                      <div className="flex items-start justify-between gap-2 mt-2">
                        <div className="flex-1">
                          <div className="font-semibold mb-1">Value to copy:</div>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded block break-all">{exhibitorFolderId}</code>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(exhibitorFolderId);
                            toast.success("Exhibitor Folder ID copied!");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded border border-green-200">
                      <div className="font-semibold mb-1">Secret Name:</div>
                      <code className="text-xs bg-green-100 px-2 py-1 rounded">GOOGLE_DRIVE_SPEAKER_FOLDER_ID</code>
                      <div className="flex items-start justify-between gap-2 mt-2">
                        <div className="flex-1">
                          <div className="font-semibold mb-1">Value to copy:</div>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded block break-all">{speakerFolderId}</code>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(speakerFolderId);
                            toast.success("Speaker Folder ID copied!");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded border border-green-200">
                      <div className="font-semibold mb-1">Secret Name:</div>
                      <code className="text-xs bg-green-100 px-2 py-1 rounded">GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON</code>
                      <div className="flex items-start justify-between gap-2 mt-2">
                        <div className="flex-1">
                          <div className="font-semibold mb-1">Value to copy:</div>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded block break-all max-h-24 overflow-auto">{serviceAccountJson}</code>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(serviceAccountJson);
                            toast.success("Service Account JSON copied!");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm mt-3 font-semibold">
                    💡 Prompt the AI assistant: "Update these three secrets" (Service Account JSON + both Folder IDs must be updated together)
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
