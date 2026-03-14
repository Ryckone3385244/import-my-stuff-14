import { MapPin } from "lucide-react";

interface ExhibitorCardProps {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  boothNumber?: string;
  onClick?: () => void;
}

const ExhibitorCard = ({
  id,
  name,
  description,
  logoUrl,
  website,
  boothNumber,
  onClick,
}: ExhibitorCardProps) => {
  return (
    <div onClick={onClick} className="h-full">
        <div className="h-full flex flex-col group cursor-pointer border border-border rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg bg-card">
        <div className="relative aspect-square overflow-hidden bg-card">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${name} logo`}
              className="w-full h-full object-contain p-8 transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
              <span className="text-4xl font-bold text-muted-foreground/30">
                {name.charAt(0)}
              </span>
            </div>
          )}
        </div>
        
        <div className="p-4 space-y-1 flex-grow">
          <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {name}
          </h3>
          {boothNumber && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Booth {boothNumber}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExhibitorCard;
