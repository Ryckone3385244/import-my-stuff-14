import { createContext, useContext, ReactNode } from 'react';

interface Speaker {
  id: string;
  name: string;
  bio?: string;
  photo_url?: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  seminar_title?: string;
  seminar_description?: string;
}

interface SpeakerContextType {
  speaker: Speaker | null;
  reloadSpeaker: () => Promise<void>;
}

const SpeakerContext = createContext<SpeakerContextType | undefined>(undefined);

export const useSpeaker = () => {
  const context = useContext(SpeakerContext);
  if (!context) {
    throw new Error('useSpeaker must be used within a SpeakerProvider');
  }
  return context;
};

export const SpeakerProvider = ({ 
  children, 
  value 
}: { 
  children: ReactNode;
  value: SpeakerContextType;
}) => {
  return (
    <SpeakerContext.Provider value={value}>
      {children}
    </SpeakerContext.Provider>
  );
};
