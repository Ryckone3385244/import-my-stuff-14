import { RegisterInterestForm } from '@/components/RegisterInterestForm';

interface Config {
  title?: string;
  description?: string;
  interestType?: string;
}

export const RegisterFormBlock = ({ config }: { config: Config }) => {
  return (
    <RegisterInterestForm
      title={config.title || 'Register Your Interest'}
      description={config.description || 'Fill out the form below to register your interest'}
      interestType={config.interestType || 'general'}
      showCard={true}
    />
  );
};
