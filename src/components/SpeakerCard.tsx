import { Linkedin } from "lucide-react";

interface SpeakerCardProps {
  id: string;
  name: string;
  bio?: string;
  photoUrl?: string;
  title?: string;
  company?: string;
  companyLogoUrl?: string;
  linkedinUrl?: string;
  onClick?: () => void;
}

const SpeakerCard = ({
  id,
  name,
  bio,
  photoUrl,
  title,
  company,
  companyLogoUrl,
  linkedinUrl,
  onClick,
}: SpeakerCardProps) => {
  return (
    <div onClick={onClick} className="h-full">
      <div className="h-full flex flex-col group cursor-pointer bg-card rounded-lg overflow-hidden transition-all duration-300 border border-border shadow-sm hover:shadow-md">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`${name} photo`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
              <span className="text-4xl font-bold text-muted-foreground/30">
                {name.charAt(0)}
              </span>
            </div>
          )}
          {companyLogoUrl && (
            <div className="absolute bottom-2 right-2 w-[76px] h-[76px] rounded-full border-2 border-border/60 flex items-center justify-center p-2 bg-background shadow-sm overflow-hidden">
              <img
                src={companyLogoUrl}
                alt={`${company} logo`}
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>
        
        <div className="p-4 space-y-1 flex-grow">
          <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {name}
          </h3>
          {title && (
            <p className="text-sm text-muted-foreground line-clamp-1">{title}</p>
          )}
          {company && (
            <p className="text-sm text-muted-foreground line-clamp-1">{company}</p>
          )}
        </div>

        {linkedinUrl && (
          <div className="flex items-center gap-2 px-4 pb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200">
              <Linkedin className="h-3.5 w-3.5" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeakerCard;
